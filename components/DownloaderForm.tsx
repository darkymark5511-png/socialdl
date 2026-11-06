"use client";

import { useState, useCallback } from "react";
import { Loader2, Link2, AlertCircle } from "lucide-react";
import type { MediaResult, ScraperErrorCode, Platform } from "@/lib/scraper/types";
import { detectPlatformClient } from "@/components/PlatformBadge";
import { ResultGrid } from "@/components/ResultGrid";
import { RateLimitBanner } from "@/components/RateLimitBanner";

type TabId = Platform | "auto";

const TABS: { id: TabId; label: string; placeholder: string }[] = [
  { id: "auto", label: "Auto", placeholder: "Paste any public media URL…" },
  { id: "instagram", label: "Instagram", placeholder: "Paste Instagram URL…" },
  { id: "tiktok", label: "TikTok", placeholder: "Paste TikTok URL…" },
  { id: "x", label: "X", placeholder: "Paste X / Twitter URL…" },
  { id: "youtube", label: "YouTube", placeholder: "Paste YouTube / Shorts URL…" },
  { id: "facebook", label: "Facebook", placeholder: "Paste Facebook URL…" },
  { id: "douyin", label: "Douyin", placeholder: "Paste Douyin URL…" },
  { id: "xiaohongshu", label: "RedNote", placeholder: "Paste Xiaohongshu URL…" },
  { id: "pinterest", label: "Pinterest", placeholder: "Paste Pinterest URL…" },
];

const ERROR_HINTS: Record<string, string> = {
  UNSUPPORTED_PLATFORM: "Platform not supported for this link.",
  PRIVATE_CONTENT: "Content looks private or needs login.",
  NOT_FOUND: "Media missing or deleted.",
  RATE_LIMITED_BY_SOURCE: "Upstream rate limit. Wait 1–2 minutes.",
  UPSTREAM_ERROR: "Source blocked or timed out. Retry shortly.",
  PARSE_ERROR: "Could not read media from the response.",
  UNKNOWN: "Unexpected error.",
  NETWORK: "Network error.",
};

export function DownloaderForm() {
  const [tab, setTab] = useState<TabId>("auto");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MediaResult | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [retryAfter, setRetryAfter] = useState(0);

  const placeholder =
    TABS.find((t) => t.id === tab)?.placeholder ?? TABS[0]!.placeholder;

  const submit = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    if (tab !== "auto") {
      const detected = detectPlatformClient(trimmed);
      if (detected !== "unknown" && detected !== tab) {
        setError({
          code: "UNSUPPORTED_PLATFORM",
          message: `Link looks like ${detected}, but ${tab} tab is selected.`,
        });
        setResult(null);
        return;
      }
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setRetryAfter(0);

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      const retryHeader = res.headers.get("Retry-After");
      if (retryHeader) {
        const sec = parseInt(retryHeader, 10);
        if (!Number.isNaN(sec) && sec > 0) setRetryAfter(sec);
      }

      const data = (await res.json()) as {
        ok: boolean;
        data?: MediaResult;
        error?: { code: ScraperErrorCode | "UNKNOWN"; message: string };
      };

      if (!res.ok || !data.ok) {
        setError({
          code: data.error?.code ?? "UNKNOWN",
          message: data.error?.message ?? res.statusText,
        });
        return;
      }
      if (data.data) setResult(data.data);
    } catch {
      setError({ code: "NETWORK", message: "Failed to reach server" });
    } finally {
      setLoading(false);
    }
  }, [url, tab]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-2xl sm:p-5">
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={
                  active
                    ? "shrink-0 rounded-full border border-white/30 bg-white/20 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-md"
                    : "shrink-0 rounded-full border border-transparent bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white/80"
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
              placeholder={placeholder}
              disabled={loading || retryAfter > 0}
              aria-label="Media URL"
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white placeholder-white/40 outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/30 disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading || !url.trim() || retryAfter > 0}
            className="inline-flex h-12 min-w-[120px] items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-95 disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Extract
              </>
            ) : (
              "Extract"
            )}
          </button>
        </div>

        {retryAfter > 0 && (
          <div className="mt-4">
            <RateLimitBanner retryAfterSec={retryAfter} onDone={() => setRetryAfter(0)} />
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm text-red-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">{error.message}</p>
              <p className="mt-0.5 text-xs text-red-100/70">
                {ERROR_HINTS[error.code] ?? ERROR_HINTS.UNKNOWN}
              </p>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-2xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      )}

      {result && !loading && <ResultGrid result={result} />}
    </div>
  );
}
