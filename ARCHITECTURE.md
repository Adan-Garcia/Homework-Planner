# Architecture Documentation

## System Overview

Homework Planner is a **zero-knowledge, offline-first Progressive Web App** that synchronizes encrypted task data across multiple devices in real-time using persistent server-side storage.

### Core Principles

1. **Zero-Knowledge Encryption** — Server cannot read user data; it only stores and relays encrypted blobs
2. **Offline-First** — Works without internet via localStorage + Service Worker; syncs when connectivity returns
3. **Real-Time Sync** — Changes propagate instantly across devices via Socket.io WebSockets
4. **No Accounts** — Room-based authentication using a Sync ID + password (no email, no username)
5. **Client-Side Security** — All encryption/decryption happens in the browser using Web Crypto API
6. **Optimistic Concurrency** — Version-based conflict detection with field-level 3-way merge

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                     CLIENT DEVICES                        │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐            ┌──────────────┐            │
│  │   Browser A   │            │   Browser B   │           │
│  ├──────────────┤            ├──────────────┤            │
│  │ React 19 App  │            │ React 19 App  │           │
│  │ + Context API │            │ + Context API │           │
│  ├──────────────┤            ├──────────────┤            │
│  │ localStorage  │            │ localStorage  │           │
│  │ (plaintext)   │            │ (plaintext)   │           │
│  └───────┬──────┘            └──────┬───────┘            │
│          │                          │                     │
│          │  ┌──────────────────┐    │                     │
│          └──┤  Web Crypto API  ├────┘                     │
│             │  AES-GCM encrypt │                          │
│             │  PBKDF2 key      │                          │
│             └────────┬─────────┘                          │
│                      │                                    │
└──────────────────────┼────────────────────────────────────┘
                       │ Encrypted Payloads + Version
                       │ (Socket.io WebSockets)
                       ↓
             ┌──────────────────┐
             │   RELAY SERVER    │
             ├──────────────────┤
             │  Express + Helmet │
             │  Socket.io (nsp)  │
             │  UUID Sessions    │
             │  Rate Limiting    │
             │  SSRF Protection  │
             └────────┬─────────┘
                      │
                      ↓
             ┌──────────────────┐
             │  SQLite (WAL)     │
             │  better-sqlite3   │
             ├──────────────────┤
             │  rooms            │
             │  events (versioned│
             │    encrypted blobs│
             │  sessions         │
             └──────────────────┘
             48-hour inactive TTL
             (cascade delete)
```

---

## Security Architecture

### Key Derivation Flow

```
User Password + Salt (fetched from server)
          │
          ▼
    PBKDF2 (600,000 iterations, SHA-256)
          │
     ┌────┴────┐
     ▼         ▼
 AUTH Key   DATA Key
(HMAC-256) (AES-GCM 256-bit)
     │         │
     ▼         ▼
  Hashed &   Stays in
  sent to    browser
  server     (never sent)
```

### Encryption Pipeline

```
1. User creates/edits task
   ↓
2. DataContext updates local state (optimistic)
   ↓
3. useSocketSync.addEvent() / updateEvent()
   │  - Generate unique 12-byte IV
   │  - AES-GCM encrypt with DATA key
   │  - Bundle: { id, iv, data }
   ↓
4. Socket.emit('event:save', { event, version })
   ↓
5. Server checks version against DB
   │  - Match → store blob, increment version, broadcast
   │  - Mismatch → return { conflict: true, serverEvent, serverVersion }
   ↓
6. On success: other clients receive 'event:sync'
   ↓
7. useSocketSync.handleEventSync()
   │  - Decrypt with DATA key
   │  - Update local state + version map
   ↓
8. On conflict: client performs 3-way merge (see below)
```

### Why This Is Secure

| Property | Mechanism |
|----------|-----------|
| **Server Blindness** | Server only sees encrypted blobs — no plaintext ever touches the backend |
| **Key Separation** | AUTH key proves identity; DATA key encrypts (never sent to server) |
| **Unique IVs** | Every encryption uses a fresh 12-byte random IV |
| **Brute Force Resistant** | 600k PBKDF2 iterations ≈ 500ms per attempt |
| **Timing-Safe Auth** | `crypto.timingSafeEqual` for hash comparison on login |
| **SSRF Protection** | DNS resolution validated against private IP ranges; direct IP connection prevents DNS rebinding |

---

## Frontend Architecture

### Provider Hierarchy

```
App.jsx
  └─ ErrorBoundary
      └─ NotificationProvider     (toast messages)
          └─ AuthProvider          (room auth, session token, crypto key)
              └─ DataProvider      (events, classColors, CRUD, sync)
                  └─ PlannerProvider (view mode, currentDate, UI state)
                      └─ DragDropProvider (task rescheduling)
                          └─ MainLayout (app shell)
```

### Context Responsibilities

| Context | Purpose | Key State |
|---------|---------|-----------|
| **AuthContext** | Authentication handshake, key derivation | `roomId`, `authToken`, `cryptoKey`, `isAuthorized` |
| **DataContext** | Business logic, CRUD, sync orchestration | `events`, `classColors`, `hiddenClasses`, `peerCount`, all mutation callbacks |
| **PlannerContext** | View state, UI preferences | `view`, `currentDate`, `darkMode`, `selectedDate`, modals |
| **NotificationContext** | User feedback | Toast queue, `notify.success()` / `notify.error()` |
| **DragDropContext** | Drag interactions | Drag state, drop handlers for date rescheduling |

### DataContext Exports

The `DataContext` provider exposes the following via `useData()`:

| Property | Description |
|----------|-------------|
| `events` / `setEvents` | Event array + setter |
| `classColors` / `setClassColors` | Class-to-color mapping |
| `hiddenClasses` / `setHiddenClasses` | Hidden class filter list |
| `addEvent` | Create event(s) with recurrence expansion |
| `updateEvent` | Edit event (with group propagation) |
| `deleteEvent` | Delete event (with group deletion) |
| `bulkAddEvents` | Import multiple events at once |
| `bulkDeleteEvents` | Delete multiple events by ID array |
| `toggleTaskCompletion` | Mark task complete/incomplete |
| `deleteClass` / `mergeClasses` / `renameClass` | Class management operations |
| `refreshClassColors` | Re-derive colors from current events |
| `importJsonData` | Import from JSON |
| `exportICS` / `processICSContent` / `importICSFromUrl` | ICS import/export |
| `resetAllData` | Clear all local data |
| `isAuthorized` | Whether connected to a sync room |
| `peerCount` | Number of connected devices |

---

## Synchronization Strategy

### Connection Lifecycle

```
1. User enters Room ID + Password
   ↓
2. useRoomAuth()
   │  - POST /api/auth/init  → get salt (or generate for new room)
   │  - PBKDF2 derive AUTH key + DATA key
   │  - POST /api/auth/login → get session token
   ↓
3. useSocketSync()
   │  - Connect socket with token + roomId
   │  - Socket middleware verifies session
   │  - Emit 'join' to enter room
   │  - GET /api/rooms/:roomId/events → fetch encrypted events
   │  - Decrypt all events with DATA key
   ↓
4. If server has fewer events than localStorage:
   │  - Re-seed server via bulkAddEvents (handles 48-hour cleanup gap)
   ↓
5. Listen for real-time updates:
   │  - event:sync (single update)
   │  - event:bulk_sync (batch updates)
   │  - event:remove (single deletion)
   │  - event:bulk_remove (batch deletion)
   │  - meta:sync (class colors)
   │  - room:count (peer count)
```

### Version-Based Conflict Resolution (OCC)

```
1. Client A edits event (version 3)
2. Client B edits same event (version 3)
3. Client A saves first → server accepts, version becomes 4
4. Client B sends version 3 → server detects mismatch, returns conflict

Client B conflict handler:
   ├─ Decrypt server event (version 4)
   ├─ Retrieve base event from baseEventsRef (version 3 snapshot)
   ├─ fieldLevelMerge(base, localEdit, serverEdit)
   │   ├─ Compare each field against base
   │   ├─ If only one side changed a field → take that change
   │   ├─ If both changed same field to same value → no conflict
   │   └─ If both changed same field differently → merge fails
   ├─ Success → encrypt merged result, save with serverVersion
   └─ Failure → fall back to last-write-wins (force: true)
```

### Offline Handling

```
Online:
  DataContext → useSocketSync → encrypt → socket.emit → server → broadcast

Offline:
  DataContext → localStorage only (no socket)

Reconnect:
  socket 'connect' → join room → compare server vs. local
  → re-seed if server was cleaned up during offline period
```

---

## Component Structure

### Feature Components

```
components/features/
├── auth/
│   └── ReLoginModal.jsx           # Re-auth when session expires
├── calendar/
│   ├── CalendarView.jsx           # Month/Week/Day/Agenda views
│   └── Sidebar.jsx                # Task list + class filters
├── onboarding/
│   └── SetupScreen.jsx            # Initial room setup wizard
└── settings/
    ├── ApiConfigContent.jsx       # Custom API endpoint config
    ├── ClassManager.jsx           # Course list management
    ├── ClassRow.jsx               # Individual class row
    ├── DateCleanerContent.jsx     # Bulk delete by date range
    ├── ImportContent.jsx          # ICS/JSON import
    ├── JsonEditorModal.jsx        # Raw JSON event editor
    ├── MergeContent.jsx           # Merge two classes
    └── SyncRoomContent.jsx        # Room connection settings

```

### Shared Components

```
components/
├── ui/                            # Design system primitives
│   ├── Button.jsx
│   ├── Card.jsx
│   ├── CollapsibleCard.jsx
│   ├── Input.jsx
│   ├── Modal.jsx
│   ├── ErrorBoundary.jsx          # Global error catcher
│   └── FeatureErrorBoundary.jsx   # Feature-level error isolation
├── layout/
│   └── MainLayout.jsx             # App shell (header + content)
├── modals/
│   ├── TaskModal.jsx              # Create/edit tasks
│   ├── SettingsModal.jsx          # App settings
│   └── ConfirmationModal.jsx      # Confirmation dialogs
└── managers/
    └── ModalManager.jsx           # Centralized modal rendering
```

---

## Custom Hooks

| Hook | Purpose | Key Features |
|------|---------|--------------|
| `useRoomAuth` | Authentication handshake | PBKDF2 key derivation, salt fetch, session management |
| `useSocketSync` | Real-time encrypted sync | Encryption pipeline, OCC, 3-way merge, reconnection with backoff |
| `useFilteredEvents` | Event filtering/search | Text search, type filter, date range, completion status |
| `useTaskDragAndDrop` | Drag interactions | Date rescheduling with optimistic updates |
| `usePWA` | PWA lifecycle | Service worker registration, install prompt, update detection |
| `useDebounce` | Input debouncing | Prevents excessive re-renders on rapid input |
| `useKeyboardShortcuts` | Keyboard navigation | Global shortcuts for common actions |
| `usePerformance` | Performance monitoring | Custom timing measurements |

---

## Utility Modules

| Module | Key Exports |
|--------|-------------|
| **crypto.js** | `deriveKey()`, `encryptEvent()`, `decryptEvent()`, `generateSalt()` |
| **helpers.js** | `normalizeEvent()`, `validateEvent()`, `sanitizeInput()`, `compareTasks()` |
| **mergeUtils.js** | `fieldLevelMerge()` — 3-way field merge for conflict resolution |
| **constants.js** | `STORAGE_KEYS`, `SOCKET_EVENTS`, `EVENT_TYPES`, `PALETTE`, `PBKDF2_ITERATIONS`, API config |
| **icsHelpers.js** | ICS parsing and generation utilities |
| **logger.js** | Production-safe conditional logging |
| **performance.js** | Performance measurement utilities |
| **webVitals.js** | Core Web Vitals tracking |

---

## Backend Architecture

### Server Stack

- **Express** — HTTP routing + middleware
- **Socket.io** — Real-time WebSocket communication (namespaced at `/backend`)
- **better-sqlite3** — Persistent SQLite database with WAL mode
- **Helmet** — Strict HTTP security headers (CSP, CORP, COEP, COOP)

### Database Schema

```sql
rooms (
  id TEXT PRIMARY KEY,
  salt TEXT NOT NULL,
  auth_hash TEXT NOT NULL,
  meta TEXT,                          -- JSON: class colors, etc.
  created_at DATETIME,
  last_active DATETIME
)

events (
  room_id TEXT NOT NULL,
  id TEXT NOT NULL,
  iv TEXT NOT NULL,                   -- AES-GCM initialization vector
  data TEXT NOT NULL,                 -- Encrypted blob (ciphertext)
  version INTEGER NOT NULL DEFAULT 1, -- OCC version counter
  updated_at DATETIME,
  PRIMARY KEY (room_id, id),
  FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
)

sessions (
  token TEXT PRIMARY KEY,             -- UUID
  room_id TEXT NOT NULL,
  created_at DATETIME,
  FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
)
```

### Socket Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `join` | Client → Server | Join a room |
| `event:save` | Client → Server | Save single event (with version for OCC) |
| `event:bulk_save` | Client → Server | Save batch of events |
| `event:delete` | Client → Server | Delete single event |
| `event:bulk_delete` | Client → Server | Delete batch of events |
| `meta:save` | Client → Server | Save room metadata (class colors) |
| `event:sync` | Server → Client | Broadcast single event update |
| `event:bulk_sync` | Server → Client | Broadcast batch updates |
| `event:remove` | Server → Client | Broadcast single deletion |
| `event:bulk_remove` | Server → Client | Broadcast batch deletions |
| `meta:sync` | Server → Client | Broadcast metadata update |
| `room:count` | Server → Client | Current peer count |

### Rate Limits

| Layer | Limit |
|-------|-------|
| HTTP login | 10 attempts / 60s per IP |
| Socket connections | 30 / 60s per IP |
| Concurrent sockets | 20 per IP |
| Socket events | 80 / 10s per socket |

### Maintenance

- **Room cleanup:** Every ~66 minutes, rooms inactive for 48 hours are cascade-deleted (rooms + events + sessions)
- **Session purge:** Expired sessions (>24h) cleaned up on the same schedule
- **WAL checkpoint:** `TRUNCATE` checkpoint runs with each cleanup cycle

---

## Testing Strategy

### Test Pyramid

```
        ┌────────┐
        │  E2E   │  ← Planned (Cypress)
        └────────┘
      ┌────────────┐
      │Integration │  ← Vitest + React Testing Library
      └────────────┘
    ┌──────────────────┐
    │   Unit Tests     │  ← Vitest
    └──────────────────┘
```

### Test Files

| File | Coverage Area |
|------|--------------|
| `crypto.test.js` | Encryption/decryption, key derivation |
| `helpers.test.js` | Utility functions, validation |
| `merge.test.js` | 3-way field merge logic |
| `validation.test.js` | Input validation |
| `hooks.test.js` | Custom hook behavior |
| `components.test.jsx` | Component rendering and interaction |
| `integration.test.js` | Cross-module integration |

---

## Performance Optimizations

1. **React.memo** on expensive components (CalendarView)
2. **useMemo** for filtered/sorted data derivation
3. **useCallback** for stable function references in context
4. **Web Worker** for ICS parsing (offloads main thread)
5. **Prepared Statements** — all SQL queries pre-compiled at server startup
6. **SQLite Transactions** — bulk operations use `db.transaction()` for atomicity and performance
7. **WAL Mode** — concurrent reads during writes
8. **Debounced inputs** to prevent excessive re-renders

---

**Last Updated:** March 2026
