import type { Metadata } from "next";
import "./globals.css";
import { SyncBar } from "./components/SyncBar";

export const metadata: Metadata = {
  title: "SahayLink — Disaster Coordination Portal",
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
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-100 font-sans antialiased">
        <SyncBar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
