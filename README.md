---

# Homework Planner

**Your personal, private schedule—synced everywhere.**

Welcome to the **Homework Planner**! This is a secure tool designed to keep your school life organized across your laptop, phone, and tablet. Unlike other planners that store your data on a central server, I use a **Zero-Knowledge** architecture. This means your schedule is encrypted on your device, so I can't see it—even when it is syncing it between your devices.

### 🌟 Try it now

No installation required. Access your private planner from any browser:
👉 **[planner.adangarcia.com](https://www.google.com/search?q=https://planner.adangarcia.com)**

---

## 📖 User Guide

### Access Your Schedule Anywhere

Start planning on your laptop, then view your agenda on your phone while walking to class.

- **Multi-Device Sync:** Changes you make on one device appear instantly on all your other connected devices.
- **No Accounts Needed:** We don't ask for an email or username. Instead, you create a **Sync ID** (Room ID) and a **Secret Password**.
- **How to Connect:** Simply enter the same Sync ID and Password on your phone and laptop. That's it—they are now connected!

### Why is this secure?

- **Your Data is Yours:** Your schedule is encrypted (scrambled) on your device before it travels to our server.
- **"Ghost" Relay:** Our server acts only as a bridge to pass data between your devices. It cannot read your tasks.
- **Automatic Wipe:** If you close the planner on all your devices, the server waits **10 minutes** and then permanently deletes your encrypted data from its memory. Your schedule stays safe in your browser's local storage.

### ✨ Key Features

- **Instant Sync:** Update a task on your computer, and watch it update on your tablet in real-time.
- **Offline Capable:** No internet? No problem. The app works offline and syncs your changes automatically the next time you connect.
- **Flexible Views:** Organize your time with Month, Week, Day, and Agenda views.
- **Drag & Drop:** Easily reschedule tasks by dragging them to a new date.
- **Calendar Export:** Export your schedule to Google Calendar or Apple Calendar (`.ics`).

---

## 👨‍💻 Developer Documentation

This repository contains the **Frontend** source code. The application uses a "Trust No One" architecture where the backend acts as a dumb relay for encrypted blobs to facilitate multi-device syncing.

### 🛠 Tech Stack

- **Core:** React 19 + Vite (Rolldown)
- **Styling:** Tailwind CSS v4 + PostCSS
- **State:** React Context API (`Auth`, `Data`, `UI`)
- **Network:** Socket.io Client (WebSockets)
- **Security:** Web Crypto API (`AES-GCM`, `PBKDF2`)

### 🔄 Sync Architecture

1. **Optimistic UI:** When a user updates their schedule, `DataContext` updates the local state immediately for zero latency.
2. **Client-Side Encryption:**

- The app intercepts the new event in `useSocketSync`.
- It derives a cryptographic key from the user's Password (which is **never** sent to the server).
- The event payload is encrypted using `AES-GCM`.

3. **Relay:** The encrypted blob is emitted to the server via Socket.io. The server broadcasts this blob to the user's other connected devices without decrypting it.
4. **Device Decryption:** The secondary device receives the blob, decrypts it with the local key, and updates its UI.

### 🔒 Security Specifics

- **Ephemeral Server Storage:** The backend implements a strict 10-minute TTL (Time To Live) on room data after the last device disconnects.
- **Local Persistence:** Data is persisted in `localStorage` to support offline usage and to "re-seed" the server when the user reconnects after the 10-minute wipe window.

### 📦 Installation

To run the frontend locally:

1. **Clone & Install:**

```bash
git clone https://github.com/adan-garcia/planner.git
cd planner
npm install
```

2. **Run Development Server:**

```bash
npm run dev
```

_Note: By default, the local frontend connects to the production backend at `planner.adangarcia.com`._ 3. **Build:**

```bash
npm run build
```

---

**Disclaimer:** This README documentation was generated with the assistance of AI. BUt The application code was written by Adan Garcia.
