# Homework Planner

**Your personal, private schedule — synced everywhere.**

A secure, zero-knowledge task management app designed to keep your school life organized across all your devices. Your schedule is encrypted on your device before it ever leaves — the server can never read your data, even while syncing.

### Try it now

No installation required. Access your private planner from any browser:

**[planner.adangarcia.com](https://planner.adangarcia.com)**

---

## User Guide

### Access Your Schedule Anywhere

Start planning on your laptop, then check your agenda on your phone while walking to class.

- **Multi-Device Sync:** Changes on one device appear instantly on all your other connected devices via encrypted WebSockets.
- **No Accounts Needed:** No email or username required. Create a **Sync ID** (Room ID) and a **Secret Password** — that's your identity.
- **How to Connect:** Enter the same Sync ID and Password on each device. They sync automatically.

### Why is this secure?

- **Your Data is Yours:** Your schedule is encrypted (AES-GCM) on your device before it travels to the server.
- **Blind Relay:** The server stores and relays encrypted blobs. It cannot decrypt or read your tasks.
- **Automatic Cleanup:** Rooms inactive for **48 hours** are permanently deleted from the server. Your data stays safe in your browser's local storage and re-seeds the server when you reconnect.

### Features

- **Instant Sync** — Update a task on your computer and watch it update on your tablet in real-time.
- **Conflict Resolution** — Simultaneous edits on multiple devices are handled with field-level 3-way merge and version-based optimistic concurrency control (OCC).
- **Offline Capable** — Works fully offline via PWA / Service Worker. Changes sync automatically when you reconnect.
- **Flexible Views** — Month, Week, Day, and Agenda views.
- **Drag & Drop** — Reschedule tasks by dragging them to a new date.
- **Class Management** — Color-coded classes with rename, merge, hide, and delete support.
- **ICS Import / Export** — Import from `.ics` files or URLs (with SSRF-protected server proxy). Export to Google Calendar, Apple Calendar, etc.
- **JSON Editor** — Directly view and edit your event data as JSON.
- **Date Cleaner** — Bulk-delete events before or after a specific date.
- **Peer Count** — See how many devices are currently connected to your room.
- **Task Types** — Homework, Exam, Quiz, Project, Reading, Lab, Discussion, and Assignment.

---

## Developer Documentation

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **UI** | React 19 + Rolldown-Vite 7 |
| **Styling** | Tailwind CSS v4 + PostCSS |
| **State** | React Context API (`AuthContext`, `DataContext`, `NotificationContext`, `DragDropContext`, `PlannerContext`) |
| **Network** | Socket.io Client (WebSockets) |
| **Security** | Web Crypto API (AES-GCM, PBKDF2 — 600k iterations) |
| **Testing** | Vitest + React Testing Library |
| **Backend** | Node.js + Express + Socket.io + better-sqlite3 (WAL mode) |
| **Infrastructure** | Docker (node:20-alpine) + Cloudflare Pages |

### Sync Architecture

1. **Optimistic UI:** `DataContext` updates local state immediately for zero-latency UX.
2. **Client-Side Encryption:** `useSocketSync` encrypts the event payload with AES-GCM using a key derived from the user's password via PBKDF2 (600k iterations). The password never leaves the client.
3. **Relay & Persist:** The encrypted blob is emitted to the server via Socket.io. The server persists it in SQLite and broadcasts it to other connected devices — without ever decrypting it.
4. **Device Decryption:** Each receiving device decrypts the blob with its local key and updates state.
5. **Conflict Resolution:** If two devices edit the same event concurrently, the server detects a version mismatch and returns the conflicting server copy. The client performs a field-level 3-way merge (base vs. local vs. server). If the merge fails (same fields changed on both sides), it falls back to last-write-wins with a force flag.

### Security

- **Zero-Knowledge:** Server only stores encrypted blobs — cannot read any user data.
- **Key Separation:** PBKDF2 derives separate AUTH key (sent to server for login) and DATA key (stays on client for AES-GCM encryption).
- **Session Tokens:** UUID-based sessions stored in SQLite with configurable TTL (default 24h).
- **48-Hour Room Expiry:** Inactive rooms (and all their events/sessions) are permanently cascade-deleted via scheduled cleanup.
- **SSRF Protection:** The iCal proxy validates DNS resolution against private IP ranges and connects directly to validated IPs to prevent DNS rebinding.
- **Rate Limiting:** Login attempts, socket connections, and socket events are all rate-limited per IP.
- **Helmet.js:** Strict HTTP security headers including CSP, CORP, COEP, COOP, and a custom Permissions-Policy.

### Installation

```bash
# Clone & install
git clone https://github.com/adan-garcia/planner.git
cd planner/Homework-Planner
npm install

# Development server
npm run dev

# Run tests
npm test

# Lint
npm run lint

# Production build
npm run build
```

By default, the frontend connects to the production backend. Set `VITE_API_BASE_URL` to override, or configure it in the app's API Settings panel.

### Project Structure

```
Homework-Planner/
├── src/
│   ├── components/
│   │   ├── features/
│   │   │   ├── auth/           # ReLoginModal
│   │   │   ├── calendar/       # CalendarView, Sidebar
│   │   │   ├── onboarding/     # SetupScreen
│   │   │   └── settings/       # ApiConfig, ClassManager, DateCleaner,
│   │   │                       # Import, JsonEditor, Merge, SyncRoom
│   │   ├── layout/             # MainLayout
│   │   ├── managers/           # ModalManager
│   │   ├── modals/             # TaskModal, SettingsModal, ConfirmationModal
│   │   └── ui/                 # Button, Card, Input, Modal, ErrorBoundary
│   ├── context/                # Auth, Data, DragDrop, Notification, Planner
│   ├── hooks/                  # useSocketSync, useRoomAuth, useFilteredEvents, etc.
│   ├── utils/                  # crypto, helpers, constants, mergeUtils, logger
│   ├── workers/                # ICS Web Worker
│   └── test/                   # Unit & integration tests
├── public/                     # Static assets + _headers
└── dev-dist/                   # Service worker (Workbox)
```

### Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — Detailed system design, state management, and data flow
- [CONTRIBUTING.md](CONTRIBUTING.md) — Code style, testing, and PR guidelines
- [DEPLOYMENT.md](DEPLOYMENT.md) — Production deployment checklist (Docker, Cloudflare, CSP, CORS)

### License

[GNU Affero General Public License v3 (AGPL-3.0)](LICENSE)

---

**Disclaimer:** This README was generated with the assistance of AI. The application code was written by Adan Garcia.
