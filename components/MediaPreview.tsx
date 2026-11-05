"use client";

import { useState } from "react";
import {
  Download,
  Image as ImageIcon,
  Film,
  Music,
  Layers,
  Archive,
} from "lucide-react";
import type { MediaResult } from "@/lib/scraper/types";
import { PlatformBadge } from "@/components/PlatformBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function proxyUrl(url: string, filename: string): string {
  const q = new URLSearchParams({ url, filename });
  return `/api/proxy?${q.toString()}`;
}

function safeName(base: string, ext: string): string {
  const clean =
    base.replace(/[^\w\s\-().]/g, "").trim().slice(0, 80) || "media";
  return `${clean}.${ext}`;
}

function mimeExt(mime: string): string {
  if (mime.includes("mp4") || mime.includes("video")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("m4a") || mime.includes("audio")) return "m4a";
  return "bin";
}

const btnClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";
const btnSmClass =
  "inline-flex h-8 items-center justify-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";

export function MediaPreview({ result }: { result: MediaResult }) {
  const [zipping, setZipping] = useState(false);
  const { metadata } = result;
  const title = metadata.title ?? "Untitled";

  async function downloadZip() {
    if (result.kind !== "carousel") return;
    setZipping(true);
    try {
      const items = result.items.map((item, i) => ({
        url: item.url,
        filename: safeName(`${title}-${i + 1}`, mimeExt(item.mime)),
      }));
      const res = await fetch("/api/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("ZIP failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = safeName(title, "zip");
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // silent
    } finally {
      setZipping(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <PlatformBadge platform={metadata.platform} />
        <Badge variant="secondary">{result.kind}</Badge>
        {metadata.author && (
          <span className="text-sm text-zinc-500">@{metadata.author}</span>
        )}
      </div>

      {result.kind === "video" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Film className="h-4 w-4" />
              {title}
            </CardTitle>
            {metadata.durationSec != null && (
              <CardDescription>{metadata.durationSec}s</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <video
              controls
              playsInline
              poster={metadata.thumbnailUrl}
              className="aspect-video w-full rounded-md bg-black"
              src={result.file.url}
            />
          </CardContent>
          <CardFooter>
            <a
              href={proxyUrl(result.file.url, safeName(title, mimeExt(result.file.mime)))}
              className={btnClass}
            >
              <Download className="mr-2 h-4 w-4" />
              Download{result.file.quality ? ` (${result.file.quality})` : ""}
            </a>
          </CardFooter>
        </Card>
      )}

      {result.kind === "image" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-4 w-4" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.file.url}
              alt={title}
              className="max-h-[480px] w-full rounded-md object-contain"
            />
          </CardContent>
          <CardFooter>
            <a
              href={proxyUrl(result.file.url, safeName(title, mimeExt(result.file.mime)))}
              className={btnClass}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </a>
          </CardFooter>
        </Card>
      )}

      {result.kind === "audio" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Music className="h-4 w-4" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex h-16 items-end gap-1 rounded-md bg-zinc-100 px-3 py-2 dark:bg-zinc-900">
              {Array.from({ length: 32 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-zinc-400 dark:bg-zinc-600"
                  style={{ height: `${20 + ((i * 17) % 60)}%` }}
                />
              ))}
            </div>
            <audio controls className="w-full" src={result.file.url} />
          </CardContent>
          <CardFooter>
            <a
              href={proxyUrl(result.file.url, safeName(title, mimeExt(result.file.mime)))}
              className={btnClass}
            >
              <Download className="mr-2 h-4 w-4" />
              Download audio
            </a>
          </CardFooter>
        </Card>
      )}

      {result.kind === "live_photo" && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">
            Live Photo consists of 2 separate files.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Static frame</CardTitle>
              </CardHeader>
              <CardContent>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.image.url}
                  alt="Live photo still"
                  className="max-h-72 w-full rounded-md object-contain"
                />
              </CardContent>
              <CardFooter>
                <a
                  href={proxyUrl(
                    result.image.url,
                    safeName(`${title}-still`, mimeExt(result.image.mime))
                  )}
                  className={btnSmClass}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Image
                </a>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Live motion ({result.video.durationSec}s)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <video
                  controls
                  playsInline
                  className="max-h-72 w-full rounded-md bg-black"
                  src={result.video.url}
                />
              </CardContent>
              <CardFooter>
                <a
                  href={proxyUrl(
                    result.video.url,
                    safeName(`${title}-live`, mimeExt(result.video.mime))
                  )}
                  className={btnSmClass}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Video
                </a>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}

      {result.kind === "carousel" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4" />
              {title}
              <Badge variant="secondary">{result.items.length} items</Badge>
            </CardTitle>
            <Button onClick={downloadZip} disabled={zipping} size="sm">
              <Archive className="mr-2 h-4 w-4" />
              {zipping ? "Zipping…" : "Download all (.ZIP)"}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {result.items.map((item, idx) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {item.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={`Item ${idx + 1}`}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <video
                      src={item.url}
                      className="aspect-square w-full object-cover"
                      muted
                      playsInline
                    />
                  )}
                </CardContent>
                <CardFooter className="justify-between p-2">
                  <Badge variant="outline" className="text-[10px]">
                    {item.type}
                  </Badge>
                  <a
                    href={proxyUrl(
                      item.url,
                      safeName(`${title}-${idx + 1}`, mimeExt(item.mime))
                    )}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
