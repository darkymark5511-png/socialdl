import type { NextAuthConfig } from "next-auth";

/** Edge-safe config only. No bcrypt. Used by middleware. */
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
