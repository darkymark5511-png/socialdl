import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { verifyVip } from "./vip-store";

const credentialsSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const expectedUser = process.env.ADMIN_USERNAME;
        const hash = process.env.ADMIN_PASSWORD_HASH;

        if (expectedUser && hash && parsed.data.username === expectedUser) {
          const ok = await bcrypt.compare(parsed.data.password, hash);
          if (ok) {
            return {
              id: "admin",
              name: expectedUser,
              email: `${expectedUser}@socialdl.local`,
              role: "admin",
            };
          }
        }

        try {
          const vip = await verifyVip(
            parsed.data.username,
            parsed.data.password
          );
          if (vip) {
            return {
              id: vip.id,
              name: vip.username,
              email: `${vip.username}@vip.socialdl.local`,
              role: "vip",
            };
          }
        } catch {
          // blob unavailable
        }

        return null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.role = (user as { role?: string }).role ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = token.name as string;
        (session.user as { role?: string }).role =
          (token.role as string) ?? "user";
        (session.user as { id?: string }).id = token.sub as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
