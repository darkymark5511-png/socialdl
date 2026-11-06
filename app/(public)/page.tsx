import { DownloaderForm } from "@/components/DownloaderForm";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-white/50">
          media extractor
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Grab public media.
        </h1>
        <p className="mt-3 max-w-md text-sm text-white/60">
          Instagram, TikTok, X, YouTube Shorts, and more. Pick a platform or
          leave Auto on. Public links only.
        </p>
      </div>
      <DownloaderForm />
    </div>
  );
}
