// app/page.tsx
// Marketing landing page — the first thing anyone sees when the demo opens.
// Lives outside the (app) route group so it gets its own nav/footer instead
// of the in-app SyncBar + Dashboard nav.

import { TransitionLink } from "@/app/components/TransitionLink";
import { Footer } from "@/app/components/Footer";

const NAV_LINKS = [
  { label: "Dashboard", href: "/incidents" },
  { label: "Incidents", href: "/incidents" },
  { label: "Response Teams", href: "/incidents" },
  { label: "Resources", href: "/incidents" },
];

const STEPS = [
  {
    title: "Report",
    description:
      "Log an incident in seconds — type, location, severity, and what's needed. From any device, online or off.",
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 21V4a1 1 0 0 1 1-1h9l5 5v6" />
        <path d="M14 3v5h5" />
        <path d="M8 13h6M8 17h4" />
        <circle cx="17.5" cy="17.5" r="4.5" />
        <path d="M17.5 15.5v2l1.5 1" />
      </svg>
    ),
  },
  {
    title: "Coordinate",
    description: "Claim it, build a team, assign tasks, and keep everyone talking in one shared thread.",
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="7" r="3" />
        <circle cx="18" cy="7" r="3" />
        <circle cx="12" cy="17" r="3" />
        <path d="M6 10v1a3 3 0 0 0 3 3M18 10v1a3 3 0 0 0-3 3" />
      </svg>
    ),
  },
  {
    title: "Resolve",
    description:
      "Track resource requests through to delivery and close the loop, with a full activity log for every action.",
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12.5 2.5 2.5L16 9" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Nav */}
      <div className="border-b border-gray-800 bg-[var(--bg)]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <TransitionLink href="/" direction="back" className="font-semibold tracking-tight text-[16px] text-gray-100">
            ResQSampark
          </TransitionLink>
          <nav className="hidden md:flex items-center gap-9 text-[14px] font-medium text-gray-500">
            {NAV_LINKS.map((link) => (
              <TransitionLink
                key={link.label}
                href={link.href}
                direction="forward"
                className="link-underline hover:text-gray-100 transition-colors"
              >
                {link.label}
              </TransitionLink>
            ))}
          </nav>
          <TransitionLink
            href="/incidents/new"
            direction="forward"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ink)] hover:opacity-85 active:scale-[0.97] text-white text-[13px] font-semibold px-4 py-2 transition-all"
          >
            Report Incident
          </TransitionLink>
        </div>
      </div>

      {/* Hero */}
      <div className="relative">
        <div className="ambient-field">
          <div className="ambient-blob ambient-blob--a" />
          <div className="ambient-blob ambient-blob--b" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center px-6 pt-24 pb-20">
          <div className="text-[12.5px] font-semibold tracking-[0.09em] uppercase text-gray-500 mb-5">
            Disaster Coordination Network
          </div>
          <h1 className="text-[42px] sm:text-[58px] font-semibold tracking-[-0.02em] leading-[1.08] text-gray-100 text-balance">
            Coordinate relief.
            <br />
            Respond faster.
          </h1>
          <p className="text-[17px] sm:text-[18px] leading-relaxed text-gray-400 max-w-[520px] mx-auto mt-6 mb-9">
            One shared view of every incident, team, and resource request — built to keep working
            even when the network doesn&apos;t.
          </p>
          <div className="flex items-center justify-center gap-5 flex-wrap">
            <TransitionLink
              href="/incidents/new"
              direction="forward"
              className="inline-flex items-center rounded-full bg-[var(--ink)] hover:opacity-85 active:scale-[0.97] text-white text-[14.5px] font-semibold px-6 py-3 transition-all"
            >
              Report an Incident
            </TransitionLink>
            <TransitionLink
              href="/incidents"
              direction="forward"
              className="group inline-flex items-center gap-1 text-[14.5px] font-semibold text-gray-100 hover:opacity-70 active:scale-[0.97] transition-all"
            >
              View live incidents
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-200 ease-out group-hover:translate-x-1"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </TransitionLink>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-3xl mx-auto px-6 pb-28 w-full">
        <h2 className="text-[30px] sm:text-[32px] font-semibold tracking-[-0.01em] text-center text-gray-100 mb-14">
          How it works
        </h2>
        <div className="grid sm:grid-cols-3 gap-12">
          {STEPS.map((step) => (
            <div key={step.title} className="group">
              <div className="text-gray-100 transition-transform duration-300 ease-out group-hover:scale-110">
                {step.icon}
              </div>
              <div className="text-[18px] font-semibold mt-5 mb-2.5 tracking-[-0.005em] text-gray-100">
                {step.title}
              </div>
              <p className="text-[14px] leading-relaxed text-gray-500">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
