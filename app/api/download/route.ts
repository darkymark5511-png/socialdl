import { NextRequest, NextResponse } from "next/server";
import { extractMedia } from "@/lib/scraper/adapter";
import { ScraperError } from "@/lib/scraper/types";
import { downloadSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, pushLog } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SCRAPER_TIMEOUT_MS = 45_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new ScraperError(
          "Scraper timeout. Platform terlalu lambat merespons atau memblokir request.",
          "UPSTREAM_ERROR"
        )
      );
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  const ip = getClientIp(req.headers);

  const limit = await rateLimit(ip);
  if (!limit.success) {
    pushLog({
      ip,
      platform: "unknown",
      kind: "none",
      durationMs: Date.now() - started,
      status: 429,
      path: "/api/download",
    });
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "RATE_LIMITED_BY_SOURCE",
          message: "Too many requests. Slow down.",
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))
          ),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "UNKNOWN", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const parsed = downloadSchema.safeParse(body);
  if (!parsed.success) {
    pushLog({
      ip,
      platform: "unknown",
      kind: "none",
      durationMs: Date.now() - started,
      status: 400,
      path: "/api/download",
    });
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "UNKNOWN",
          message: parsed.error.errors[0]?.message ?? "Validation failed",
        },
      },
      { status: 400 }
    );
  }

  try {
    const media = await withTimeout(
      extractMedia(parsed.data.url),
      SCRAPER_TIMEOUT_MS
    );
    pushLog({
      ip,
      platform: media.metadata.platform,
      kind: media.kind,
      durationMs: Date.now() - started,
      status: 200,
      path: "/api/download",
    });
    return NextResponse.json({ ok: true, data: media });
  } catch (err) {
    let status = 502;
    let code: string = "UPSTREAM_ERROR";
    let message =
      "Gagal mengekstrak. Pastikan link publik, atau coba lagi 1-2 menit kemudian.";

    if (err instanceof ScraperError) {
      code = err.code;
      message = err.message;
      switch (err.code) {
        case "UNSUPPORTED_PLATFORM":
        case "PARSE_ERROR":
          status = 422;
          break;
        case "NOT_FOUND":
          status = 404;
          break;
        case "PRIVATE_CONTENT":
          status = 403;
          break;
        case "RATE_LIMITED_BY_SOURCE":
          status = 429;
          break;
        default:
          status =
            /timeout/i.test(err.message) || /lambat/i.test(err.message)
              ? 504
              : 502;
      }
    } else if (err instanceof Error) {
      if (/timeout/i.test(err.message)) {
        status = 504;
        code = "UPSTREAM_ERROR";
        message =
          "Scraper timeout. Platform terlalu lambat merespons atau memblokir request.";
      } else {
        message = err.message;
      }
    }

    pushLog({
      ip,
      platform: "unknown",
      kind: "none",
      durationMs: Date.now() - started,
      status,
      path: "/api/download",
    });

    const headers: HeadersInit = {};
    if (status === 429) headers["Retry-After"] = "30";

    return NextResponse.json(
      { ok: false, error: { code, message } },
      { status, headers }
    );
  }
}
