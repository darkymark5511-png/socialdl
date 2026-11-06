"use client";

import type { Platform } from "@/lib/scraper/types";

const LABELS: Record<Platform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  x: "X",
  xiaohongshu: "Xiaohongshu",
  douyin: "Douyin",
  youtube: "YouTube",
  facebook: "Facebook",
  pinterest: "Pinterest",
  unknown: "Unknown",
};

export function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium"
      style={{
        borderColor: "var(--border)",
        background: "var(--elevated)",
        color: "var(--text)",
      }}
    >
      {LABELS[platform]}
    </span>
  );
}

export function detectPlatformClient(url: string): Platform {
  const u = url.toLowerCase();
  if (u.includes("tiktok.com") || u.includes("vt.tiktok") || u.includes("vm.tiktok") || u.includes("tt.site"))
    return "tiktok";
  if (u.includes("instagram.com") || u.includes("instagr.am")) return "instagram";
  if (u.includes("twitter.com") || u.includes("x.com") || u.includes("t.co")) return "x";
  if (u.includes("xiaohongshu.com") || u.includes("xhslink.com") || u.includes("rednote"))
    return "xiaohongshu";
  if (u.includes("douyin.com") || u.includes("iesdouyin")) return "douyin";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("facebook.com") || u.includes("fb.watch") || u.includes("fb.com"))
    return "facebook";
  if (u.includes("pinterest.com") || u.includes("pin.it")) return "pinterest";
  return "unknown";
}
