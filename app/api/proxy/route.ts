import { NextRequest, NextResponse } from "next/server";
import { assertSafeUrl } from "@/lib/ssrf-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 200 * 1024 * 1024;

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
        "User-Agent":
          "Mozilla/5.0 (compatible; SocialDL/1.0; +https://socialdl.vercel.app)",
        Accept: "*/*",
      },
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Upstream status ${upstream.status}` },
      { status: 502 }
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
