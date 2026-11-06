import { NextRequest, NextResponse } from "next/server";
import { assertSafeUrl } from "@/lib/ssrf-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 200 * 1024 * 1024;

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function refererFor(target: string): string {
  try {
    const u = new URL(target);
    const h = u.hostname.toLowerCase();
    if (
      h.includes("instagram") ||
      h.includes("cdninstagram") ||
      h.includes("fbcdn") ||
      h.includes("fbsbx")
    )
      return "https://www.instagram.com/";
    if (h.includes("tiktok") || h.includes("tiktokcdn") || h.includes("byteoversea"))
      return "https://www.tiktok.com/";
    if (h.includes("pinimg") || h.includes("pinterest"))
      return "https://www.pinterest.com/";
    if (h.includes("twimg") || h.includes("twitter") || h.includes("x.com"))
      return "https://x.com/";
    if (h.includes("ytimg") || h.includes("googlevideo") || h.includes("youtube"))
      return "https://www.youtube.com/";
    if (h.includes("fbcdn") || h.includes("facebook"))
      return "https://www.facebook.com/";
    return `${u.protocol}//${u.host}/`;
  } catch {
    return "https://www.google.com/";
  }
}

function buildHeaders(target: string, mode: "full" | "minimal" | "browser"): HeadersInit {
  const referer = refererFor(target);
  const origin = referer.replace(/\/$/, "");

  if (mode === "minimal") {
    return {
      "User-Agent": CHROME_UA,
      Accept: "*/*",
      Referer: referer,
    };
  }

  if (mode === "browser") {
    return {
      "User-Agent": CHROME_UA,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "identity",
      Referer: referer,
      Origin: origin,
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Upgrade-Insecure-Requests": "1",
    };
  }

  // full — media-oriented
  return {
    "User-Agent": CHROME_UA,
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "identity",
    Referer: referer,
    Origin: origin,
    "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "video",
    "Sec-Fetch-Mode": "no-cors",
    "Sec-Fetch-Site": "cross-site",
  };
}

async function tryFetch(
  target: string,
  mode: "full" | "minimal" | "browser",
  timeoutMs: number
): Promise<Response | null> {
  try {
    const res = await fetch(target, {
      redirect: "follow",
      headers: buildHeaders(target, mode),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.ok && res.body) return res;
    return null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  const filenameParam = req.nextUrl.searchParams.get("filename") ?? "download";

  if (!urlParam) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let target: string;
  try {
    target = decodeURIComponent(urlParam);
  } catch {
    return NextResponse.json({ error: "Bad url encoding" }, { status: 400 });
  }

  try {
    await assertSafeUrl(target);
  } catch {
    return NextResponse.json({ error: "SSRF blocked" }, { status: 400 });
  }

  const filename = filenameParam
    .replace(/[^\w.\- ()\[\]]/g, "_")
    .slice(0, 180);

  // Strategy chain: full media headers → minimal → browser-like
  let upstream =
    (await tryFetch(target, "full", 55_000)) ??
    (await tryFetch(target, "minimal", 40_000)) ??
    (await tryFetch(target, "browser", 35_000));

  if (!upstream) {
    return NextResponse.json(
      {
        error:
          "Upstream blocked (403/timeout). Media host denied the download proxy — open the Direct link instead.",
        code: "UPSTREAM_FORBIDDEN",
        direct: target,
      },
      { status: 403 }
    );
  }

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (!Number.isNaN(size) && size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }
  }

  const contentType =
    upstream.headers.get("content-type") ?? "application/octet-stream";

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      ...(contentLength ? { "Content-Length": contentLength } : {}),
    },
  });
}
