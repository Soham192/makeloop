import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { OfflineBanner } from "@/components/offline-banner";
import "./globals.css";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MAKELOOP",
  description: "Build real things, snap a photo, get friendly feedback, and make it better.",
};

export const viewport: Viewport = { themeColor: "#fff8ee", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
