// app/components/Footer.tsx
// Site footer — reproduces the dark band from the approved redesign
// (brand blurb + Product/Resources/Support columns + legal line).
// Colors are scoped to this component only; the rest of the app stays light.

const FOOTER_BG = "oklch(15% 0.015 120)";
const FOOTER_BEIGE = "oklch(88% 0.04 95)";
const FOOTER_OLIVE = "oklch(74% 0.07 130)";
const FOOTER_MUTED = "oklch(62% 0.05 120)";

const COLUMNS: { title: string; items: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    items: [
      { label: "Dashboard", href: "/incidents" },
      { label: "Incidents", href: "/incidents" },
      { label: "Report Incident", href: "/incidents/new" },
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
    <footer style={{ background: FOOTER_BG }}>
      <div className="max-w-3xl mx-auto px-6 pt-14 pb-8">
        <div className="flex flex-col sm:flex-row justify-between gap-10 pb-10">
          <div className="max-w-[280px]">
            <div className="text-[15px] font-semibold mb-3 tracking-tight" style={{ color: FOOTER_BEIGE }}>
              ResQSampark
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: FOOTER_OLIVE }}>
              Offline-capable disaster coordination for relief workers across Maharashtra.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-14 gap-y-8">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <div
                  className="text-[11.5px] font-semibold uppercase tracking-wider mb-4"
                  style={{ color: FOOTER_MUTED }}
                >
                  {col.title}
                </div>
                <div className="flex flex-col gap-3 text-[13.5px]">
                  {col.items.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      className="hover:opacity-80 transition-opacity"
                      style={{ color: FOOTER_OLIVE }}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-6 text-[12.5px]"
          style={{ borderTop: "1px solid oklch(100% 0 0 / 0.14)", color: FOOTER_MUTED }}
        >
          <span>© 2026 ResQSampark. Built for relief coordination.</span>
          <div className="flex gap-6">
            <a href="#" style={{ color: FOOTER_MUTED }}>
              Privacy
            </a>
            <a href="#" style={{ color: FOOTER_MUTED }}>
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
