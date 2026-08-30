# SahayLink — Project Overview
### Smart India Hackathon 2026 | Disaster Coordination Portal

---

## 1. Problem Statement

During large-scale disasters (floods, earthquakes, fires), the single greatest failure point in relief operations is **communication breakdown**. When a disaster strikes, it destroys the very infrastructure needed to coordinate the response:

- Cell towers go down, rendering standard apps unusable
- Relief workers in the field cannot report incidents or receive updates
- Coordination headquarters has no real-time visibility into what is happening on the ground
- Multiple teams unknowingly duplicate each other's efforts (sending supplies to the same location twice, leaving another completely unattended)
- Resource requests get lost or delayed because there is no structured system to track them
- There is no single source of truth for incident status — each team has its own version of events

**The result:** Slower response times, wasted resources, and most critically, preventable loss of life.

---

## 2. Proposed Solution — SahayLink

SahayLink is an **offline-first disaster coordination portal** built specifically for field-condition reliability. It allows relief workers to:

1. **Report incidents** from the field, even without a network connection
2. **Coordinate teams** — claim, join, and manage incident response teams in real time
3. **Communicate** — chat and task management per-incident, synced across all connected devices via WebSockets
4. **Request and track resources** — structured resource request lifecycle (PENDING → ACCEPTED → DELIVERED)
5. **Resolve conflicts automatically** — when multiple workers take actions offline simultaneously, a smart conflict resolution engine reconciles the state on sync

### How It Addresses the Core Problem

| Problem | SahayLink's Solution |
|---|---|
| Network unavailability | Offline queue — all actions stored in `localStorage` and replayed when connection returns |
| Duplicate incident reports | 30-minute time-window duplicate detection with relational linking (`related_incident_ids`) |
| No coordination channel | Per-incident task list + real-time chat feed synced via **Supabase Realtime WebSockets** (bypassing Next.js cache) |
| Lost resource requests | Full resource lifecycle tracking with forward-only status chain |
| Multi-device conflict | Server-side conflict resolution with timestamp-based authority and graceful fallback |
| Volatile signal conditions | Manual "Offline Mode" toggle for deliberate field-condition batching of actions |

---

## 3. Tech Stack

### Frontend
| Layer | Technology | Rationale |
|---|---|---|
| Framework | **Next.js 16 (App Router)** | Full-stack in one project, no separate backend process needed, built-in TypeScript support |
| Language | **TypeScript** | Type safety across API boundaries eliminates an entire class of runtime bugs |
| Styling | **Tailwind CSS** | Utility-first, responsive, dark mode — rapid iteration during hackathon |
| State Management | **React useState / useEffect + Supabase Realtime** | Real-time WebSocket subscriptions combined with direct fetch fallbacks; bypasses Next.js client caching |
| Routing | **Next.js App Router** | File-based routing, React Server Components, async params (dynamic rendering forced for fresh data) |

### Backend (Same Project)
| Layer | Technology | Rationale |
|---|---|---|
| API Routes | **Next.js Route Handlers** (/api/incidents, /api/sync) | Collocated with the frontend — single `npm run dev` |
| Database | **Supabase (PostgreSQL Relational Schema)** | Transitioned from JSONB to a fully relational schema to support advanced duplicate tracking (`related_incident_ids`) and granular real-time subscriptions |
| Client | **@supabase/supabase-js** | Official client, Postgres RLS-compatible |
| Concurrency | **In-process Mutex (per incident ID)** | Prevents race conditions when two requests update the same incident simultaneously |

### Offline Architecture
| Layer | Technology |
|---|---|
| Queue Persistence | Browser localStorage |
| Identity | crypto.randomUUID() stored in localStorage as stable device_id |
| Connectivity Detection | navigator.onLine + online/offline browser events + 1-second polling + manual toggle |
| Sync Transport | HTTP POST to /api/sync with the pending batch + WebSocket streams when online |

---

## 4. Architecture Deep Dive

### System Architecture Diagram

```
Browser (Client)
  useConnectivity.ts (manualOffline + onLine)
    --> React UI (pages, components)
          --> apiOrQueue.ts
                If online: fetch() to API routes / Supabase Realtime Channel (.subscribe())
                If offline: queue.ts (localStorage)
  useAutoSync.ts -- every 30s + SYNC NOW button
    --> runSync() --> POST /api/sync (pending batch)

Next.js API Routes (Server)
  /api/incidents         --> CRUD for incidents (Bypasses Next.js cache via force-dynamic)
  /api/incidents/[id]    --> team, status, tasks, chat
  /api/incidents/[id]/resources  --> resource requests
  /api/sync              --> batch conflict resolution engine
    --> lib/store.ts (Mutex + Supabase)

Supabase (PostgreSQL Relational Schema)
  incidents table
  incident_team_members table
  resource_requests table
  activity_logs table
  tasks & subtasks tables
  chat_messages table
```

### Key Architectural Decisions

**Why a Relational Schema instead of JSONB?**
While JSONB initially allowed for atomic writes, we migrated to a fully relational schema (e.g., `incidents`, `chat_messages`, `tasks`, etc.). This structural upgrade was required to support advanced incident deduplication via `related_incident_ids` and enables granular real-time subscriptions via Supabase WebSockets.

**Why Supabase Realtime WebSockets over Polling?**
Previous polling approaches combined with Next.js client-side caching led to synchronization failures (stale chat and status). By integrating Supabase Realtime Channels (`.subscribe()`) and forcefully bypassing Next.js caching (`force-dynamic`, `no-store`), workers now receive instant, reliable updates across devices while maintaining the queue-based fallback for offline resilience.

**Why a manual offline toggle?**
`navigator.onLine` only checks if the OS has a network interface — a laptop connected to WiFi with no upstream internet still reports `true`. In disaster zones where signals "flutter" (intermittently present), auto-syncing causes timeouts and UI stutter. The manual toggle lets workers deliberately batch actions and push them only on a stable connection. Every API call also falls back to the queue on a failed fetch, providing a second safety net.

**Why a Mutex lock on `updateIncident`?**
With Supabase, every write is an async round-trip. Without locking, two requests updating the same incident simultaneously read the same stale version and each overwrite the other's changes. The per-incident Mutex serializes writes, preventing silent data loss.

---

## 5. Feature Set

### Core Features (Implemented)
| Feature | Description |
|---|---|
| **Incident Reporting** | Create incidents with type, location, severity (auto-suggested from affected count), description |
| **Severity Auto-Suggestion** | less than 20 = LOW, 20-74 = MODERATE, 75+ = CRITICAL — reporter can override |
| **Incident Dashboard** | Sorted list (CRITICAL first, then by last_updated) with live status badges |
| **Team Claiming** | First worker to click "Claim Incident" becomes team leader; status moves to RECRUITING |
| **Team Joining / Leaving** | Workers can join during RECRUITING, leave at any time; auto-promotes next member as leader |
| **Status Chain** | UNASSIGNED to RECRUITING to IN_PROGRESS to RESOLVED (forward only, enforced server-side) |
| **Resource Requests** | Structured requests (food/water/medicine/medical team/shelter/transport) with full lifecycle tracking |
| **Task Management** | Per-incident task list with subtask checklists, assignees, and status tracking |
| **Team Chat** | Real-time per-incident chat feed via WebSockets with optimistic message sending |
| **Activity Log** | Full audit trail of every action on an incident |
| **Soft Deletion** | Incidents marked deleted, not physically removed — preserves team and resource history |
| **Offline Queue** | All write actions queued in localStorage when offline, replayed automatically on reconnect |
| **Auto-Sync & Real-Time** | Offline queue auto-syncs via HTTP; when online, live data streams via WebSocket channels |
| **Duplicate Detection** | Same type + location within 30 minutes flags incidents and links them bi-directionally via `related_incident_ids` in the relational schema |
| **Conflict Resolution** | Server engine resolves CLAIM conflicts (timestamp-based), STATUS conflicts (forward-only), SUBTASK conflicts (timestamp guard) |
| **Unread Indicator** | Red dot on Coordination tab when new chat messages arrive on another device |
| **Resolved Nudge** | Auto-suggests resolving the incident when all tasks are marked DONE |

---

## 6. Innovation and Uniqueness

### 1. Offline-First with Smart Queue Replay & Real-Time Sync
Unlike most disaster management systems that simply fail when connectivity is lost, SahayLink continues to work. Every action is immediately applied optimistically in the UI while being queued for later sync. When connection is restored, the queue is replayed and the server reconciles conflicts. Meanwhile, WebSockets ensure instant synchronization for active online users.

### 2. Field-Condition Batching Toggle
The manual offline toggle is not a bug — it is a deliberate UX feature designed for the reality of disaster zones where signals fluctuate. Workers can lock themselves to "offline" mode intentionally to batch a set of actions before pushing them all at once on a confirmed stable connection, avoiding mid-action timeouts.

### 3. Deterministic Conflict Resolution
When two workers claim the same incident while both offline, a standard "last write wins" approach would cause unpredictable behavior. SahayLink uses a **timestamp-authority model**: the worker who claimed the incident first (by action timestamp, not server receipt time) becomes the team leader. The other worker is automatically added as a team member with a clear activity log entry explaining the resolution.

### 4. Progressive Web App Architecture
The architecture is PWA-ready: all API calls use relative URLs, connectivity detection is robust, and the queue survives page refreshes. The only prerequisite is a single initial page load to cache assets — standard for every PWA.

### 5. Atomic Write Consistency via In-Process Mutex
Rather than accepting the complexity of PostgreSQL advisory locks, we use an application-level per-incident Mutex that serializes concurrent writes with zero database overhead.

---

## 7. Feasibility

### Technical Feasibility
- **Proven technology stack:** Next.js, Supabase, and Tailwind CSS are all production-grade technologies with extensive documentation and community support.
- **Build complexity:** The entire system was built and validated within a single hackathon session, demonstrating rapid implementability.
- **Scalability path:** The robust relational PostgreSQL schema easily accommodates extensive scaling and advanced querying.

### Operational Feasibility
- **Device requirements:** Any smartphone or laptop with a modern browser. No app installation required.
- **Network requirements:** Requires connectivity only for the initial page load and sync operations. Works entirely offline in between.
- **Training requirements:** A worker can be productive within minutes. No manual needed.

### Financial Feasibility
| Component | Cost |
|---|---|
| Next.js hosting (Render free tier) | Rs 0 |
| Supabase (Free tier: 500MB DB, unlimited API) | Rs 0 |
| Domain | ~Rs 800/year |
| **Total MVP cost** | **Less than Rs 1,000/year** |

---

## 8. Competitive Analysis

| Feature | SahayLink | WhatsApp / Telegram Groups | iSafe (Govt. App) | SAHANA Eden |
|---|---|---|---|---|
| **Works fully offline** | Yes (queue + sync) | No (requires active connection) | No | No |
| **Conflict resolution** | Yes (automatic) | N/A | N/A | Partial |
| **Incident lifecycle tracking** | Yes (full chain) | No (unstructured chat) | Yes | Yes |
| **Duplicate detection** | Yes (relational linking) | No | No | No |
| **Resource request tracking** | Yes (full lifecycle) | No | Partial | Yes |
| **No app installation** | Yes (browser PWA) | No (app required) | No (app required) | No (server setup required) |
| **Team coordination (tasks + chat)** | Yes | Yes (unstructured) | No | No |
| **Deployment complexity** | Low (1 command) | N/A | High | Very High |
| **Operator training required** | Minimal | None | Moderate | Extensive |

**Key differentiator:** SahayLink is the only solution that combines offline-first reliability with structured incident coordination (team management, resource tracking, task management, conflict resolution) in a zero-install browser application.

---

## 9. Future Roadmap

### Near Term (1 week)
- **SMS Integration:** Use Twilio SMS API as a fallback transport layer. When internet is unavailable but cellular is present, queue items are sent/received via SMS in a compact format.
- **Progressive Web App (PWA):** Add a Service Worker to cache the application shell, enabling the app to load even with zero connectivity (true offline-first).

### Medium Term (1 month)
- **LoRa Integration:** For zero-connectivity scenarios (no WiFi, no cellular), use LoRa (Long Range Radio) modules to sync the action queue over a mesh radio network between field devices and a base station.
- **Multi-Organisation Support:** Add lightweight authentication (Supabase Auth) to allow multiple agencies to operate simultaneously with appropriate data visibility.

### Long Term (3 months)
- **GIS Map View:** Plot incident locations on a map (Leaflet.js + OpenStreetMap) for geographic coordination.
- **Predictive Severity:** Use historical incident data to recommend resource allocation for new incidents of similar type and location.
- **Dashboard Analytics:** Incident heatmaps, response time metrics, resource utilization reports for HQ-level situational awareness.

---

## 10. The Offline Sync Flow (Demo Script for Judges)

This is the core technical story for the SIH presentation:

1. **Worker A** opens the portal on **Device A** (connected). The 3 demo incidents load.
2. **Worker A** clicks "Toggle Offline" — enters OFFLINE MODE.
3. **Worker A** claims `demo-001` and adds 2 tasks. These are saved to the local queue. UI updates immediately (optimistic).
4. **Worker B** opens the portal on **Device B** (also connected). Sees `demo-001` still UNASSIGNED (Worker A's changes haven't synced yet).
5. **Worker B** also claims `demo-001`. Gets an immediate confirmation.
6. **Worker A** clicks "Toggle Offline" — goes back online — clicks "Sync Now".
7. The sync engine runs. Worker B claimed first (earlier timestamp). Worker A's CLAIM is resolved: Worker A is automatically added as a team **member**, not leader. The activity log records exactly what happened.
8. Worker A refreshes (or receives Realtime updates). Sees `demo-001` as RECRUITING with Worker B as leader and themselves as member — the conflict was resolved transparently without any data loss.

---

*Document generated: 2026-08-30 | SIH 2026 | SahayLink Disaster Coordination Portal*
