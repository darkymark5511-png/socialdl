import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "SocialDL — Media Downloader",
  description:
    "Extract and download public media from TikTok, Instagram, X, Douyin, Xiaohongshu, YouTube Shorts, Facebook, Pinterest.",
  metadataBase: new URL("https://socialdl.vercel.app"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
