import { NextRequest, NextResponse } from "next/server";
import { assertSafeUrl } from "@/lib/ssrf-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 200 * 1024 * 1024;

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function refererFor(target: string): string {
  try {
    const u = new URL(target);
    const h = u.hostname.toLowerCase();
    if (h.includes("instagram") || h.includes("cdninstagram") || h.includes("fbcdn"))
      return "https://www.instagram.com/";
    if (h.includes("tiktok") || h.includes("tiktokcdn"))
      return "https://www.tiktok.com/";
    if (h.includes("pinimg") || h.includes("pinterest"))
      return "https://www.pinterest.com/";
    if (h.includes("twimg") || h.includes("twitter") || h.includes("x.com"))
      return "https://x.com/";
    return `${u.protocol}//${u.host}/`;
  } catch {
    return "https://www.google.com/";
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

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      redirect: "follow",
      headers: {
        "User-Agent": CHROME_UA,
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: refererFor(target),
        Origin: refererFor(target).replace(/\/$/, ""),
      },
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    if (upstream.status === 403 || upstream.status === 401) {
      try {
        const retry = await fetch(target, {
          redirect: "follow",
          headers: {
            "User-Agent": CHROME_UA,
            Accept: "*/*",
            Referer: refererFor(target),
          },
          signal: AbortSignal.timeout(45_000),
        });
        if (retry.ok && retry.body) {
          upstream = retry;
        } else {
          return NextResponse.json(
            {
              error: `Upstream blocked (${upstream.status}). Media host denied the download proxy — try opening the direct link.`,
              code: "UPSTREAM_FORBIDDEN",
            },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          {
            error: `Upstream blocked (${upstream.status}). Media host denied the download proxy.`,
            code: "UPSTREAM_FORBIDDEN",
          },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: `Upstream status ${upstream.status}` },
        { status: 502 }
      );
    }
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
