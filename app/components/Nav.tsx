// app/components/Nav.tsx
// Primary site navigation — brand, dashboard link, and the persistent
// "Report Incident" CTA. Sticks to the top (stacked under SyncBar by the
// layout) so it's always reachable, Apple.com-style.

import { TransitionLink } from "@/app/components/TransitionLink";
import NavigationMenuWithActiveItem from "@/components/ui/navigation-menu-05";

export function Nav() {
  return (
    <div className="border-b border-zinc-200/80 bg-white/70 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <TransitionLink
          href="/"
          direction="back"
          className="font-black tracking-tight text-[16px] text-zinc-950"
        >
          ResQSampark
        </TransitionLink>
        <div className="hidden sm:flex items-center">
          <NavigationMenuWithActiveItem />
        </div>
        <TransitionLink
          href="/incidents?report=true"
          id="report-incident-btn"
          direction="forward"
          className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 hover:bg-zinc-800 active:scale-[0.97] text-white text-[13px] font-bold px-4 py-2 transition-all shadow-xs"
        >
          Report Incident
        </TransitionLink>
      </div>
    </div>
  );
}
