import {
  MediaResult,
  MediaMetadata,
  Platform,
  ScraperError,
} from "./types";

type ScraprFn = (url: string) => Promise<unknown>;

type LooseResult = {
  status?: boolean;
  success?: boolean;
  message?: string;
  result?: Record<string, unknown>;
  data?: Record<string, unknown>;
  title?: string;
  author?: string;
  thumbnail?: string;
  duration?: number;
  downloads?: Array<Record<string, unknown>>;
  images?: Array<Record<string, unknown>>;
  videos?: Array<Record<string, unknown>>;
  media?: Array<Record<string, unknown>>;
  url?: string;
  video_url?: string;
  display_url?: string;
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
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("facebook.com") || u.includes("fb.watch") || u.includes("fb.com"))
    return "facebook";
  if (u.includes("pinterest.com") || u.includes("pin.it")) return "pinterest";
  return "unknown";
}

function guessMime(url: string, fallback: string): string {
  const lower = url.toLowerCase();
  if (lower.includes(".mp4") || lower.includes("video") || lower.includes("cdninstagram"))
    return fallback.startsWith("image") ? fallback : "video/mp4";
  if (lower.includes(".webm")) return "video/webm";
  if (lower.includes(".m4a")) return "audio/mp4";
  if (lower.includes(".mp3")) return "audio/mpeg";
  if (lower.includes(".jpg") || lower.includes(".jpeg") || lower.includes("scontent"))
    return "image/jpeg";
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".webp")) return "image/webp";
  return fallback;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function isDirectMediaUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (u.startsWith("blob:")) return false;
  if (u.includes("instagram.com/p/") || u.includes("instagram.com/reel/")) return false;
  return (
    u.includes(".mp4") ||
    u.includes(".m3u8") ||
    u.includes(".jpg") ||
    u.includes(".jpeg") ||
    u.includes(".png") ||
    u.includes(".webp") ||
    u.includes("cdninstagram") ||
    u.includes("fbcdn") ||
    u.includes("rapidcdn") ||
    u.includes("snapxcdn") ||
    u.includes("tiktokcdn") ||
    u.includes("pinimg") ||
    u.includes("/v/t") ||
    u.includes("token=")
  );
}

function collectUrls(node: unknown, out: string[] = [], depth = 0): string[] {
  if (depth > 6 || node == null) return out;
  if (typeof node === "string") {
    if (node.startsWith("http") && isDirectMediaUrl(node)) out.push(node);
    return out;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectUrls(item, out, depth + 1);
    return out;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    for (const key of ["url", "video_url", "display_url", "src", "download_url", "video", "image", "thumbnail"]) {
      const v = obj[key];
      if (typeof v === "string" && v.startsWith("http")) out.push(v);
    }
    for (const v of Object.values(obj)) collectUrls(v, out, depth + 1);
  }
  return out;
}

function normalizeLoose(raw: unknown, platform: Platform, sourceUrl: string): MediaResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as LooseResult;
  const payload =
    (r.result as Record<string, unknown> | undefined) ??
    (r.data as Record<string, unknown> | undefined) ??
    (r as Record<string, unknown>);

  const title = asString(payload.title) ?? asString(payload.description) ?? asString(r.title);
  const author = asString(payload.author) ?? asString(payload.username) ?? asString(r.author);
  const thumbnail = asString(payload.thumbnail) ?? asString(payload.preview) ?? asString(r.thumbnail);
  const duration = asNumber(payload.duration) ?? asNumber(r.duration);

  const downloads = (payload.downloads as Array<Record<string, unknown>> | undefined) ?? r.downloads ?? [];
  const images = (payload.images as Array<Record<string, unknown>> | undefined) ?? r.images ?? [];
  const videos = (payload.videos as Array<Record<string, unknown>> | undefined) ?? r.videos ?? [];
  const media = (payload.media as Array<Record<string, unknown>> | undefined) ?? r.media ?? [];

  const meta: MediaMetadata = {
    title,
    author,
    platform,
    sourceUrl,
    thumbnailUrl: thumbnail,
    durationSec: duration,
    extractedAt: new Date().toISOString(),
  };

  const videoUrls: string[] = [];
  const imageUrls: string[] = [];

  for (const d of downloads) {
    const u = asString(d.url);
    if (!u) continue;
    const type = asString(d.type)?.toLowerCase() ?? "";
    if (type.includes("video") || guessMime(u, "").startsWith("video")) videoUrls.push(u);
    else if (type.includes("image") || guessMime(u, "").startsWith("image")) imageUrls.push(u);
    else if (isDirectMediaUrl(u)) {
      if (guessMime(u, "video/mp4").startsWith("video")) videoUrls.push(u);
      else imageUrls.push(u);
    }
  }
  for (const v of videos) {
    const u = asString(v.url) ?? asString(v.video_url);
    if (u) videoUrls.push(u);
  }
  for (const img of images) {
    const u = asString(img.url) ?? asString(img.display_url);
    if (u) imageUrls.push(u);
  }
  for (const m of media) {
    const u = asString(m.url);
    if (!u) continue;
    const type = asString(m.type)?.toLowerCase() ?? "";
    if (type.includes("video") || guessMime(u, "video/mp4").startsWith("video")) videoUrls.push(u);
    else imageUrls.push(u);
  }

  const topVideo = asString(payload.video_url) ?? asString(r.video_url);
  const topImage = asString(payload.display_url) ?? asString(r.display_url);
  if (topVideo && isDirectMediaUrl(topVideo)) videoUrls.push(topVideo);
  if (topImage && isDirectMediaUrl(topImage)) imageUrls.push(topImage);

  if (videoUrls.length === 0 && imageUrls.length === 0) {
    for (const u of collectUrls(raw)) {
      if (guessMime(u, "video/mp4").startsWith("video")) videoUrls.push(u);
      else if (guessMime(u, "image/jpeg").startsWith("image")) imageUrls.push(u);
      else if (isDirectMediaUrl(u)) videoUrls.push(u);
    }
  }

  const uniq = (arr: string[]) => [...new Set(arr)];
  const vids = uniq(videoUrls).filter(isDirectMediaUrl);
  const imgs = uniq(imageUrls).filter((u) => isDirectMediaUrl(u) || u.startsWith("http"));

  if (imgs.length === 1 && vids.length === 1) {
    return {
      kind: "live_photo",
      metadata: meta,
      image: { url: imgs[0]!, mime: guessMime(imgs[0]!, "image/jpeg") },
      video: { url: vids[0]!, mime: guessMime(vids[0]!, "video/mp4"), durationSec: duration ?? 0 },
    };
  }

  if (imgs.length + vids.length > 1) {
    const items: Array<{ id: string; type: "image" | "video"; url: string; mime: string }> = [];
    imgs.forEach((url, i) => items.push({ id: `img-${i}`, type: "image", url, mime: guessMime(url, "image/jpeg") }));
    vids.forEach((url, i) => items.push({ id: `vid-${i}`, type: "video", url, mime: guessMime(url, "video/mp4") }));
    return { kind: "carousel", metadata: meta, items };
  }

  if (vids.length === 1) {
    return {
      kind: "video",
      metadata: meta,
      file: { url: vids[0]!, mime: guessMime(vids[0]!, "video/mp4") },
    };
  }

  if (imgs.length === 1) {
    return {
      kind: "image",
      metadata: meta,
      file: { url: imgs[0]!, mime: guessMime(imgs[0]!, "image/jpeg") },
    };
  }

  return null;
}

async function tryFns(
  fns: Array<{ name: string; fn: ScraprFn | undefined }>,
  url: string
): Promise<unknown> {
  const errors: string[] = [];
  for (const { name, fn } of fns) {
    if (!fn) continue;
    try {
      const res = await fn(url);
      const normalized = res as LooseResult;
      const ok =
        normalized?.status === true ||
        normalized?.success === true ||
        !!(normalized?.result || normalized?.data || normalized?.downloads || normalized?.media);
      if (ok) return res;
      errors.push(`${name}: ${asString(normalized?.message) ?? "empty"}`);
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(errors.join(" | ") || "All scrapers failed");
}

async function callScrapr(platform: Platform, url: string): Promise<unknown> {
  const scrapr = await import("@coflyn/scrapr");

  switch (platform) {
    case "instagram":
      return tryFns(
        [
          { name: "instagram.direct", fn: scrapr.instagram?.direct },
          { name: "instagram.indown", fn: scrapr.instagram?.indown },
          { name: "instagram.snapsave", fn: scrapr.instagram?.snapsave },
          { name: "instagram.snapinsta", fn: scrapr.instagram?.snapinsta },
        ],
        url
      );
    case "tiktok":
      return tryFns(
        [
          { name: "tiktok.tiktokio", fn: scrapr.tiktok?.tiktokio },
          { name: "tiktok.snaptik", fn: scrapr.tiktok?.snaptik },
          { name: "tiktok.ssstik", fn: scrapr.tiktok?.ssstik },
          { name: "tiktok.savetik", fn: scrapr.tiktok?.savetik },
          { name: "tiktok.tikdownloader", fn: scrapr.tiktok?.tikdownloader },
        ],
        url
      );
    case "x":
      return tryFns(
        [
          { name: "twitter.direct", fn: scrapr.twitter?.direct },
          { name: "twitter.fx", fn: scrapr.twitter?.fx },
        ],
        url
      );
    case "douyin":
      return tryFns([{ name: "douyin.direct", fn: scrapr.douyin?.direct }], url);
    case "xiaohongshu":
      return tryFns(
        [
          { name: "rednote.direct", fn: scrapr.rednote?.direct },
          { name: "rednote.snapsave", fn: scrapr.rednote?.snapsave },
        ],
        url
      );
    case "youtube":
      return tryFns(
        [
          { name: "youtube.direct", fn: scrapr.youtube?.direct },
          { name: "youtube.y2mate", fn: scrapr.youtube?.y2mate },
          { name: "youtube.ytmp3", fn: scrapr.youtube?.ytmp3 },
        ],
        url
      );
    case "facebook":
      return tryFns(
        [
          { name: "facebook.snapsave", fn: scrapr.facebook?.snapsave },
          { name: "facebook.fdown", fn: scrapr.facebook?.fdown },
        ],
        url
      );
    case "pinterest":
      return tryFns(
        [
          { name: "pinterest.direct", fn: scrapr.pinterest?.direct },
          { name: "pinterest.pindown", fn: scrapr.pinterest?.pindown },
        ],
        url
      );
    default:
      throw new ScraperError("Unsupported platform", "UNSUPPORTED_PLATFORM");
  }
}

export async function extractMedia(url: string): Promise<MediaResult> {
  const platform = detectPlatform(url);
  if (platform === "unknown") {
    throw new ScraperError("URL does not match a supported platform", "UNSUPPORTED_PLATFORM");
  }

  let raw: unknown;
  try {
    raw = await callScrapr(platform, url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/rate.?limit|too many|429/i.test(msg)) {
      throw new ScraperError(
        "Gagal mengekstrak. Pastikan link publik, atau coba lagi 1-2 menit kemudian.",
        "RATE_LIMITED_BY_SOURCE"
      );
    }
    if (/timeout|ETIMEDOUT|ESOCKETTIMEDOUT|5000ms/i.test(msg)) {
      throw new ScraperError(
        "Scraper timeout. Platform terlalu lambat merespons atau memblokir request.",
        "UPSTREAM_ERROR"
      );
    }
    if (/private|login|auth/i.test(msg)) throw new ScraperError(msg, "PRIVATE_CONTENT");
    if (/not found|404|deleted/i.test(msg)) throw new ScraperError(msg, "NOT_FOUND");
    throw new ScraperError(
      "Gagal mengekstrak. Pastikan link publik, atau coba lagi 1-2 menit kemudian.",
      "UPSTREAM_ERROR"
    );
  }

  const normalized = normalizeLoose(raw, platform, url);
  if (!normalized) {
    throw new ScraperError(
      "Gagal mengekstrak. Pastikan link publik, atau coba lagi 1-2 menit kemudian.",
      "PARSE_ERROR"
    );
  }

  normalized.metadata = {
    ...normalized.metadata,
    platform,
    sourceUrl: url,
    extractedAt: new Date().toISOString(),
  };
  return normalized;
}

export { detectPlatform };
