"use client";

import type { MediaResult } from "@/lib/scraper/types";
import { MediaCard, type MediaCardItem } from "@/components/MediaCard";
import { Archive, Download } from "lucide-react";
import { useState } from "react";

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

function toItems(result: MediaResult): MediaCardItem[] {
  const title = result.metadata.title;
  switch (result.kind) {
    case "video":
      return [{ id: "v0", type: "video", url: result.file.url, mime: result.file.mime, title }];
    case "image":
      return [{ id: "i0", type: "image", url: result.file.url, mime: result.file.mime, title }];
    case "audio":
      return [];
    case "live_photo":
      return [
        { id: "lp-img", type: "image", url: result.image.url, mime: result.image.mime, title: `${title ?? "live"}-still` },
        { id: "lp-vid", type: "video", url: result.video.url, mime: result.video.mime, title: `${title ?? "live"}-motion` },
      ];
    case "carousel":
      return result.items.map((it) => ({
        id: it.id,
        type: it.type,
        url: it.url,
        mime: it.mime,
        title,
      }));
    default:
      return [];
  }
}

export function ResultGrid({ result }: { result: MediaResult }) {
  const [zipping, setZipping] = useState(false);
  const items = toItems(result);
  const title = result.metadata.title ?? "media";

  async function downloadZip() {
    if (items.length < 2) return;
    setZipping(true);
    try {
      const body = {
        items: items.map((item, i) => ({
          url: item.url,
          filename: safeName(`${title}-${i + 1}`, mimeExt(item.mime)),
        })),
      };
      const res = await fetch("/api/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("zip failed");
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="text-xs text-white/50">
            {result.metadata.platform}
            {result.metadata.author ? ` · @${result.metadata.author}` : ""}
            {` · ${result.kind}`}
          </p>
        </div>
        <div className="flex gap-2">
          {items.length === 1 && (
            <a
              href={proxyUrl(items[0]!.url, safeName(title, mimeExt(items[0]!.mime)))}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-95"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          )}
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => void downloadZip()}
              disabled={zipping}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-95 disabled:opacity-50"
            >
              <Archive className="h-4 w-4" />
              {zipping ? "Zipping…" : "Download ZIP"}
            </button>
          )}
        </div>
      </div>

      {result.kind === "audio" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <audio controls className="w-full" src={result.file.url} />
          <a
            href={proxyUrl(result.file.url, safeName(title, mimeExt(result.file.mime)))}
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-black"
          >
            <Download className="h-4 w-4" />
            Download audio
          </a>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item, i) => (
            <MediaCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
