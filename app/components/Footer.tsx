// app/components/Footer.tsx
// Site footer — Minimalist premium dark aesthetic

import { TransitionLink } from "./TransitionLink";

const COLUMNS: { title: string; items: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    items: [
      { label: "Dashboard", href: "/incidents" },
      { label: "Incidents", href: "/incidents" },
      { label: "Report Incident", href: "/incidents?report=true" },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Documentation", href: "#" },
      { label: "Offline Mode", href: "#" },
      { label: "Activity Log", href: "#" },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "Emergency Helpline — 112", href: "tel:112" },
      { label: "Contact", href: "#" },
      { label: "System Status", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-[var(--bg)] border-t border-gray-800">
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-8">
        <div className="flex flex-col sm:flex-row justify-between gap-10 pb-10">
          <div className="max-w-[280px]">
            <div className="text-[15px] font-semibold mb-3 tracking-tight text-gray-100">
              ResQSampark
            </div>
            <p className="text-[13px] leading-relaxed text-gray-400">
              Offline-capable disaster coordination for relief workers across Maharashtra.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-14 gap-y-8">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-4 text-gray-500">
                  {col.title}
                </div>
                <div className="flex flex-col gap-3 text-[13px]">
                  {col.items.map((item) => (
                    item.href.startsWith("/") ? (
                      <TransitionLink
                        key={item.label}
                        href={item.href}
                        direction="forward"
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        {item.label}
                      </TransitionLink>
                    ) : (
                      <a
                        key={item.label}
                        href={item.href}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        {item.label}
                      </a>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-6 border-t border-gray-800/60 text-[12px] text-gray-500">
          <span>© 2026 ResQSampark. Built for relief coordination.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-300 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-gray-300 transition-colors">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
