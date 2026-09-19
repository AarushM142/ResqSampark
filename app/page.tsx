// app/page.tsx
// Marketing landing page — Seamless 3D Spline background with ultra-high contrast typography

import { TransitionLink } from "@/app/components/TransitionLink";
import { Footer } from "@/app/components/Footer";
import { SplineBackground } from "@/app/components/SplineBackground";
import NavigationMenuWithActiveItem from "@/components/ui/navigation-menu-05";

const STEPS = [
  {
    title: "Report",
    description:
      "Log an incident in seconds — type, location, severity, and needed supplies. From any device, online or off.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    description: "Claim it, build a team, assign tasks, and keep everyone communicating in one live shared thread.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      "Track resource requests through delivery and close the loop with an immutable audit log for every action.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12.5 2.5 2.5L16 9" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen flex-1 flex flex-col overflow-x-hidden selection:bg-black selection:text-white">
      {/* Full-Page 3D Spline Interactive Background */}
      <div className="fixed inset-0 z-0 w-full h-full pointer-events-auto">
        <SplineBackground />
      </div>

      {/* Floating Glassmorphic Nav */}
      <header className="relative z-50 border-b border-zinc-200/80 bg-white/70 backdrop-blur-md sticky top-0 shadow-xs">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <TransitionLink href="/" direction="back" className="font-black tracking-tight text-[18px] text-zinc-950">
            ResQSampark
          </TransitionLink>
          <div className="hidden md:flex items-center">
            <NavigationMenuWithActiveItem />
          </div>
          <TransitionLink
            href="/incidents?report=true"
            direction="forward"
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 hover:bg-zinc-800 active:scale-[0.97] text-white text-[13px] font-bold px-4.5 py-2 transition-all shadow-md shadow-black/15"
          >
            Report Incident
          </TransitionLink>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex-1 flex items-center justify-center pt-16 pb-16 sm:pt-24 sm:pb-24 pointer-events-none">
        <div className="max-w-2xl mx-auto text-center px-6 pointer-events-auto">

          {/* High-Contrast Headline */}
          <h1 className="text-[46px] sm:text-[64px] font-black tracking-[-0.035em] leading-[1.05] text-zinc-950 text-balance drop-shadow-sm">
            Coordinate relief.
            <br />
            Respond faster.
          </h1>

          {/* High-Contrast Subtitle */}
          <p className="text-[18px] sm:text-[20px] leading-relaxed text-zinc-800 max-w-[560px] mx-auto mt-6 mb-10 font-semibold drop-shadow-xs">
            One shared view of every incident, team, and resource request — built to keep working
            even when the network doesn&apos;t.
          </p>

          {/* High-Contrast Action Buttons */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <TransitionLink
              href="/incidents?report=true"
              direction="forward"
              className="inline-flex items-center rounded-full bg-zinc-950 hover:bg-black active:scale-[0.97] text-white text-[15px] font-bold px-7 py-3.5 transition-all shadow-xl shadow-black/25 hover:shadow-2xl border border-black"
            >
              Report an Incident
            </TransitionLink>
            <TransitionLink
              href="/incidents"
              direction="forward"
              className="group inline-flex items-center gap-2 text-[15px] font-extrabold text-zinc-950 bg-white hover:bg-zinc-100 active:scale-[0.97] px-6 py-3.5 rounded-full border-2 border-zinc-950/30 hover:border-zinc-950 transition-all shadow-lg hover:shadow-xl"
            >
              View live incidents
              <svg
                width="13"
                height="13"
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
      </section>

      {/* How it works: Premium High-Contrast Frosted Glass Cards */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-8 pb-12 w-full pointer-events-none">
        <h2 className="text-[32px] sm:text-[38px] font-black tracking-tight text-center text-zinc-950 mb-10 drop-shadow-sm">
          How it works
        </h2>
        <div className="grid sm:grid-cols-3 gap-6 pointer-events-auto">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="group rounded-3xl bg-white/95 hover:bg-white backdrop-blur-2xl border-2 border-zinc-200/90 p-7 sm:p-8 shadow-xl shadow-black/5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shadow-md mb-6 group-hover:scale-105 transition-transform">
                  {step.icon}
                </div>
                <div className="text-[22px] font-black tracking-tight text-zinc-950 mb-3">
                  {step.title}
                </div>
                <p className="text-[15px] leading-relaxed text-zinc-700 font-semibold">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer: Compact & Sleek */}
      <Footer className="relative z-10 border-t border-zinc-200/80 bg-white/70 backdrop-blur-md" />
    </div>
  );
}
