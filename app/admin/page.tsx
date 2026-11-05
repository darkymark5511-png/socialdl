import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLogs, getStats, clearLogs } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  const logs = getLogs();
  const stats = getStats();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin dashboard</h1>
          <p className="text-sm text-zinc-500">
            Signed in as {session.user?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={clearAction}>
            <Button type="submit" variant="outline" size="sm">
              Clear logs
            </Button>
          </form>
          <form action={signOutAction}>
            <Button type="submit" variant="secondary" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total requests</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Success rate</CardDescription>
            <CardTitle className="text-3xl">{stats.successRate}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top platform</CardDescription>
            <CardTitle className="text-3xl capitalize">
              {stats.topPlatform}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Error codes</CardDescription>
            <CardContent className="flex flex-wrap gap-1 p-0 pt-2">
              {Object.keys(stats.errorBreakdown).length === 0 ? (
                <span className="text-sm text-zinc-500">None</span>
              ) : (
                Object.entries(stats.errorBreakdown).map(([code, n]) => (
                  <Badge key={code} variant="destructive">
                    {code}: {n}
                  </Badge>
                ))
              )}
            </CardContent>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request log</CardTitle>
          <CardDescription>
            In-memory ring buffer (max 500). Hashed IP only.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
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
                  <td colSpan={6} className="py-6 text-center text-zinc-500">
                    No requests yet
                  </td>
                </tr>
              )}
              {logs.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-100 dark:border-zinc-900"
                >
                  <td className="py-2 pr-3 font-mono text-xs">
                    {new Date(row.ts).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {row.hashedIp}
                  </td>
                  <td className="py-2 pr-3 capitalize">{row.platform}</td>
                  <td className="py-2 pr-3">{row.kind}</td>
                  <td className="py-2 pr-3">{row.durationMs}</td>
                  <td className="py-2">
                    <Badge
                      variant={
                        row.status >= 400 ? "destructive" : "secondary"
                      }
                    >
                      {row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
