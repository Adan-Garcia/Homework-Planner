# Architecture Documentation

## 🏗️ System Overview

Homework Planner is a **zero-knowledge, offline-first Progressive Web App** that synchronizes encrypted task data across multiple devices in real-time.

### Core Principles

1. **Zero-Knowledge Encryption**: Server cannot read user data
2. **Offline-First**: Works without internet, syncs when available
3. **Real-Time Sync**: Changes propagate instantly across devices
4. **No Accounts**: Uses room-based authentication instead of user accounts
5. **Client-Side Security**: All encryption happens in the browser

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT DEVICES                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐              ┌──────────────┐            │
│  │   Browser A   │              │   Browser B   │            │
│  ├──────────────┤              ├──────────────┤            │
│  │ React App     │              │ React App     │            │
│  │ + Context API │              │ + Context API │            │
│  ├──────────────┤              ├──────────────┤            │
│  │ localStorage  │              │ localStorage  │            │
│  │ (Encrypted)   │              │ (Encrypted)   │            │
│  └───────┬──────┘              └──────┬───────┘            │
│          │                             │                     │
│          │  ┌─────────────────┐       │                     │
│          └──┤ Web Crypto API  │───────┘                     │
│             │  (AES-GCM)      │                             │
│             └─────────────────┘                             │
│                     │                                        │
└─────────────────────┼────────────────────────────────────────┘
                      │ Encrypted Payloads
                      │ (Socket.io)
                      ↓
            ┌─────────────────┐
            │  RELAY SERVER   │
            ├─────────────────┤
            │  Socket.io      │
            │  + JWT Auth     │
            │  + Room Manager │
            └─────────────────┘
                      │
                      │ 10-min TTL
                      ↓
            ┌─────────────────┐
            │  In-Memory DB   │
            │  (Encrypted     │
            │   Blob Store)   │
            └─────────────────┘
```

---

## 🔐 Security Architecture

### Key Derivation Flow

```javascript
User Password + Salt (from server)
          ↓
    PBKDF2 (600k iterations)
          ↓
     ┌────┴────┐
     ↓         ↓
 AUTH Key   DATA Key
(HMAC-256) (AES-GCM)
     ↓         ↓
  Sent to    Stays in
  Server     Client
```

### Encryption Process

```
1. User creates/edits task
   ↓
2. DataContext.addEvent()
   ↓
3. useSocketSync.encryptEvent()
   │  - Generate unique IV
   │  - AES-GCM encrypt with DATA key
   │  - Bundle: { iv, data, id }
   ↓
4. Socket.emit('event:save', encrypted)
   ↓
5. Server stores encrypted blob
   ↓
6. Server broadcasts to other clients
   ↓
7. useSocketSync.decryptEvent()
   │  - Extract IV and ciphertext
   │  - AES-GCM decrypt with DATA key
   ↓
8. DataContext updates local state
```

### Why This Is Secure

- **Server Blindness**: Server only sees encrypted blobs, can't decrypt
- **Key Separation**: AUTH key proves identity, DATA key encrypts (never sent)
- **Perfect Forward Secrecy**: Each encryption uses unique IV
- **Brute Force Resistant**: 600k PBKDF2 iterations takes ~500ms per attempt
- **No Plaintext Storage**: Even localStorage contains encrypted data

---

## 🎨 Frontend Architecture

### State Management

```
App.jsx
  ↓
ErrorBoundary
  ↓
NotificationProvider (Toast messages)
  ↓
AuthProvider (Room auth, JWT token)
  ↓
DataProvider (Events, sync)
  ↓
UIProvider (View modes, modals)
  ↓
DragDropProvider (Task rescheduling)
  ↓
PlannerApp (Main UI)
```

### Context Responsibilities

| Context | Purpose | State Items |
|---------|---------|-------------|
| **AuthContext** | Authentication | `roomId`, `authToken`, `cryptoKey`, `isAuthorized` |
| **DataContext** | Business Logic | `events`, `classColors`, `hiddenClasses`, CRUD operations |
| **UIContext** | Presentation | `darkMode`, `view`, `modals`, `filters`, `currentDate` |
| **NotificationContext** | User Feedback | Toast queue, show/dismiss methods |
| **DragDropContext** | Interactions | Drag state, drop handlers |

### Data Flow Patterns

#### Optimistic Updates
```javascript
// 1. Update UI immediately (optimistic)
setEvents(prev => [...prev, newEvent]);

// 2. Sync to server in background
if (isAuthorized) {
  socket.emit('event:save', await encrypt(newEvent));
}

// 3. If sync fails, rollback
.catch(() => {
  setEvents(prev => prev.filter(e => e.id !== newEvent.id));
  notify.error('Sync failed. Changes reverted.');
});
```

#### Conflict Resolution
```javascript
// Last-write-wins (simple but effective for this use case)
socket.on('event:sync', async (encrypted) => {
  const remote = await decrypt(encrypted);
  setEvents(prev => {
    const exists = prev.find(e => e.id === remote.id);
    if (exists) {
      // Replace local with remote (server has latest)
      return prev.map(e => e.id === remote.id ? remote : e);
    }
    // Add new event
    return [...prev, remote];
  });
});
```

---

## 🔄 Synchronization Strategy

### Connection Lifecycle

```
1. User enters Room ID + Password
   ↓
2. AuthContext.useRoomAuth()
   │  - Fetch salt from server
   │  - Derive AUTH and DATA keys
   │  - Login with AUTH key
   │  - Receive JWT token
   ↓
3. DataContext.useSocketSync()
   │  - Connect socket with JWT
   │  - Join room
   │  - Fetch existing events
   ↓
4. If server has no data:
   │  Re-seed from localStorage
   │  (Handles 10-min TTL cleanup)
   ↓
5. Listen for updates
   │  - event:sync (single update)
   │  - event:bulk_sync (multiple)
   │  - event:remove (deletion)
   │  - meta:sync (colors)
```

### Offline Handling

```javascript
// App works offline via localStorage persistence
if (!navigator.onLine || !socket.connected) {
  // All changes go to localStorage
  localStorage.setItem('hw_events', JSON.stringify(events));
}

// On reconnection
socket.on('connect', () => {
  // Re-authenticate
  socket.emit('join', roomId);
  
  // Re-seed if server data was cleared
  if (serverEvents.length === 0 && localEvents.length > 0) {
    bulkUpload(localEvents);
  }
});
```

---

## 📦 Component Structure

### Feature Components

```
components/
├── features/
│   ├── auth/
│   │   └── ReLoginModal.jsx         # Re-auth on token expiry
│   ├── calendar/
│   │   ├── CalendarView.jsx         # Month/Week/Day views
│   │   └── Sidebar.jsx              # Task list + filters
│   ├── onboarding/
│   │   └── SetupScreen.jsx          # Initial room setup
│   ├── settings/
│   │   ├── ApiConfigContent.jsx     # API endpoint config
│   │   ├── ClassManager.jsx         # Course management
│   │   ├── ImportContent.jsx        # ICS import
│   │   └── SyncRoomContent.jsx      # Room sync settings
│   └── tasks/
│       └── (No direct task components - integrated in modals)
```

### Shared Components

```
components/
├── ui/                              # Design system primitives
│   ├── Button.jsx                   # Reusable button
│   ├── Card.jsx                     # Container card
│   ├── Input.jsx                    # Form input
│   ├── Modal.jsx                    # Dialog wrapper
│   ├── ErrorBoundary.jsx            # Global error catcher
│   └── FeatureErrorBoundary.jsx     # Feature-level errors
├── layout/
│   └── MainLayout.jsx               # App shell (header + content)
├── modals/
│   ├── TaskModal.jsx                # Create/edit tasks
│   ├── SettingsModal.jsx            # App settings
│   └── ConfirmationModal.jsx        # Confirmation dialogs
└── managers/
    └── ModalManager.jsx             # Centralized modal rendering
```

---

## 🪝 Custom Hooks

| Hook | Purpose | Key Features |
|------|---------|--------------|
| `useRoomAuth` | Authentication handshake | Rate limiting, key derivation, JWT management |
| `useSocketSync` | Real-time sync | Encryption, conflict resolution, reconnection |
| `useFilteredEvents` | Event filtering | Search, type filter, date range, completion |
| `useTaskDragAndDrop` | Drag interactions | Date rescheduling, optimistic updates |
| `usePWA` | PWA features | Service worker, install prompt, updates |
| `useDebounce` | Input debouncing | Prevents excessive re-renders |

---

## 🧰 Utility Modules

### Crypto (`utils/crypto.js`)
- `deriveKey(password, salt, purpose)` - PBKDF2 key derivation
- `encryptEvent(event, key)` - AES-GCM encryption
- `decryptEvent(encrypted, key)` - AES-GCM decryption
- `generateSalt()` - Random salt generation

### Helpers (`utils/helpers.js`)
- `normalizeEvent(raw)` - Event structure validation
- `validateEvent(event)` - Business rule validation
- `sanitizeInput(str)` - XSS prevention
- `generateICS(events)` - Calendar export
- `compareTasks(a, b)` - Task sorting logic

### Constants (`utils/constants.js`)
- Storage keys
- API configuration
- Socket event names
- Crypto parameters
- UI limits

### Logger (`utils/logger.js`)
- Production-safe logging
- Conditional output (dev only)
- Consistent formatting

---

## 🧪 Testing Strategy

### Test Pyramid

```
        ┌────────┐
        │  E2E   │  ← Cypress (planned)
        └────────┘
      ┌────────────┐
      │Integration │  ← Vitest + React Testing Library
      └────────────┘
    ┌──────────────────┐
    │   Unit Tests     │  ← Vitest
    └──────────────────┘
```

### Coverage Goals

| Module | Target | Current | Critical Paths |
|--------|--------|---------|----------------|
| Crypto | 100% | ~95% | All functions |
| Helpers | 90% | ~85% | Validation, sanitization |
| Hooks | 80% | ~60% | Auth flow, sync logic |
| Components | 70% | ~30% | User interactions |

---

## 🚀 Performance Optimizations

### Implemented

1. **React.memo** on expensive components (CalendarView)
2. **useMemo** for filtered/sorted data
3. **useCallback** for stable function references
4. **Web Worker** for ICS parsing (offloads main thread)
5. **Lazy Loading** for modals (not yet implemented)
6. **Virtual Scrolling** for large task lists (not yet implemented)

### Monitoring

- Performance API for custom measurements
- FCP/LCP tracking in development
- Bundle size monitoring via Vite

---

## 🔮 Future Architecture Considerations

### Planned Improvements

1. **Conflict Resolution**: CRDTs for better multi-device editing
2. **Compression**: Gzip encrypted payloads before transmission
3. **Versioning**: Migration system for data schema changes
4. **Analytics**: Privacy-preserving usage metrics
5. **Accessibility**: Full WCAG 2.1 AA compliance

### Scalability

Current architecture supports:
- ✅ 5-10 concurrent devices per room
- ✅ 1000+ events per user
- ✅ 100+ KB localStorage usage

Future scaling:
- IndexedDB for larger datasets (10k+ events)
- Selective sync (date range filtering)
- Compression for bandwidth optimization

---

## 📚 Further Reading

- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Socket.io Client API](https://socket.io/docs/v4/client-api/)
- [React Context Best Practices](https://react.dev/reference/react/useContext)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

---

**Last Updated**: February 1, 2026
