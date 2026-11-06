import { DownloaderForm } from "@/components/DownloaderForm";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <p
          className="mb-2 text-xs font-medium uppercase tracking-[0.18em]"
          style={{ color: "var(--lime)" }}
        >
          media extractor
        </p>
        <h1 className="sd-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Pull the file.
          <br />
          Keep the noise out.
        </h1>
        <p className="mt-3 max-w-md text-sm" style={{ color: "var(--muted)" }}>
          Paste a public post URL. Toggle which platforms you care about in
          settings. Download video, image, audio, live photo, or full carousel.
        </p>
      </div>
      <DownloaderForm />
    </div>
  );
}
