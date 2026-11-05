import { promises as dns } from "node:dns";
import { isIP } from "node:net";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "metadata.google.internal",
  "metadata",
]);

const PRIVATE_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./,
];

function isPrivateIp(ip: string): boolean {
  if (ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) {
    return true;
  }
  return PRIVATE_RANGES.some((re) => re.test(ip));
}

export async function isSafeUrl(inputUrl: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(inputUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (BLOCKED_HOSTS.has(hostname)) {
    return false;
  }

  if (isIP(hostname)) {
    return !isPrivateIp(hostname);
  }

  try {
    const [v4, v6] = await Promise.all([
      dns.resolve4(hostname).catch(() => [] as string[]),
      dns.resolve6(hostname).catch(() => [] as string[]),
    ]);
    const addresses = [...v4, ...v6];
    if (addresses.length === 0) {
      return false;
    }
    for (const addr of addresses) {
      if (isPrivateIp(addr)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function assertSafeUrl(inputUrl: string): Promise<void> {
  const ok = await isSafeUrl(inputUrl);
  if (!ok) {
    throw new Error("SSRF_BLOCKED");
  }
}
