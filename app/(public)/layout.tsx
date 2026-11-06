export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-16 pt-10 sm:px-6">
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: "var(--lime)" }}
            aria-hidden
          />
          <span className="sd-display text-lg font-semibold tracking-tight">
            SocialDL
          </span>
        </div>
        <a href="/admin" className="text-xs" style={{ color: "var(--muted)" }}>
          admin
        </a>
      </header>
      <main className="flex-1">{children}</main>
      <footer
        className="mt-16 border-t pt-6 text-xs"
        style={{ borderColor: "var(--border)", color: "var(--muted)" }}
      >
        Public links only. No accounts stored. Rate limited.
      </footer>
    </div>
  );
}
