# Hayloo — Privacy-First Accountless Text Conversation Platform

Hayloo is a lightweight, zero-footprint web application for interest-based text conversations. Users specify their profession and interests to get matched with compatible strangers in 1:1 sessions or join interest-based Communities (max 30) and Classrooms.

---

## 1. Technical & Safety Limitations (Phase 2 & 11 Review)

### Matchmaking & Coordination
- **Infrastructure Requirement**: Peer discovery requires a centralized WebSocket signaling service. Two standalone browsers cannot discover or exchange peer state without an intermediary signaling coordinator. Hayloo uses an in-memory Node.js WebSocket engine for this purpose.
- **Production Hosting**: The standalone Node.js server serves both the app and `/ws`. Static hosting providers such as Netlify cannot run that persistent WebSocket engine; host the Node server separately and set `VITE_WEBSOCKET_URL` to its full secure endpoint (for example, `wss://signals.example.com/ws`) in the frontend build environment.

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
For a separate frontend and signaling deployment, set `VITE_WEBSOCKET_URL` to the signaling server's full `/ws` URL before building.

*Note: No persistent database (PostgreSQL, MongoDB, Redis) is required. All session state is ephemeral and in-memory by architectural mandate.*
