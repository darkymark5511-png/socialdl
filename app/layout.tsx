import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jb",
});

export const metadata: Metadata = {
  title: "SocialDL",
  description:
    "Extract public media from TikTok, Instagram, X, Douyin, Xiaohongshu, YouTube Shorts, Facebook, Pinterest.",
  metadataBase: new URL("https://socialdl-eight.vercel.app"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${space.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen antialiased"
        style={
          {
            ["--font-body" as string]: "var(--font-inter), system-ui, sans-serif",
            ["--font-display" as string]:
              "var(--font-space), system-ui, sans-serif",
            ["--font-mono" as string]:
              "var(--font-jb), ui-monospace, monospace",
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
