"use client";

import { useState, useCallback } from "react";
import { Loader2, Link2, AlertCircle } from "lucide-react";
import type { MediaResult, ScraperErrorCode } from "@/lib/scraper/types";
import {
  PlatformBadge,
  detectPlatformClient,
} from "@/components/PlatformBadge";
import { MediaPreview } from "@/components/MediaPreview";
import { RateLimitBanner } from "@/components/RateLimitBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ERROR_HINTS: Record<ScraperErrorCode | "UNKNOWN" | "NETWORK", string> = {
  UNSUPPORTED_PLATFORM: "This platform is not supported yet.",
  PRIVATE_CONTENT: "Content appears private or requires login.",
  NOT_FOUND: "Media not found or has been deleted.",
  RATE_LIMITED_BY_SOURCE: "Upstream rate limit. Wait and retry.",
  UPSTREAM_ERROR: "Upstream scraper failed. Try again later.",
  PARSE_ERROR: "Could not parse media from the response.",
  UNKNOWN: "Unexpected error.",
  NETWORK: "Network error. Check your connection.",
};

export function DownloaderForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MediaResult | null>(null);
  const [error, setError] = useState<{
    code: ScraperErrorCode | "UNKNOWN" | "NETWORK";
    message: string;
  } | null>(null);
  const [retryAfter, setRetryAfter] = useState(0);

  const platform = url.trim() ? detectPlatformClient(url.trim()) : "unknown";

  const submit = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
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
  }, [url]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Social media downloader</CardTitle>
          <CardDescription>
            Paste a public link from TikTok, Instagram, X, Douyin, Xiaohongshu,
            YouTube Shorts, Facebook, or Pinterest.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submit();
                }}
                placeholder="https://www.tiktok.com/@user/video/..."
                className="pl-9"
                disabled={loading || retryAfter > 0}
              />
            </div>
            <div className="flex items-center gap-2">
              {platform !== "unknown" && <PlatformBadge platform={platform} />}
              <Button
                onClick={() => void submit()}
                disabled={loading || !url.trim() || retryAfter > 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting
                  </>
                ) : (
                  "Extract"
                )}
              </Button>
            </div>
          </div>

          {retryAfter > 0 && (
            <RateLimitBanner
              retryAfterSec={retryAfter}
              onDone={() => setRetryAfter(0)}
            />
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">{error.message}</p>
                <p className="mt-0.5 text-xs opacity-80">
                  {ERROR_HINTS[error.code]}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-10 w-40" />
        </div>
      )}

      {result && !loading && <MediaPreview result={result} />}
    </div>
  );
}
