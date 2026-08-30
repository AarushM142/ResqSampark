# ResQSampark — SIH 2026 Presentation Script
### Team JamunTech (SIH039) | Total time: ~5.5 minutes | 6 presenters

---

## ⏱️ Flow at a Glance

| # | Segment | Slide | Presenter | Time |
|---|---------|-------|-----------|------|
| 1 | Proposed Solution | Slide 2 (left) | **P1** | 0:00 – 0:50 |
| 2 | How it Solves the Problem + What's Different | Slide 2 (right two panels) | **P2** | 0:50 – 1:40 |
| 3 | Technical Approach | Slide 3 | **P3** | 1:40 – 2:35 |
| 4 | Feasibility + Challenges | Slide 4 (top-left, bottom-left) | **P4** | 2:35 – 3:25 |
| 5 | Viability + Strategies + Impact/Benefits | Slide 4 (right side) + Slide 5 | **P5** | 3:25 – 4:15 |
| 6 | **LIVE DEMO** + Closing Ask | — | **P6** | 4:15 – 5:30 |

Judges skim decks in seconds and get restless past minute 3 — the deck is here to earn credibility fast, but the **demo is what actually keeps them locked in**. That's why P6 gets the longest, latest, and most protected slot. If any earlier segment runs long, trim there — never shrink the demo.

Swap in your actual names for P1–P6 wherever it fits your team.

---

## 🎤 Segment 1 — Proposed Solution (P1)
**Slide 2, left panel** · Target: 45–50 sec

> "Hi, we're Team JamunTech, and this is **ResQSampark** — a coordination platform built for the one moment when disaster response actually breaks down: when the network goes down.
>
> Here's the core idea: instead of an app that just works online or just works offline, ResQSampark runs on **three tiers** — cloud, local Wi-Fi, and LoRa — and it automatically drops down a tier the moment connectivity gets worse, and climbs back up the moment it's available again.
>
> On top of that, every incident gets its own **chat thread and task list** that stays synced across every responder's device, and every resource request — medicine, water, manpower — is tracked through a clear lifecycle: **Pending → Accepted → Delivered**. So at any point, anyone can see exactly what's been asked for and what's actually arrived."

**Delivery tip:** Say the name "ResQSampark" clearly and slowly once — it's the only thing you need judges to remember by name.

---

## 🎤 Segment 2 — How It Solves the Problem + What Makes It Different (P2)
**Slide 2, middle + right panels** · Target: 50 sec

> "Why does this matter? Because the real failure in disaster response isn't lack of effort — it's **duplication and silence**. Multiple teams show up to the same incident while another one nearby gets missed entirely, because nobody's systems are talking to each other.
>
> ResQSampark fixes this with a **timestamped local action log**. Every action a responder takes — even fully offline — gets logged with a device ID and a timestamp. When that device reconnects, the log syncs and **flags conflicts** instead of silently overwriting anyone's work. Nothing gets lost.
>
> What makes this different from other offline-first tools? Two things: first, it's a **graceful three-tier degradation**, not an all-or-nothing offline switch — most apps just go blank when Wi-Fi drops, ours doesn't. Second, we've added a **LoRa emergency beacon**, so even beyond Wi-Fi range, teams can still send out an alert."

---

## 🎤 Segment 3 — Technical Approach (P3)
**Slide 3** · Target: 50–55 sec

> "Let's talk about how this is actually built. On the frontend, we're using **Next.js 16 with TypeScript, React, and Tailwind CSS**. The backend runs on **Next.js API routes**, backed by a **Supabase PostgreSQL** database.
>
> For real-time sync, we use **Supabase Realtime over WebSockets** — that's what lets one team's update show up instantly on every other device. When a device goes offline, data queues locally in **browser storage** with a timestamp, and once connectivity returns, it goes through our **HTTP batch sync endpoint**, which resolves conflicts **server-side, per incident** — so two people can't accidentally overwrite the same resource request.
>
> And critically, this is a **PWA — a Progressive Web App**. That means zero install friction. A field worker just opens a link in their browser, and it works like an app, even offline."

**Delivery tip:** Point at the flowchart on the left while saying "queues locally" and "syncs" — it visually walks the judges through exactly what you're describing.

---

## 🎤 Segment 4 — Feasibility + Challenges (P4)
**Slide 4, left column (both boxes)** · Target: 50 sec

> "Is this actually buildable and usable in the real world? Yes — on all three fronts.
>
> **Technically**, we're using proven, well-documented tools: Next.js, Supabase Realtime, a clean relational schema — nothing exotic.
>
> **Economically**, the entire stack runs on **free-tier infrastructure**, costing under **₹1,000 a year** to operate — that's a non-issue for scaling to district-level deployment.
>
> **Operationally**, since it's a browser-based PWA, there's **zero rollout barrier** — no app store approval, no installs. We can move to a native app later once it's field-validated.
>
> Of course, real deployments have real challenges. **Flaky field signal** — we handle that with a manual offline toggle and auto-queuing on failure. **Simultaneous claims** on the same resource — we use a mutex plus a timestamp-authority engine that auto-resolves and logs the outcome. And **duplicate incident reports** — we auto-link anything reported within a 30-minute window using related incident IDs."

---

## 🎤 Segment 5 — Viability + Strategies + Impact & Benefits (P5)
**Slide 4, right column + Slide 5** · Target: 50–55 sec

> "So where's the market gap? Most existing tools give you **either** chat **or** tracking — never both, and almost never with real offline reliability. That's the gap ResQSampark sits in. And because it's built on a relational schema, it **scales from a single district to multi-state deployment** without re-architecting anything.
>
> Our rollout strategy is deliberately phased: start with a **district-level pilot**, then scale to multi-agency. And we're not trying to replace existing systems — we want to **interoperate with NDMA and NDRF workflows**, with role-based access and SMS/LoRa fallback for dead zones.
>
> Quickly on impact — this means **continuous coordination even during a total network blackout**, it **eliminates duplicated relief efforts**, and it gives headquarters and field workers **one single source of truth**. Bottom line: faster response, less wasted resources, and zero data loss — using phones people already have, at zero hardware cost."

---

## 🎤 Segment 6 — LIVE DEMO + Closing (P6)
**No slide — switch to the live prototype** · Target: 60–75 sec

**Keep the demo tight and visual — this is the moment judges actually remember. Pick 2–3 punchy actions, not a full walkthrough.**

Suggested demo beats (adjust to what's actually working in your build):
1. **(15s)** Show a field worker reporting an incident and requesting a resource — show it hit "Pending."
2. **(20s)** Toggle to offline/airplane mode, create another action — show it queue locally with a timestamp instead of failing.
3. **(20s)** Reconnect — show the real-time sync fire, the resource status flip to "Accepted" or "Delivered," and (if possible) a conflict getting flagged instead of silently dropped.
4. **(10–15s)** Close strong.

**Closing line:**
> "That's ResQSampark — real coordination, real offline resilience, and it's already running. Thank you — happy to take any questions."

**Delivery tip:** Rehearse the demo with the app already on the right screen and pre-loaded — every second spent navigating menus live is a second the judges' attention drifts. If anything might fail live, have a 10-second screen recording ready as backup and say so confidently rather than fumbling.

---

## 🗣️ General Delivery Notes
- **Total budget is 5.5 min — leave 30–45 sec of slack** for a judge interrupting with a question mid-pitch.
- **Hand-offs matter**: each presenter should end with a one-line bridge ("Now let's look at how this is actually built…") so it feels like one voice, not six disconnected reports.
- **Don't read the slide text verbatim** — the notes above already reframe it conversationally; the slide is a visual anchor, not a script.
- Keep energy up through segments 3–4 (the "dry" technical middle) — this is where hackathon attention dips hardest before the demo re-hooks them.
