// app/(app)/layout.tsx
// Shell for every screen of the actual app (dashboard, incident detail, the
// report form): connectivity/sync bar, the in-app nav, and the footer.
// Kept out of the marketing landing page at "/" via this route group.

import { SyncBar } from "@/app/components/SyncBar";
import { Nav } from "@/app/components/Nav";
import { Footer } from "@/app/components/Footer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="sticky top-0 z-50" style={{ viewTransitionName: "site-header" }}>
        <SyncBar />
        <Nav />
      </div>
      <main className="flex-1 relative">{children}</main>
      <Footer />
    </>
  );
}
