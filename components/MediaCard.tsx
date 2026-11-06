"use client";

import { Download, ExternalLink } from "lucide-react";

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
  return "bin";
}

export type MediaCardItem = {
  id: string;
  type: "image" | "video";
  url: string;
  mime: string;
  title?: string;
};

export function MediaCard({
  item,
  index,
}: {
  item: MediaCardItem;
  index: number;
}) {
  const name = safeName(item.title ?? `item-${index + 1}`, mimeExt(item.mime));
  const href = proxyUrl(item.url, name);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="aspect-square bg-black/40">
        {item.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.title ?? `Media ${index + 1}`}
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <video
            src={item.url}
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        <span className="text-[11px] font-medium uppercase tracking-wide text-white/70">
          {item.type}
        </span>
        <div className="flex items-center gap-1.5">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open direct CDN link"
            className="inline-flex h-8 items-center gap-1 rounded-xl border border-white/20 bg-black/40 px-2.5 text-xs font-medium text-white/90 backdrop-blur hover:bg-white/10"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Direct
          </a>
          <a
            href={href}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#E8FF47] px-3 text-xs font-semibold text-black transition active:scale-95 hover:bg-[#d4eb3a]"
          >
            <Download className="h-3.5 w-3.5" />
            Save
          </a>
        </div>
      </div>
    </div>
  );
}
