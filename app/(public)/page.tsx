import { DownloaderForm } from "@/components/DownloaderForm";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Download public media
        </h1>
        <p className="mt-2 text-zinc-500">
          TikTok · Instagram · X · Douyin · Xiaohongshu · YouTube Shorts ·
          Facebook · Pinterest
        </p>
      </div>
      <DownloaderForm />
    </div>
  );
}
