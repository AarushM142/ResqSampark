// app/components/Nav.tsx
// Primary site navigation — brand, dashboard link, and the persistent
// "Report Incident" CTA. Sticks to the top (stacked under SyncBar by the
// layout) so it's always reachable, Apple.com-style.

import { TransitionLink } from "@/app/components/TransitionLink";

export function Nav() {
  return (
    <div className="border-b border-gray-800 bg-[var(--bg)]/80 backdrop-blur-md">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <TransitionLink
          href="/"
          direction="back"
          className="font-semibold tracking-tight text-[15px] text-gray-100"
        >
          ResQSampark
        </TransitionLink>
        <nav className="hidden sm:flex items-center gap-7 text-[13.5px] font-medium text-gray-500">
          <TransitionLink href="/incidents" direction="back" className="link-underline hover:text-gray-100 transition-colors">
            Dashboard
          </TransitionLink>
        </nav>
        <TransitionLink
          href="/incidents?report=true"
          id="report-incident-btn"
          direction="forward"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ink)] hover:opacity-85 active:scale-[0.97] text-[var(--bg)] text-[13px] font-semibold px-4 py-2 transition-all"
        >
          Report Incident
        </TransitionLink>
      </div>
    </div>
  );
}
