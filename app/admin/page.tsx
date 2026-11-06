import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLogs, getStats, clearLogs } from "@/lib/logger";
import { VipManager } from "@/components/VipManager";
import Link from "next/link";

async function clearAction() {
  "use server";
  clearLogs();
}

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/admin/login" });
}

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const role = (session.user as { role?: string }).role;
  if (role !== "admin") {
    redirect("/");
  }

  const logs = getLogs();
  const stats = getStats();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#E8FF47]/60">
              owner
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Admin dashboard
            </h1>
            <p className="text-sm text-white/50">
              Signed in as{" "}
              <span className="text-white/80">{session.user?.name}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="inline-flex h-9 items-center rounded-xl border border-white/10 px-3 text-sm text-white/80 hover:bg-white/5"
            >
              ← App
            </Link>
            <form action={clearAction}>
              <button
                type="submit"
                className="h-9 rounded-xl border border-white/10 px-3 text-sm text-white/80 hover:bg-white/5"
              >
                Clear logs
              </button>
            </form>
            <form action={signOutAction}>
              <button
                type="submit"
                className="h-9 rounded-xl bg-white px-3 text-sm font-semibold text-black hover:bg-white/90"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total requests", value: String(stats.total) },
            { label: "Success rate", value: `${stats.successRate}%` },
            { label: "Top platform", value: stats.topPlatform },
            {
              label: "Error codes",
              value:
                Object.keys(stats.errorBreakdown).length === 0
                  ? "None"
                  : Object.entries(stats.errorBreakdown)
                      .map(([k, v]) => `${k}:${v}`)
                      .join(" "),
            },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
            >
              <p className="text-xs text-white/40">{c.label}</p>
              <p className="mt-1 truncate text-xl font-semibold capitalize">
                {c.value}
              </p>
            </div>
          ))}
        </div>

        {/* VIP block — primary owner tool */}
        <VipManager />

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-white/70">Request log</h2>
            <span className="text-[11px] text-white/30">
              in-memory · last deploy
            </span>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-white/40">
              <tr>
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">IP hash</th>
                <th className="py-2 pr-3">Platform</th>
                <th className="py-2 pr-3">Kind</th>
                <th className="py-2 pr-3">ms</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-white/30">
                    No requests yet
                  </td>
                </tr>
              )}
              {logs.map((row) => (
                <tr key={row.id} className="border-t border-white/10">
                  <td className="py-2 pr-3 font-mono text-xs text-white/50">
                    {new Date(row.ts).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {row.hashedIp}
                  </td>
                  <td className="py-2 pr-3 capitalize">{row.platform}</td>
                  <td className="py-2 pr-3">{row.kind}</td>
                  <td className="py-2 pr-3">{row.durationMs}</td>
                  <td className="py-2">
                    <span
                      className={
                        row.status >= 400
                          ? "text-red-300"
                          : "text-emerald-300"
                      }
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
