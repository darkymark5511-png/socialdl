import {
  MediaResult,
  MediaMetadata,
  Platform,
  ScraperError,
} from "./types";

type ScraprResponse = {
  status: boolean;
  message?: string;
  result?: {
    title?: string;
    author?: string;
    thumbnail?: string;
    duration?: number;
    downloads?: Array<{
      url: string;
      quality?: string;
      type?: string;
      size?: number;
    }>;
    images?: Array<{ url: string; width?: number; height?: number }>;
    videos?: Array<{ url: string; quality?: string; duration?: number }>;
  };
};

function detectPlatform(url: string): Platform {
  const u = url.toLowerCase();
  if (u.includes("tiktok.com") || u.includes("vt.tiktok") || u.includes("vm.tiktok") || u.includes("tt.site"))
    return "tiktok";
  if (u.includes("instagram.com") || u.includes("instagr.am")) return "instagram";
  if (u.includes("twitter.com") || u.includes("x.com") || u.includes("t.co")) return "x";
  if (u.includes("xiaohongshu.com") || u.includes("xhslink.com") || u.includes("rednote"))
    return "xiaohongshu";
  if (u.includes("douyin.com") || u.includes("iesdouyin")) return "douyin";
  if (u.includes("youtube.com") || u.includes("youtu.be") || u.includes("youtube.com/shorts"))
    return "youtube";
  if (u.includes("facebook.com") || u.includes("fb.watch") || u.includes("fb.com"))
    return "facebook";
  if (u.includes("pinterest.com") || u.includes("pin.it")) return "pinterest";
  return "unknown";
}

function guessMime(url: string, fallback: string): string {
  const lower = url.toLowerCase();
  if (lower.includes(".mp4") || lower.includes("video")) return "video/mp4";
  if (lower.includes(".webm")) return "video/webm";
  if (lower.includes(".m4a") || lower.includes("audio")) return "audio/mp4";
  if (lower.includes(".mp3")) return "audio/mpeg";
  if (lower.includes(".jpg") || lower.includes(".jpeg")) return "image/jpeg";
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".webp")) return "image/webp";
  return fallback;
}

function buildMetadata(
  sourceUrl: string,
  platform: Platform,
  result?: ScraprResponse["result"]
): MediaMetadata {
  return {
    title: result?.title,
    author: result?.author,
    platform,
    sourceUrl,
    thumbnailUrl: result?.thumbnail,
    durationSec: result?.duration,
    extractedAt: new Date().toISOString(),
  };
}

function normalizeDownloads(result: NonNullable<ScraprResponse["result"]>): MediaResult | null {
  const downloads = result.downloads ?? [];
  const images = result.images ?? [];
  const videos = result.videos ?? [];

  if (images.length === 1 && videos.length === 1) {
    const img = images[0]!;
    const vid = videos[0]!;
    return {
      kind: "live_photo",
      metadata: buildMetadata("", "unknown", result),
      image: { url: img.url, mime: guessMime(img.url, "image/jpeg") },
      video: {
        url: vid.url,
        mime: guessMime(vid.url, "video/mp4"),
        durationSec: vid.duration ?? result.duration ?? 0,
      },
    };
  }

  if (images.length > 1 || (images.length >= 1 && videos.length >= 1)) {
    const items: Array<{
      id: string;
      type: "image" | "video";
      url: string;
      mime: string;
      width?: number;
      height?: number;
    }> = [];
    images.forEach((img, i) => {
      items.push({
        id: `img-${i}`,
        type: "image",
        url: img.url,
        mime: guessMime(img.url, "image/jpeg"),
        width: img.width,
        height: img.height,
      });
    });
    videos.forEach((vid, i) => {
      items.push({
        id: `vid-${i}`,
        type: "video",
        url: vid.url,
        mime: guessMime(vid.url, "video/mp4"),
      });
    });
    return {
      kind: "carousel",
      metadata: buildMetadata("", "unknown", result),
      items,
    };
  }

  const videoDl = downloads.find(
    (d) =>
      (d.type && d.type.toLowerCase().includes("video")) ||
      guessMime(d.url, "").startsWith("video/")
  );
  if (videoDl || videos.length === 1) {
    const src = videoDl ?? { url: videos[0]!.url, quality: videos[0]!.quality, size: undefined };
    return {
      kind: "video",
      metadata: buildMetadata("", "unknown", result),
      file: {
        url: src.url,
        mime: guessMime(src.url, "video/mp4"),
        quality: src.quality,
        sizeBytes: src.size,
      },
    };
  }

  const audioDl = downloads.find(
    (d) =>
      (d.type && d.type.toLowerCase().includes("audio")) ||
      guessMime(d.url, "").startsWith("audio/")
  );
  if (audioDl) {
    return {
      kind: "audio",
      metadata: buildMetadata("", "unknown", result),
      file: {
        url: audioDl.url,
        mime: guessMime(audioDl.url, "audio/mpeg"),
      },
    };
  }

  if (images.length === 1 || downloads.length === 1) {
    const src = images[0] ?? downloads[0]!;
    return {
      kind: "image",
      metadata: buildMetadata("", "unknown", result),
      file: {
        url: src.url,
        mime: guessMime(src.url, "image/jpeg"),
        width: "width" in src ? src.width : undefined,
        height: "height" in src ? src.height : undefined,
        sizeBytes: "size" in src ? src.size : undefined,
      },
    };
  }

  if (downloads.length > 0) {
    const d = downloads[0]!;
    const mime = guessMime(d.url, "application/octet-stream");
    if (mime.startsWith("video/")) {
      return {
        kind: "video",
        metadata: buildMetadata("", "unknown", result),
        file: { url: d.url, mime, quality: d.quality, sizeBytes: d.size },
      };
    }
    if (mime.startsWith("audio/")) {
      return {
        kind: "audio",
        metadata: buildMetadata("", "unknown", result),
        file: { url: d.url, mime },
      };
    }
    return {
      kind: "image",
      metadata: buildMetadata("", "unknown", result),
      file: { url: d.url, mime, sizeBytes: d.size },
    };
  }

  return null;
}

async function callScrapr(
  platform: Platform,
  url: string
): Promise<ScraprResponse> {
  const scrapr = await import("@coflyn/scrapr");

  try {
    let res: ScraprResponse;

    switch (platform) {
      case "tiktok": {
        const fn =
          scrapr.tiktok?.snaptik ??
          scrapr.tiktok?.tiktokio ??
          scrapr.tiktok?.ssstik;
        if (!fn) throw new ScraperError("TikTok scraper unavailable", "UPSTREAM_ERROR");
        res = (await fn(url)) as ScraprResponse;
        break;
      }
      case "instagram": {
        const fn = scrapr.instagram?.snapsave ?? scrapr.instagram?.direct;
        if (!fn) throw new ScraperError("Instagram scraper unavailable", "UPSTREAM_ERROR");
        res = (await fn(url)) as ScraprResponse;
        break;
      }
      case "x": {
        const fn = scrapr.twitter?.direct ?? scrapr.twitter?.fx;
        if (!fn) throw new ScraperError("X/Twitter scraper unavailable", "UPSTREAM_ERROR");
        res = (await fn(url)) as ScraprResponse;
        break;
      }
      case "douyin": {
        const fn = scrapr.douyin?.direct;
        if (!fn) throw new ScraperError("Douyin scraper unavailable", "UPSTREAM_ERROR");
        res = (await fn(url)) as ScraprResponse;
        break;
      }
      case "xiaohongshu": {
        const fn = scrapr.rednote?.direct ?? scrapr.rednote?.snapsave;
        if (!fn) throw new ScraperError("Xiaohongshu scraper unavailable", "UPSTREAM_ERROR");
        res = (await fn(url)) as ScraprResponse;
        break;
      }
      case "youtube": {
        const fn = scrapr.youtube?.direct ?? scrapr.youtube?.y2mate;
        if (!fn) throw new ScraperError("YouTube scraper unavailable", "UPSTREAM_ERROR");
        res = (await fn(url)) as ScraprResponse;
        break;
      }
      case "facebook": {
        const fn = scrapr.facebook?.snapsave ?? scrapr.facebook?.fdown;
        if (!fn) throw new ScraperError("Facebook scraper unavailable", "UPSTREAM_ERROR");
        res = (await fn(url)) as ScraprResponse;
        break;
      }
      case "pinterest": {
        const fn = scrapr.pinterest?.direct;
        if (!fn) throw new ScraperError("Pinterest scraper unavailable", "UPSTREAM_ERROR");
        res = (await fn(url)) as ScraprResponse;
        break;
      }
      default:
        throw new ScraperError("Unsupported platform", "UNSUPPORTED_PLATFORM");
    }

    return res;
  } catch (err) {
    if (err instanceof ScraperError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (/rate.?limit|too many|429/i.test(msg)) {
      throw new ScraperError(msg, "RATE_LIMITED_BY_SOURCE");
    }
    if (/private|login|auth/i.test(msg)) {
      throw new ScraperError(msg, "PRIVATE_CONTENT");
    }
    if (/not found|404|deleted/i.test(msg)) {
      throw new ScraperError(msg, "NOT_FOUND");
    }
    throw new ScraperError(msg || "Upstream scraper failed", "UPSTREAM_ERROR");
  }
}

export async function extractMedia(url: string): Promise<MediaResult> {
  const platform = detectPlatform(url);
  if (platform === "unknown") {
    throw new ScraperError(
      "URL does not match a supported platform",
      "UNSUPPORTED_PLATFORM"
    );
  }

  const raw = await callScrapr(platform, url);

  if (!raw.status || !raw.result) {
    const msg = raw.message ?? "No media found";
    if (/rate.?limit|429/i.test(msg)) {
      throw new ScraperError(msg, "RATE_LIMITED_BY_SOURCE");
    }
    if (/private|login/i.test(msg)) {
      throw new ScraperError(msg, "PRIVATE_CONTENT");
    }
    if (/not found|404/i.test(msg)) {
      throw new ScraperError(msg, "NOT_FOUND");
    }
    throw new ScraperError(msg, "PARSE_ERROR");
  }

  const normalized = normalizeDownloads(raw.result);
  if (!normalized) {
    throw new ScraperError(
      "Could not parse media payload from upstream",
      "PARSE_ERROR"
    );
  }

  normalized.metadata = {
    ...normalized.metadata,
    platform,
    sourceUrl: url,
    title: normalized.metadata.title ?? raw.result.title,
    author: normalized.metadata.author ?? raw.result.author,
    thumbnailUrl: normalized.metadata.thumbnailUrl ?? raw.result.thumbnail,
    durationSec: normalized.metadata.durationSec ?? raw.result.duration,
    extractedAt: new Date().toISOString(),
  };

  return normalized;
}

export { detectPlatform };
