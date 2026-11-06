"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, UserCheck, UserX, Shield } from "lucide-react";

type VipRow = {
  id: string;
  username: string;
  label?: string;
  createdAt: string;
  createdBy: string;
  active: boolean;
};

export function VipManager() {
  const [accounts, setAccounts] = useState<VipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vip");
      const data = (await res.json()) as {
        ok?: boolean;
        accounts?: VipRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setAccounts(data.accounts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/vip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          label: label || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      setUsername("");
      setPassword("");
      setLabel("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(id: string, active: boolean) {
    await fetch("/api/vip", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this VIP account?")) return;
    await fetch("/api/vip", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, delete: true }),
    });
    await load();
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[#E8FF47]/15 bg-white/5 p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#E8FF47]" />
            <h2 className="text-lg font-semibold text-white">VIP accounts</h2>
          </div>
          <p className="mt-1 text-xs text-white/50">
            Stored in Vercel Blob (private). VIPs sign in at{" "}
            <code className="rounded bg-white/10 px-1 py-0.5 text-[11px]">
              /vip
            </code>{" "}
            with credentials you create here. Active VIPs authenticate via
            NextAuth role=vip.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/40">
          {accounts.length} account{accounts.length === 1 ? "" : "s"}
        </span>
      </div>

      <form
        onSubmit={onCreate}
        className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 sm:grid-cols-4"
      >
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
          required
          minLength={2}
          autoComplete="off"
          className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#E8FF47]/40"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password (min 6)"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#E8FF47]/40"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="label (optional)"
          className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#E8FF47]/40"
        />
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#E8FF47] text-sm font-semibold text-black hover:bg-[#d4eb3a] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add VIP
        </button>
      </form>

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-white/40">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading from Blob…
        </p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-white/40">
          No VIP accounts yet. Create one above — they can log in at /vip.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/80">
            <thead className="text-xs uppercase text-white/40">
              <tr>
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">Label</th>
                <th className="py-2 pr-3">Created</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-t border-white/10">
                  <td className="py-2.5 pr-3 font-medium">{a.username}</td>
                  <td className="py-2.5 pr-3 text-white/50">
                    {a.label ?? "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-white/40">
                    {new Date(a.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={
                        a.active
                          ? "rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300"
                          : "rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/40"
                      }
                    >
                      {a.active ? "active" : "disabled"}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void toggle(a.id, !a.active)}
                        className="rounded-lg border border-white/10 p-1.5 text-white/70 hover:bg-white/10"
                        title={a.active ? "Disable" : "Enable"}
                      >
                        {a.active ? (
                          <UserX className="h-3.5 w-3.5" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(a.id)}
                        className="rounded-lg border border-red-500/20 p-1.5 text-red-300 hover:bg-red-500/10"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
