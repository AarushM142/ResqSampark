"use client";
// app/components/Footer.tsx
// Modern structured multi-column footer for ResQSampark
// Clean typography, emergency helpline, field alerts input, and live system status

import { useState } from "react";
import { TransitionLink } from "./TransitionLink";

type FooterLink = {
  label: string;
  href: string;
  isExternal?: boolean;
};

type FooterColumn = {
  title: string;
  links: FooterLink[];
};

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Coordination",
    links: [
      { label: "Dashboard", href: "/incidents" },
      { label: "Live Incidents", href: "/incidents" },
      { label: "Report Incident", href: "/incidents?report=true" },
      { label: "Response Teams", href: "/incidents" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Supply Requests", href: "/incidents" },
      { label: "Mutual Aid Dispatch", href: "/incidents" },
      { label: "Medical Aid", href: "/incidents" },
      { label: "Logistics Inventory", href: "/incidents" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Offline Mode", href: "/incidents" },
      { label: "Sync Engine", href: "/incidents" },
      { label: "PWA Field Install", href: "/incidents" },
      { label: "Audit Trail", href: "/incidents" },
    ],
  },
  {
    title: "Emergency",
    links: [
      { label: "National Helpline: 112", href: "tel:112", isExternal: true },
      { label: "NDRF Control Room", href: "https://ndrf.gov.in", isExternal: true },
      { label: "Disaster Guidelines", href: "/incidents", isExternal: false },
      { label: "Satellite Relay", href: "/incidents", isExternal: false },
    ],
  },
];

export function Footer({
  className = "border-t border-zinc-200/80 bg-white/70 backdrop-blur-md",
}: {
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setTimeout(() => {
      setEmail("");
      setSubscribed(false);
    }, 4000);
  }

  return (
    <footer className={`${className} transition-colors`}>
      <div className="mx-auto w-full max-w-5xl px-6 pt-10 pb-6">
        {/* Top Grid: Brand & Description + 4 Navigation Columns */}
        <div className="grid gap-8 pb-8 lg:grid-cols-6">
          {/* Left Column: Brand, Tagline, and Alerts Subscription */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 text-zinc-950">
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="12" r="2.5" fill="currentColor" />
              </svg>
              <span className="font-black tracking-tight text-[15px]">
                ResQSampark
              </span>
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-zinc-600 font-medium">
              Offline-first disaster coordination portal for relief agencies and volunteer teams.
              Built to communicate and dispatch even when the grid fails.
            </p>

            {/* Field Alerts Input */}
            <form onSubmit={handleSubscribe} className="mt-5 max-w-xs">
              <label htmlFor="footer-alerts-input" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                Emergency Dispatch Alerts
              </label>
              <div className="flex gap-2">
                <input
                  id="footer-alerts-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="responder@agency.gov"
                  className="h-8.5 w-full rounded-lg border border-zinc-300 bg-white/90 px-3 text-xs text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 shadow-2xs"
                />
                <button
                  type="submit"
                  className="h-8.5 shrink-0 rounded-lg bg-zinc-950 px-3 text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:bg-black active:scale-95 shadow-2xs"
                >
                  {subscribed ? "Enrolled" : "Alerts"}
                </button>
              </div>
              {subscribed && (
                <p className="mt-1.5 text-[11px] text-emerald-600 font-semibold">
                  ✓ Enrolled for priority regional alerts.
                </p>
              )}
            </form>
          </div>

          {/* Right Columns: Structured Navigation */}
          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-4">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-950">
                  {col.title}
                </h3>
                <ul className="mt-3.5 flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.isExternal ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-zinc-600 font-medium hover:text-zinc-950 transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <TransitionLink
                          href={link.href}
                          direction="forward"
                          className="text-xs text-zinc-600 font-medium hover:text-zinc-950 transition-colors"
                        >
                          {link.label}
                        </TransitionLink>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

      </div>
    </footer>
  );
}
