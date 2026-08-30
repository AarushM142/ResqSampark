import type { Metadata } from "next";
import { IBM_Plex_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { PageTransitionProvider } from "@/lib/PageTransitionContext";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

// Used only by the page-transition curtain's wordmark — a deliberate,
// characterful contrast to the app's plain system sans, reserved for that
// one branded moment.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600"],
  style: ["italic"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "ResQSampark — Disaster Coordination Portal",
  description:
    "Offline-capable disaster coordination portal for relief workers. Report, claim, and update disaster incidents with sync-time conflict resolution.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${plexMono.variable} ${fraunces.variable}`}>
      <body className="min-h-full flex flex-col text-gray-100 font-sans antialiased">
        <PageTransitionProvider>{children}</PageTransitionProvider>
      </body>
    </html>
  );
}
