import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config (no bcrypt / Node-only APIs).
 * Used by middleware. Full providers live in lib/auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: "/admin/login",
  },
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isAdmin = request.nextUrl.pathname.startsWith("/admin");
      const isLogin = request.nextUrl.pathname.startsWith("/admin/login");
      if (isAdmin && !isLogin) {
        return !!auth?.user;
      }
      return true;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
