import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Automated Reviews",
  description: "Review outreach and reputation operations for local businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.10),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_20%),linear-gradient(180deg,_#fafaf7_0%,_#f4f6f2_52%,_#eef2ec_100%)] text-slate-950">
        {children}
      </body>
    </html>
  );
}
