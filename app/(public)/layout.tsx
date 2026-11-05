export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <a href="/" className="text-sm font-semibold tracking-tight">
            SocialDL
          </a>
          <nav className="flex items-center gap-4 text-sm text-zinc-500">
            <a
              href="/admin"
              className="hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              Admin
            </a>
          </nav>
        </div>
      </header>
      <main className="flex-1 px-4 py-10">{children}</main>
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
        socialdl.vercel.app
      </footer>
    </div>
  );
}
