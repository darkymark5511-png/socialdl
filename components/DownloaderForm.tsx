"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2, Link2, AlertCircle, Settings2, ChevronDown } from "lucide-react";
import type { MediaResult, ScraperErrorCode, Platform } from "@/lib/scraper/types";
import { PlatformBadge, detectPlatformClient } from "@/components/PlatformBadge";
import { MediaPreview } from "@/components/MediaPreview";
import { RateLimitBanner } from "@/components/RateLimitBanner";

const ALL_PLATFORMS: { id: Platform; label: string }[] = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "x", label: "X" },
  { id: "douyin", label: "Douyin" },
  { id: "xiaohongshu", label: "Xiaohongshu" },
  { id: "youtube", label: "YouTube" },
  { id: "facebook", label: "Facebook" },
  { id: "pinterest", label: "Pinterest" },
];

const STORAGE_KEY = "socialdl.enabledPlatforms";

const ERROR_HINTS: Record<ScraperErrorCode | "UNKNOWN" | "NETWORK" | "FILTERED", string> = {
  UNSUPPORTED_PLATFORM: "This platform is not supported or disabled in settings.",
  PRIVATE_CONTENT: "Content appears private or requires login.",
  NOT_FOUND: "Media not found or has been deleted.",
  RATE_LIMITED_BY_SOURCE: "Upstream rate limit. Wait and retry.",
  UPSTREAM_ERROR: "Upstream scraper failed. Try again later.",
  PARSE_ERROR: "Could not parse media from the response.",
  UNKNOWN: "Unexpected error.",
  NETWORK: "Network error. Check your connection.",
  FILTERED: "That platform is turned off in settings.",
};

function loadEnabled(): Platform[] {
  if (typeof window === "undefined") return ALL_PLATFORMS.map((p) => p.id);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ALL_PLATFORMS.map((p) => p.id);
    const parsed = JSON.parse(raw) as string[];
    const set = new Set(ALL_PLATFORMS.map((p) => p.id));
    const filtered = parsed.filter((x): x is Platform => set.has(x as Platform));
    return filtered.length ? filtered : ALL_PLATFORMS.map((p) => p.id);
  } catch {
    return ALL_PLATFORMS.map((p) => p.id);
  }
}

export function DownloaderForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MediaResult | null>(null);
  const [error, setError] = useState<{
    code: ScraperErrorCode | "UNKNOWN" | "NETWORK" | "FILTERED";
    message: string;
  } | null>(null);
  const [retryAfter, setRetryAfter] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [enabled, setEnabled] = useState<Platform[]>(ALL_PLATFORMS.map((p) => p.id));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEnabled(loadEnabled());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enabled));
  }, [enabled, hydrated]);

  const platform = url.trim() ? detectPlatformClient(url.trim()) : "unknown";

  function togglePlatform(id: Platform) {
    setEnabled((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((p) => p !== id);
      }
      return [...prev, id];
    });
  }

  function enableAll() {
    setEnabled(ALL_PLATFORMS.map((p) => p.id));
  }

  const submit = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    const detected = detectPlatformClient(trimmed);
    if (detected !== "unknown" && !enabled.includes(detected)) {
      setError({
        code: "FILTERED",
        message: `${detected} is disabled in settings.`,
      });
      setResult(null);
      return;
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
  }, [url, enabled]);

  return (
    <div className="space-y-5">
      <div className="sd-panel p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
            source url
          </p>
          <button
            type="button"
            className="sd-btn-ghost inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-expanded={settingsOpen}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Platforms
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${settingsOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {settingsOpen && (
          <div
            className="mb-4 rounded-[var(--radius)] border p-3"
            style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Only enabled platforms accept links.
              </p>
              <button
                type="button"
                className="text-xs font-medium"
                style={{ color: "var(--lime)" }}
                onClick={enableAll}
              >
                Enable all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map((p) => {
                const on = enabled.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="sd-chip"
                    data-active={on}
                    onClick={() => togglePlatform(p.id)}
                    aria-pressed={on}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Link2
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: "var(--muted)" }}
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
              placeholder="https://www.tiktok.com/@user/video/..."
              className="sd-input"
              disabled={loading || retryAfter > 0}
              aria-label="Media URL"
            />
          </div>
          <div className="flex items-center gap-2">
            {platform !== "unknown" && <PlatformBadge platform={platform} />}
            <button
              type="button"
              className="sd-btn min-w-[120px]"
              onClick={() => void submit()}
              disabled={loading || !url.trim() || retryAfter > 0}
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
        </div>

        {retryAfter > 0 && (
          <div className="mt-4">
            <RateLimitBanner retryAfterSec={retryAfter} onDone={() => setRetryAfter(0)} />
          </div>
        )}

        {error && (
          <div
            className="mt-4 flex items-start gap-3 rounded-[var(--radius)] border px-3 py-3 text-sm"
            style={{
              borderColor: "#5c2a2a",
              background: "#1a1010",
              color: "#ffb4b4",
            }}
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">{error.message}</p>
              <p className="mt-0.5 text-xs opacity-80">{ERROR_HINTS[error.code]}</p>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="sd-panel space-y-3 p-4">
          <div className="h-4 w-28 animate-pulse rounded" style={{ background: "var(--elevated)" }} />
          <div className="aspect-video w-full animate-pulse rounded" style={{ background: "var(--elevated)" }} />
          <div className="h-10 w-36 animate-pulse rounded" style={{ background: "var(--elevated)" }} />
        </div>
      )}

      {result && !loading && <MediaPreview result={result} />}
    </div>
  );
}
