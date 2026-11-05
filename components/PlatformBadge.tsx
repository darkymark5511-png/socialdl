"use client";

import { Badge } from "@/components/ui/badge";
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

const COLORS: Record<Platform, string> = {
  tiktok: "bg-black text-white",
  instagram: "bg-pink-600 text-white",
  x: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
  xiaohongshu: "bg-red-500 text-white",
  douyin: "bg-cyan-600 text-white",
  youtube: "bg-red-600 text-white",
  facebook: "bg-blue-600 text-white",
  pinterest: "bg-red-700 text-white",
  unknown: "bg-zinc-500 text-white",
};

export function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <Badge className={COLORS[platform]} variant="default">
      {LABELS[platform]}
    </Badge>
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
