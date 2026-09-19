# ResQSampark (SahayLink) 🚨

> **Offline-First Zero-Install Disaster Coordination Network & Field Portal**  
> **Smart India Hackathon (SIH 2026) | Problem Statement 1 (PS1)**  
> **Team JamunTech (SIH039)**  
> **Repository:** [https://github.com/AarushM142/ResqSampark](https://github.com/AarushM142/ResqSampark)

[![Next.js](https://img.shields.io/badge/Next.js-15%2B-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%26%20Realtime-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS%20v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Offline%20Ready-5A0FC8?style=flat-square&logo=pwa)](https://web.dev/progressive-web-apps/)

---

## 📌 1. Overview & Problem Statement

During catastrophic disasters (earthquakes, flash floods, industrial hazards, landslides), physical telecom infrastructure—cellular towers, fiber backbones, and power grids—often collapses. This creates an operational void:
- **Zero Visibility:** Field teams operate in silos without real-time situational awareness.
- **Effort Duplication:** Multiple rescue units dispatch scarce supplies (boats, triage kits, blood bags) to the same zone while adjacent critical pockets remain neglected.
- **Lost Demands:** Requests communicated via word-of-mouth or unorganized messaging get dropped.
- **Merge Conflicts & Data Clobbering:** When disconnected units reconnect and submit manual reports, outdated states overwrite live ground truth.

### The ResQSampark Solution
**ResQSampark** is a lightweight, zero-install, offline-first disaster response portal designed to maintain uninterrupted field coordination across erratic connectivity. It leverages a **tri-tier communication model** (Cloud $\rightarrow$ Local Wi-Fi Mesh $\rightarrow$ LoRa/SMS fallback) combined with deterministic, timestamped client queues and Supabase Realtime synchronization.

---

## 🏛️ 2. System Architecture

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER (PWA)                               |
|                                                                                       |
|   +--------------------------+    +--------------------------+    +---------------+   |
|   |   useConnectivity        |    |      Offline Queue       |    | ServiceWorker |   |
|   | (navigator.onLine +      |    |     (localStorage)       |    |   (sw.js)     |   |
|   |  manual offline toggle)  |    | - Monotonic seq_number   |    | - App shell   |   |
|   +------------+-------------+    | - Persistent device ID   |    | - Asset cache |   |
|                |                  +------------+-------------+    +-------+-------+   |
|                v                               ^                          |           |
|        +---------------+                       |                          |           |
|        |  apiOrQueue   |-----[offline]---------+                          |           |
|        +-------+-------+                                                  |           |
|                | [online]                      ^                          |           |
|                v                               | (network drop / timeout) |           |
|      +-------------------+                     |                          |           |
|      | fetch() API Call  |---------------------+                          |           |
+------|-------------------|------------------------------------------------|-----------+
       |                   |                                                |
    HTTP/REST        POST /api/sync                                    Cache Shell
       |                   |                                                |
+------v-------------------v------------------------------------------------v-----------+
|                              NEXT.JS APPLICATION SERVER                               |
|                                                                                       |
|   +-------------------------------------------------------------------------------+   |
|   | Route Handlers (/api/incidents, /api/incidents/[id], /api/sync)               |   |
|   |   - Dynamic rendering with cache-bypassing headers                            |   |
|   |   - Per-Incident In-Process Mutex (serializes concurrent write updates)       |   |
|   |   - Timestamp-Authority Batch Conflict Resolution Engine                      |   |
|   |   - Deduplication Engine (prevents duplicate resource/incident reports)       |   |
|   +---------------------------------------+---------------------------------------+   |
+-------------------------------------------|-------------------------------------------+
                                            |
                          Foreign-Key Embedded Query Resolvers
                                & Realtime WebSockets
                                            |
+-------------------------------------------v-------------------------------------------+
|                         SUPABASE (PostgreSQL Relational DB)                           |
|                                                                                       |
|   Tables:                                                                             |
|   - incidents                  - incident_team_members        - tasks                 |
|   - resource_requests          - activity_logs                - subtasks              |
|   - chat_messages              - task_assignees                                       |
|                                                                                       |
|   Features:                                                                           |
|   - Embedded queries (`INCIDENT_SELECT`) eliminating N+1 roundtrips                   |
|   - Granular postgres_changes WebSocket subscriptions per incident                    |
+---------------------------------------------------------------------------------------+
```

---

## ⚡ 3. Key Capabilities

- 📴 **True Offline-First Mutations:** Responders can create incidents, assign tasks, request equipment, and post chat notes with zero connection. Actions are queued locally with monotonic sequence numbering and device attribution.
- 🔄 **Real-Time WebSocket Sync:** Live two-way updates across all active field devices powered by Supabase Realtime Channels (`postgres_changes`).
- 🛡️ **Deterministic Conflict Resolution:** Server-side timestamp-authority logic prevents data overwrites when multiple devices sync out-of-order batches upon reconnecting.
- 🔒 **Per-Incident Mutex Locking:** Prevents race conditions during simultaneous write requests to the same incident record.
- 🎛️ **Manual Offline Mode Simulation:** Designed for zones with fluttering, unstable connectivity. Responders can manually lock offline mode to prevent browser timeout freezes and batch actions efficiently.
- 📦 **End-to-End Resource Lifecycle:** Complete pipeline (`Pending` $\rightarrow$ `Accepted` $\rightarrow$ `Delivered`) tracking emergency food, water, medical triage, boats, and fuel.
- 🗺️ **Situational Command & Sector Awareness:** Nearby team distance calculation, sector classification, severity triage (`Critical`, `High`, `Medium`, `Low`), and unified activity logs.
- ✨ **Modern Field UI/UX:** High-contrast responsive design, interactive 3D hero visualization (Spline), quick status badges, and accessible Radix navigation menus.
- 📱 **Zero-Install PWA:** Instantly bootable on any smartphone, tablet, or field laptop via QR code or URL, with service worker asset caching.

---

## 🛠️ 4. Tech Stack

| Category | Technology |
|---|---|
| **Framework** | [Next.js 15+](https://nextjs.org/) (App Router, Server Components & Route Handlers) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Frontend UI** | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/) |
| **3D Visualization** | [@splinetool/react-spline](https://spline.design/) |
| **Backend & Database** | [Supabase](https://supabase.com/) (PostgreSQL Relational DB, PostgREST, Realtime WebSockets) |
| **State & Offline Sync** | Custom Single-Chokepoint `apiOrQueue`, LocalStorage Queuing Engine, Web Service Worker |
| **Fallback Messaging** | Multi-tier architecture designed for SMS/Twilio & LoRa mesh integration |

---

## 🗄️ 5. Relational Database Schema

The system uses a normalized PostgreSQL schema on Supabase:

- **`incidents`**: Central incident entity (title, description, severity, status, location, coordinates, created_at, updated_at).
- **`incident_team_members`**: Field responders deployed to an incident (team_name, leader, role, contact, sector).
- **`tasks`**: Actionable assignments linked to an incident (title, priority, status, due_time).
- **`subtasks`**: Granular breakdown of individual tasks (title, is_completed).
- **`task_assignees`**: Personnel assigned to specific tasks.
- **`resource_requests`**: Supply requests (item_name, category, quantity, unit, urgency, status).
- **`chat_messages`**: Real-time communication feed per incident (sender_name, message, sent_at).
- **`activity_logs`**: Immutable audit log of field actions (action_type, description, timestamp).

---

## 🚀 6. Getting Started

### Prerequisites
- **Node.js**: v18.18.0 or later (v20+ recommended)
- **npm** / **pnpm** / **yarn**
- A **Supabase** project (free tier works great)

### 1. Clone the Repository
```bash
git clone https://github.com/AarushM142/ResqSampark.git
cd ResqSampark
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file by copying the template:
```bash
cp .env.example .env.local
```

Fill in your project credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional: Spline 3D Scene URL for the Landing Page Hero
NEXT_PUBLIC_SPLINE_SCENE_URL=https://prod.spline.design/YhOWmhUgFSww7Er1/scene.splinecode
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 7. Project Structure

```
disaster-portal/
├── app/
│   ├── (app)/
│   │   └── incidents/
│   │       ├── page.tsx               # Incident listing & triage overview
│   │       └── [id]/page.tsx          # Incident detail, live chat, tasks & resources
│   ├── api/
│   │   ├── incidents/                 # REST handlers for incident CRUD
│   │   └── sync/                      # Offline batch synchronization & conflict resolver
│   ├── components/
│   │   ├── ActivityLog.tsx            # Real-time incident activity stream
│   │   ├── ChatFeed.tsx               # Live tactical chat feed
│   │   ├── CoordinationTab.tsx        # Incident coordination & command center
│   │   ├── Footer.tsx                 # Gradient theme footer
│   │   ├── IncidentCard.tsx           # Incident triage card with status badges
│   │   ├── Nav.tsx                    # Primary responsive navigation bar
│   │   ├── NearbyTeams.tsx            # Team roster & distance calculations
│   │   ├── ReportIncidentModal.tsx    # Incident creation modal
│   │   ├── ResourceRequestForm.tsx    # Supply requisition form
│   │   ├── ResourcesTab.tsx           # Resource lifecycle management
│   │   ├── SplineBackground.tsx       # Interactive 3D hero canvas
│   │   ├── StatusBadge.tsx            # Visual status indicators
│   │   ├── SyncBar.tsx                # Offline indicator & sync control bar
│   │   └── TaskList.tsx               # Tactical task board
│   ├── globals.css                    # Tailwind CSS v4 design tokens
│   ├── layout.tsx                     # Root layout with connectivity providers
│   └── page.tsx                       # Landing page with 3D hero & feature highlights
├── components/
│   └── ui/                            # Reusable Radix & navigation primitives
├── lib/
│   ├── apiOrQueue.ts                  # Mutation chokepoint (online fetch vs. offline queue)
│   ├── deviceId.ts                    # Persistent client device identifier
│   ├── PageTransitionContext.tsx      # Smooth client navigation transitions
│   ├── queue.ts                       # LocalStorage queue serialization & sequencing
│   ├── store.ts                       # Supabase query helpers & embedded selectors
│   ├── sync.ts                        # Synchronization engine & batch dispatcher
│   ├── types.ts                       # TypeScript definitions for incidents & entities
│   ├── useAutoSync.ts                 # Background auto-sync listener
│   ├── useConnectivity.ts             # Dual-mode network & heartbeat detector
│   └── utils.ts                       # Class merging (clsx + twMerge)
├── public/
│   ├── icons/                         # PWA application icons
│   ├── manifest.json                  # PWA web manifest
│   └── sw.js                          # Service Worker for offline shell caching
├── .env.example                       # Environment variable reference
├── components.json                    # Component library configuration
└── ResQSampark_Speaker_Notes_and_Flow.md # Hackathon presentation & demo script
```

---

## 🧪 8. Offline Testing Guide

To test the offline capabilities:
1. **Via UI Toggle (Recommended):** Click the **"Simulate Offline"** switch in the top synchronization bar (`SyncBar`). Notice the UI instantly badges **Offline Mode (Manual)**.
2. **Perform Field Actions:** Create an incident, post a message in the incident chat, add a task, or request medical supplies.
3. **Inspect Local Queue:** Notice the sync badge displays **X pending action(s)** stored safely in `localStorage`.
4. **Reconnect:** Toggle **"Simulate Offline"** off (or reconnect DevTools network). ResQSampark immediately dispatches the queued batch to `/api/sync`, updates the database, and streams the reconciled state across all connected devices in real time.

---

## 👥 9. Team JamunTech (SIH039)

Developed for **Smart India Hackathon 2026** under **Problem Statement 1 (PS1)**.  
For presentation details, speaker assignments, and live demo instructions, refer to [`ResQSampark_Speaker_Notes_and_Flow.md`](./ResQSampark_Speaker_Notes_and_Flow.md).

---

## 📄 10. License

This project is built for open humanitarian and disaster management collaboration. Licensed under the [MIT License](LICENSE).
