# Hayloo Privacy Policy & Ephemeral Data Specification

**Hayloo is an accountless, interest-based, text-only conversation platform designed around radical privacy and zero permanent storage.**

---

## 1. Core Privacy Guarantees

1. **No Accounts, No Profiles**:
   - There is no registration, login, username, email, phone number, or password collection.
   - You cannot create a permanent identity, avatar, or profile.
2. **Zero Permanent Conversation History**:
   - Messages are relayed directly between active sessions in memory.
   - As soon as a message is moderated and delivered, it is not stored in any database, disk, log file, or external cloud storage.
   - When a conversation or room ends, message records cease to exist.
3. **No Voice, Video, or Biometrics**:
   - Hayloo is strictly text-based. No camera, microphone, or biometric data is ever accessed, requested, or processed.
4. **No Third-Party Trackers or Ad Networks**:
   - No tracking pixels, Google Analytics, advertising SDKs, or browser fingerprinting scripts.

---

## 2. In-Memory Ephemeral Data Lifecycle

The table below exhaustively details every piece of temporary data stored in server memory and its exact expiration trigger:

| Data Item | Purpose | Storage Medium | Exact Expiration Trigger |
| :--- | :--- | :--- | :--- |
| **Session ID** (`UUIDv4`) | Ephemeral routing identifier for WebSocket connection | In-Memory (Node.js RAM) | Cleared immediately upon WebSocket disconnect or after 5 minutes of total inactivity. |
| **Selected Profession & Interests** | Matchmaking compatibility calculation | In-Memory (Node.js RAM) | Cleared immediately upon session exit or disconnect. |
| **Message Content** | Safety moderation classification and real-time delivery | Transient Memory Buffer | Cleared in milliseconds immediately after classification and relay to the recipient(s). |
| **Safety Violations Counter** | Enforce temporary mute / rate cooldowns within a session | In-Memory (Node.js RAM) | Cleared when temporary restriction expires (60s to 5 mins) or on session disconnect. |
| **Session-Level Separation / Block Flag** | Prevent pairing two sessions after a Skip, Report, or Block | In-Memory (Node.js RAM) | Retained only while both sessions remain connected; purged upon session disconnect. |
| **Rate Limit Counters** (Message / Skip) | Prevent automated spamming and abusive rapid cycling | In-Memory Sliding Window (RAM) | Expire after 30 seconds of rolling inactivity. |
| **Community / Class Room State** | Active participant count and topic metadata | In-Memory (Node.js RAM) | Room is automatically destroyed immediately when participant count reaches zero. |

---

## 3. What Hayloo Cannot Guarantee (Honest Limitations)

- **Session Continuity across Networks**: Because we do not store accounts, refreshing the page or switching networks generates a new ephemeral session.
- **Client-Side Evasion**: Because bans and blocks are session-scoped and in-memory, a bad actor can obtain a fresh session ID by reopening their browser.
- **Recipient Device Privacy**: Once a text message is received by another user, Hayloo cannot control whether that user copies, screenshots, or takes a photo of their own screen. Users should never share personally identifiable information (PII) in chat.

---

*Last Updated: August 2026 — Hayloo Engineering*
