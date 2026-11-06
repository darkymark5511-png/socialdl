"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function VipLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl") ?? "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid VIP credentials");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-2xl">
      <h1 className="text-xl font-semibold text-white">VIP login</h1>
      <p className="mt-1 text-sm text-white/50">
        Accounts are issued by the owner.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-white/50" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-white/50" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </div>
  );
}

export default function VipLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <Suspense fallback={<div className="text-white/40">Loading…</div>}>
        <VipLoginForm />
      </Suspense>
    </div>
  );
}
