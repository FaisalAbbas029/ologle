# Hayloo — Privacy-First Accountless Text Conversation Platform

Hayloo is a lightweight, zero-footprint web application for interest-based text conversations. Users specify their profession and interests to get matched with compatible strangers in 1:1 sessions or join interest-based Communities (max 30) and Classrooms.

---

## 1. Technical & Safety Limitations (Phase 2 & 11 Review)

### Matchmaking & Coordination
- **Infrastructure Requirement**: Peer discovery requires a centralized WebSocket signaling service. Two standalone browsers cannot discover or exchange peer state without an intermediary signaling coordinator. Hayloo uses an in-memory Node.js WebSocket engine for this purpose.

### Content Moderation Boundaries
- **Imperfect Detection**: Automated rule-based and machine-learning text classification reduces harmful behavior (threats, harassment, sexual solicitation, spam), but cannot reliably detect sarcasm, contextual nuance, adversarial character substitutions (l33tspeak), or evolving coded language.
- **Fail-Safe Policy**: If classifier certainty is low or evaluation encounters transient delays, the system fails toward delivery rather than false-positive censorship, while escalating repeated user reports to server-side session separation.

### Accountless Moderation & Cooldowns
- **Session-Scoped Enforcement**: Because there are no accounts, phone numbers, or passwords, user blocks and cooldown restrictions are bound to the active ephemeral session and connection state. A determined adversary can bypass a session mute by reconnecting with a clean browser session. Hayloo states this limitation plainly rather than making false claims of permanent hardware bans.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Client (Browser)                    │
│   React 19 + TypeScript + Tailwind CSS + Lucide Icons   │
│   • 18 Specialized Screens & Modals                     │
│   • Ephemeral client state (zero localStorage storage)  │
└──────────────────────────▲──────────────────────────────┘
                           │ Native WebSocket (/ws)
┌──────────────────────────▼──────────────────────────────┐
│                  Hayloo Real-Time Engine                │
│   Node.js + ws (Integrated Vite Dev Server & Express)   │
│                                                         │
│  ┌──────────────────────┐    ┌──────────────────────┐   │
│  │ Compatibility Engine │    │  Safety Agent (Tier) │   │
│  │ (Exact & Category)   │    │  (Low/Med/High Rule) │   │
│  └──────────────────────┘    └──────────────────────┘   │
│  ┌──────────────────────┐    ┌──────────────────────┐   │
│  │ Matchmaking Queue    │    │ Rate Limiter (Skips/ │   │
│  │ (1:1 Pairing)        │    │  Messages Cooldown)  │   │
│  └──────────────────────┘    └──────────────────────┘   │
│  ┌──────────────────────┐    ┌──────────────────────┐   │
│  │ Room Manager         │    │ Ephemeral Session    │   │
│  │ (Community & Class)  │    │ Registry (5m TTL)    │   │
│  └──────────────────────┘    └──────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Project Structure

```text
client/       React application, Vite entry point, and static assets
server/       Express/WebSocket entry point and server-side modules
dist/         Generated production output (not source-controlled)
```

---

## 3. Compatibility Scoring Matrix

When two users queue for 1:1 conversation:
1. **Exact Shared Interest**: +100 points each
2. **Category / Topic Affinity**: +40 points each (e.g. AI + Data Science, Gaming + Music)
3. **Related Semantic Interest**: +20 points each
4. **Shared Profession**: +15 points each (e.g. Developer + Developer)
5. **Complementary Profession**: +10 points (e.g. Designer + Developer, Student + Teacher)

The matchmaker prioritizes highest mutual compatibility while preventing pairings between sessions that previously skipped, blocked, or reported each other.

---

## 4. Pluggable Safety Agent

Every message is inspected before relay:
- **Low Confidence (<0.35)**: Delivered normally.
- **Medium Confidence (0.35 - 0.75)**: Delivered to recipient; warning banner shown to sender.
- **High Confidence (>0.75)**: Message is blocked on server; sender is notified of violation; escalation tally incremented.
- **Escalation Rules**:
  - Violation 1: Blocked message warning.
  - Violation 2: 60-second temporary session mute.
  - Violation 3+: Active match terminated, 5-minute session restriction enforced.

---

## 5. Setup & Deployment

### Local Development
```bash
# Install dependencies from the lockfile
npm ci

# Start Vite dev server (WebSocket engine is attached to the dev server port 3000)
npm run dev
```

### Production Build & Run
```bash
# Compile client assets
npm run build

# Run production standalone server
npm start
```
*Note: No persistent database (PostgreSQL, MongoDB, Redis) is required. All session state is ephemeral and in-memory by architectural mandate.*

When hosting the static client separately (for example, on Netlify), deploy the Node.js WebSocket server on a WebSocket-capable host and set `VITE_WEBSOCKET_URL` in the client build environment to that server's secure `/ws` URL. Without this setting, production builds do not attempt a same-origin WebSocket connection. Local development continues to use the integrated Vite WebSocket server.

The Netlify `_redirects` file serves the React app for direct navigation to client routes. Live matching requires the WebSocket server to be deployed and `VITE_WEBSOCKET_URL` configured; with no relay configured, the app does not fabricate matches and displays matching as unavailable.

### Deploying the live-matching service

The Netlify site is static and cannot host WebSocket connections. To create the companion Node service, open the repository in Render as a Blueprint and deploy the included `render.yaml`. After Render reports the service healthy, copy its public hostname and set this Netlify build environment variable:

```text
VITE_WEBSOCKET_URL=wss://<your-render-service-host>/ws
```

Trigger a new Netlify deploy after saving the variable. The service exposes `/health` for deployment checks and uses the `PORT` provided by its host. Free Render services may sleep while idle, so the first connection after inactivity can take longer.
