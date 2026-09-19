import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { PageTransitionProvider } from "@/lib/PageTransitionContext";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
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
    <html lang="en" className={`h-full ${spaceGrotesk.variable}`}>
      <body className="min-h-full flex flex-col text-gray-100 font-sans antialiased">
        <PageTransitionProvider>{children}</PageTransitionProvider>
      </body>
    </html>
  );
}
