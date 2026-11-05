import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import { PassThrough } from "node:stream";
import { zipSchema } from "@/lib/validation";
import { assertSafeUrl } from "@/lib/ssrf-guard";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const limit = await rateLimit(`zip:${ip}`);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Rate limited" },
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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = zipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  for (const item of parsed.data.items) {
    try {
      await assertSafeUrl(item.url);
    } catch {
      return NextResponse.json(
        { error: `SSRF blocked: ${item.filename}` },
        { status: 400 }
      );
    }
  }

  const pass = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 5 } });
  archive.on("error", () => {
    pass.destroy();
  });
  archive.pipe(pass);

  void (async () => {
    try {
      for (const item of parsed.data.items) {
        const res = await fetch(item.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; SocialDL/1.0; +https://socialdl.vercel.app)",
          },
          signal: AbortSignal.timeout(45_000),
        });
        if (!res.ok || !res.body) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        archive.append(buf, { name: item.filename });
      }
      await archive.finalize();
    } catch {
      archive.abort();
      pass.destroy();
    }
  })();

  const webStream = new ReadableStream({
    start(controller) {
      pass.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      pass.on("end", () => controller.close());
      pass.on("error", (err) => controller.error(err));
    },
    cancel() {
      pass.destroy();
    },
  });

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="socialdl-media.zip"',
      "Cache-Control": "private, no-store",
    },
  });
}
