export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120,120,255,0.18), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(255,255,255,0.06), transparent)",
        }}
      />
      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-16 pt-10 sm:px-6">
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-white" />
            <span className="text-lg font-semibold tracking-tight">SocialDL</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <a href="/vip" className="text-white/40 hover:text-white/70">
              VIP
            </a>
            <a href="/admin" className="text-white/40 hover:text-white/70">
              owner
            </a>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mt-16 border-t border-white/10 pt-6 text-xs text-white/40">
          Public links only. No accounts stored on free tier. Rate limited.
        </footer>
      </div>
    </div>
  );
}
