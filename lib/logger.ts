import { createHash } from "node:crypto";

export interface LogEntry {
  id: string;
  ts: string;
  hashedIp: string;
  platform: string;
  kind: string;
  durationMs: number;
  status: number;
  path: string;
}

const MAX = 500;
const buffer: LogEntry[] = [];

function hashIp(ip: string): string {
  const salt = process.env.LOG_IP_SALT ?? "socialdl-default-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 16);
}

export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0]?.trim() ?? "0.0.0.0";
  }
  return headers.get("x-real-ip") ?? "0.0.0.0";
}

export function pushLog(entry: Omit<LogEntry, "id" | "ts" | "hashedIp"> & { ip: string }): void {
  const record: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    hashedIp: hashIp(entry.ip),
    platform: entry.platform,
    kind: entry.kind,
    durationMs: entry.durationMs,
    status: entry.status,
    path: entry.path,
  };
  buffer.unshift(record);
  if (buffer.length > MAX) {
    buffer.length = MAX;
  }
}

export function getLogs(): LogEntry[] {
  return [...buffer];
}

export function clearLogs(): void {
  buffer.length = 0;
}

export function getStats() {
  const total = buffer.length;
  if (total === 0) {
    return {
      total: 0,
      successRate: 0,
      topPlatform: "—",
      errorBreakdown: {} as Record<string, number>,
    };
  }
  const success = buffer.filter((e) => e.status >= 200 && e.status < 400).length;
  const platformCount: Record<string, number> = {};
  const errorBreakdown: Record<string, number> = {};
  for (const e of buffer) {
    platformCount[e.platform] = (platformCount[e.platform] ?? 0) + 1;
    if (e.status >= 400) {
      const key = String(e.status);
      errorBreakdown[key] = (errorBreakdown[key] ?? 0) + 1;
    }
  }
  const topPlatform =
    Object.entries(platformCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  return {
    total,
    successRate: Math.round((success / total) * 1000) / 10,
    topPlatform,
    errorBreakdown,
  };
}
