export type MediaKind = "video" | "image" | "live_photo" | "carousel" | "audio";

export type Platform =
  | "tiktok"
  | "instagram"
  | "x"
  | "xiaohongshu"
  | "douyin"
  | "youtube"
  | "facebook"
  | "pinterest"
  | "unknown";

export interface MediaMetadata {
  title?: string;
  author?: string;
  authorUrl?: string;
  platform: Platform;
  sourceUrl: string;
  thumbnailUrl?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  extractedAt: string;
}

export type MediaResult =
  | {
      kind: "video";
      metadata: MediaMetadata;
      file: {
        url: string;
        mime: string;
        quality?: string;
        sizeBytes?: number;
      };
    }
  | {
      kind: "image";
      metadata: MediaMetadata;
      file: {
        url: string;
        mime: string;
        width?: number;
        height?: number;
        sizeBytes?: number;
      };
    }
  | {
      kind: "audio";
      metadata: MediaMetadata;
      file: {
        url: string;
        mime: string;
        bitrateKbps?: number;
      };
    }
  | {
      kind: "live_photo";
      metadata: MediaMetadata;
      image: { url: string; mime: string };
      video: { url: string; mime: string; durationSec: number };
    }
  | {
      kind: "carousel";
      metadata: MediaMetadata;
      items: Array<{
        id: string;
        type: "image" | "video";
        url: string;
        mime: string;
        width?: number;
        height?: number;
      }>;
    };

export type ScraperErrorCode =
  | "UNSUPPORTED_PLATFORM"
  | "PRIVATE_CONTENT"
  | "NOT_FOUND"
  | "RATE_LIMITED_BY_SOURCE"
  | "UPSTREAM_ERROR"
  | "PARSE_ERROR";

export class ScraperError extends Error {
  constructor(
    message: string,
    public readonly code: ScraperErrorCode
  ) {
    super(message);
    this.name = "ScraperError";
  }
}
