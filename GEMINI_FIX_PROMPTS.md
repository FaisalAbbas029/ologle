# GEMINI_FIX_PROMPTS.md — Hayloo Gemini Prompt Library

Standalone extract of the Gemini prompt library from the document "Hayloo Audit Report and Gemini Repair Prompts" (audit date 20 Oct 2026). The original document was not modified. Section numbers below match the original document so you can cross-reference.

**Contents:** 22 prompts (SAFE-00, BLD-01, VER-01, SEC-01, SEC-02, SEC-03, PRV-01, ARCH-01, REL-01, PROD-02, PROD-03, A11Y-01, UX-02, PROD-01, UI-01, SEO-01, SEO-02, GROW-01, ANL-01, PERF-01, QA-01, REL-02), the global rules, the closing block, the index, the coverage map, the execution-order rules, the manual-task list, and the master checklist.

> **Scope warning:** this is documentation only. Nothing in here has been run against your project. Gemini's reports can be wrong, so check every result yourself in the preview before approving the next prompt.

---

## HOW TO USE (read this first)

For every prompt, open a **fresh Gemini conversation** and paste three pieces **in this order**:

1. **FIRST:** Section 15, the Exact Global Rules (one code block below).
2. **SECOND:** The prompt body you want (each body is one code block in sections 11, 12 or 18).
3. **THIRD:** Section 16, the Standard Closing Block (one code block below).

Then follow these rules:

- Run prompts **one at a time**, in the order of the master checklist (section 19). Check the "Run notes" line above each prompt for prerequisites.
- Prompts marked **"No"** under Independent edit shared files (`server.ts`, `vite.config.ts`, `App.tsx`, `LandingView.tsx`, etc.). Never run two of them at once.
- VER-01 is **report only**. Gemini must not edit anything until you approve fixes based on its report.
- Commit (or tag) after every prompt so you can roll back.

> **Editor's note on the section 11 intro line:** the original text in section 11 says "assumes you pasted the Global Rules Header (section 10)". Section 10 (the older, shorter header) has been **superseded by section 15** and is intentionally not included here. Always use section 15.

---

## TABLE OF CONTENTS

- [Part A: Copy-ready pieces](#part-a-copy-ready-pieces)
  - [Section 15: Exact Global Rules (paste FIRST)](#section-15-exact-global-rules-paste-first)
  - [Section 16: Standard Closing Block (paste THIRD)](#section-16-standard-closing-block-paste-third)
- [Part B: Order, index and coverage](#part-b-order-index-and-coverage)
  - [Section 7: Prompt execution order (original)](#section-7-prompt-execution-order-original)
  - [Section 17: Prompt index and metadata](#section-17-prompt-index-and-metadata)
  - [Section 17b: Coverage map](#section-17b-coverage-map-every-finding-to-a-prompt)
  - [Section 9: Manual tasks for you (original)](#section-9-manual-tasks-for-you-original)
- [Part C: Prompt bodies (paste SECOND)](#part-c-prompt-bodies-paste-second)
  - Section 11: [BLD-01](#bld-01) · [SEC-01](#sec-01) · [SEC-02](#sec-02) · [SEC-03](#sec-03) · [PRV-01](#prv-01)
  - Section 12: [ARCH-01](#arch-01) · [REL-01](#rel-01) · [A11Y-01](#a11y-01) · [UI-01](#ui-01) · [SEO-01](#seo-01) · [SEO-02](#seo-02) · [GROW-01](#grow-01) · [PERF-01](#perf-01) · [QA-01](#qa-01)
  - Section 18: [SAFE-00](#safe-00) · [VER-01](#ver-01) · [PROD-01](#prod-01) · [PROD-02](#prod-02) · [PROD-03](#prod-03) · [UX-02](#ux-02) · [ANL-01](#anl-01) · [REL-02](#rel-02)
- [Part D: Section 19: Master execution checklist](#part-d-section-19-master-execution-checklist)

---

# PART A: COPY-READY PIECES

## Section 15: Exact Global Rules (paste FIRST)

```
You are working inside the existing Hayloo project. Inspect the real files before editing. Do not create a replacement application, invent file paths, or overwrite the project with a template.

Preserve the existing architecture, working functionality, API contracts, authentication, matching behavior, and established red, black, and white design system unless a specific, justified change is required.

Make targeted changes. Do not introduce production secrets into source code, trust client-supplied permissions, weaken security controls, or perform destructive database migrations without my explicit approval.

Use existing dependencies where practical. Justify additional packages and major upgrades.

Run the actual relevant build, lint, type-check, and test commands. Do not suppress errors to make checks appear successful.

Show the updated website in the existing browser or preview tab if your environment supports it. If it does not, explain the limitation and provide exact local run instructions.

When finished, report changed files, implemented fixes, tests actually executed, their real results, remaining issues, and any manual configuration I must complete.
```

## Section 16: Standard Closing Block (paste THIRD)

```
BROWSER PREVIEW: After the change, run the app (npm run dev for development; for anything about performance, headers, SEO or caching also run npm run build then npm start and test that production build). Open the existing project in the preview/browser tab and show me the affected screens at 375px, 768px and 1440px widths where UI is involved. If your environment cannot show a preview, say so plainly and give exact commands to run it locally. Do not claim the live site changed if it did not.

WORK IN SMALL STEPS: After each logical group of changes run lint, build and the relevant tests, review your own git diff, and report any failure honestly before continuing. Do not edit files unrelated to this task.

COMPLETION REPORT (required): (1) list every changed, added and deleted file; (2) explain what you changed and why; (3) list the exact commands you ran with their real output (pass or fail); (4) state each acceptance criterion as VERIFIED, FAILED or NOT TESTED; (5) list remaining issues and anything you could not verify; (6) list manual steps I must do myself (hosting, credentials, Firebase console, domain, search-engine accounts). Never print secrets or real user data.

ROLLBACK: Before starting, confirm a clean git state or tell me to commit. Work on a new branch. If this task involves dependency changes, rules, or data changes, tell me exactly how to undo them.
```

---

# PART B: ORDER, INDEX AND COVERAGE

## Section 7: Prompt execution order (original)

Run in this order, test and commit after each: **BLD-01 → SEC-01 → SEC-02 → SEC-03 (manual deploy) → PRV-01 → ARCH-01 → REL-01 → A11Y-01 → UI-01 → SEO-01 → SEO-02 → GROW-01 → PERF-01 → QA-01.** BLD-01, SEC-01 and ARCH-01 touch `server.ts`/`vite.config.ts`, so never run them in parallel. SEC-03 and SEO-01 are independent of the rest. UI-01, GROW-01 and SEO-02 all touch `LandingView.tsx` and `App.tsx`: run strictly one at a time.

> **Editor's note (added during extraction, not in the original):** the original section 7 order covers only the first 14 prompts. The 8 prompts added later (SAFE-00, VER-01, PROD-01, PROD-02, PROD-03, UX-02, ANL-01, REL-02) are placed by the prerequisites in the index below and by the groups in the master checklist (section 19). Where the two differ, follow the prerequisites in the index and the checklist order. Start with SAFE-00, then BLD-01.

## Section 17: Prompt index and metadata

Priority: P0 do first, P1 before launch, P2 important, P3 polish. "Independent" means it touches files no other prompt in its stage touches.

| ID | Findings | Priority | Prerequisites | Main files | Independent? | Expected result |
|---|---|---|---|---|---|---|
| SAFE-00 | Stage 0, SEC-I | P0 | none | repo root, `.env`, `.gitignore` | Yes | Backup, baseline, no code change |
| BLD-01 | BLD-A, BLD-B, SEC-I | P0 | SAFE-00 | `package.json`, `tsconfig.json`, `server.ts`, `src/App.tsx` | No (shares `server.ts`) | Clean install, lint, build, start |
| VER-01 | SEC-F, SEC-H, A11Y img alt, SEO-C double h1, matching (not verified) | P0 | BLD-01 | read-only | Yes | Verification report, no edits |
| SEC-01 | SEC-A, SEC-B, SEC-D | P0 | BLD-01 | `server.ts`, `server/geminiService.ts`, `vite.config.ts` | No | Safe limits, headers, compression |
| SEC-02 | SEC-E, SEC-F, SEC-G, SEC-H | P0 | BLD-01, VER-01 | `server.ts`, `server/serverCore.ts`, `haylooSocket.ts` | No (after SEC-01) | Validated, bounded WebSocket engine |
| SEC-03 | SEC-C | P0 | BLD-01 | `firestore.rules`, `userService.ts`, `botFirewall.ts` | Yes | Locked trust fields and metrics (manual deploy) |
| PRV-01 | PRV-A, PRV-B | P1 | SEC-01 | privacy views, `visitorService.ts`, `index.html` | Partly (`index.html`) | Honest privacy story, fewer trackers |
| ARCH-01 | ARCH-A, ARCH-B | P1 | SEC-01, SEC-02 | `vite.config.ts`, `serverCore.ts`, `App.tsx`, `OneToOneChatView.tsx` | No | Shared API, smaller modules |
| REL-01 | REL-A | P1 | SEC-02, ARCH-01 | `server.ts`, `useWebRTC.ts`, `haylooSocket.ts` | No | Health checks, shutdown, TURN config |
| PROD-02 | matching reliability | P1 | VER-01, ARCH-01, REL-01 | `matchmaker.ts`, `serverCore.ts`, `MatchingView.tsx` | No | Reliable queue, skip, reconnect |
| PROD-03 | moderation and abuse | P1 | SEC-02, PRV-01 | `safetyAgent.ts`, block/report modals, `visitorService.ts` | No | Server-enforced block/report |
| A11Y-01 | A11Y-A | P2 | ARCH-01 | modals, `index.css`, `Navbar.tsx` | No | WCAG 2.2 AA fixes |
| UX-02 | empty/loading/error, responsive | P2 | A11Y-01 | many views | No | Recoverable, responsive states |
| PROD-01 | onboarding | P2 | UX-02 | `ModeSelectView`, `ProfessionSelectView`, `InterestSelectView`, `OnboardingView` | No | Clear first-time flow |
| UI-01 | design and animation | P2 | A11Y-01, UX-02 | `index.css`, `LandingView.tsx`, `MatchingView.tsx` | No | Consistent polish and motion |
| SEO-01 | SEO-A, SEO-B | P1 | SEC-01 | `index.html`, `server.ts`, `public/` | Partly | robots, sitemap, metadata, JSON-LD |
| SEO-02 | SEO-C | P2 | SEO-01, UI-01 | `App.tsx`, `LandingView.tsx`, static views | No | Real URLs, noindex for app |
| GROW-01 | growth | P3 | SEO-02, PRV-01 | `SessionSummaryModal.tsx`, `LandingView.tsx` | No | Invite links and share cards |
| ANL-01 | growth measurement | P3 | PRV-01, GROW-01 | new analytics module, `CookieConsentBanner.tsx` | Partly | Privacy-respecting metrics |
| PERF-01 | PERF-A, PERF-B | P2 | UI-01, SEO-02 | `vite.config.ts`, `App.tsx`, `index.html`, fonts | No | Measured speed gains |
| QA-01 | QA-A | P1 (start early) | BLD-01 | new test files | Yes | Tests and `npm run verify` |
| REL-02 | release | P0 at launch | all | whole project | No | Final verification and deploy readiness |

**Run strictly one at a time** (they share files): BLD-01, SEC-01, SEC-02, ARCH-01, REL-01, PROD-02, A11Y-01, UX-02, PROD-01, UI-01, SEO-02, GROW-01, PERF-01. **Can run alongside others:** SAFE-00, VER-01, SEC-03, QA-01 (test files only).

## Section 17b: Coverage map (every finding to a prompt)

SEC-A, SEC-B, SEC-D: SEC-01. SEC-C: SEC-03. SEC-E, SEC-G: SEC-02. SEC-F, SEC-H: VER-01 first, then SEC-02. SEC-I: SAFE-00 and BLD-01. PRV-A, PRV-B: PRV-01. BLD-A, BLD-B: BLD-01. ARCH-A, ARCH-B: ARCH-01. SEO-A, SEO-B: SEO-01. SEO-C: VER-01, then SEO-02. PERF-A, PERF-B: PERF-01. A11Y-A: A11Y-01. REL-A: REL-01. QA-A: QA-01. Matching, moderation, onboarding, empty/error states, analytics and release: PROD-02, PROD-03, PROD-01, UX-02, ANL-01, REL-02 (section 18). Nothing in the audit is left without a prompt.

## Section 9: Manual tasks for you (original)

Deploy Firestore rules (Firebase console or CLI); set `GEMINI_API_KEY` and `APP_URL` in your host's secret manager; confirm the real domain and set HTTPS/HSTS at the host; provide TURN credentials (e.g. a TURN provider); add the site to Google Search Console and Bing Webmaster Tools; decide your real privacy stance (accountless vs sign-in) because it drives PRV-01.

> More manual steps appear inside the prompts themselves (SEC-03: deploy the Firestore rules yourself; REL-01: TURN credentials, host HTTPS, uptime monitoring; SEO-01: Search Console) and in the master checklist (section 19, Group F).

---

# PART C: PROMPT BODIES (paste SECOND)

Each prompt body is in a code block so you can copy it in one click. The "Run notes" line above each block is metadata from section 17 and is **not** part of what you paste.

---

## SECTION 11: Foundation and security

### BLD-01

**Run notes:** Findings BLD-A, BLD-B, SEC-I · Priority P0 · Prerequisite: SAFE-00 · Files: `package.json`, `tsconfig.json`, `server.ts`, `src/App.tsx` · Independent: No (shares `server.ts`) · Expected result: clean install, lint, build, start.

````
PROMPT BLD-01: Fix the build, types and dependencies

**Objective:** Make `npm install`, `npm run lint`, `npm run build` and `npm start` succeed on a clean Linux machine, with no behaviour change.

**Context:** `package.json` (name `react-example`) lists `@rollup/rollup-win32-x64-msvc` as a hard dependency, lists `vite` in both dependencies and devDependencies, and has no `@types/react` or `@types/react-dom`. `lint` is `tsc --noEmit` and currently fails with many TS7006/TS7016 errors in `src/App.tsx` plus one real error at `server/serverCore.ts(494,52)` (`string | undefined` passed as `string`). `server.ts` hard-codes `const PORT = 3000`. A `.env` file exists next to `.env.example`.

**Files to inspect:** `package.json`, `tsconfig.json`, `server.ts`, `server/serverCore.ts` (around line 494), `src/App.tsx`, `.gitignore`, `.env.example`.

**Instructions:**

- Add `@types/react` and `@types/react-dom` matching React 19 as devDependencies. Re-run `npm run lint` and fix remaining errors properly (real types, not `any` casts or `@ts-ignore`).
- Fix the `serverCore.ts` line-494 type error with a proper guard.
- Move `@rollup/rollup-win32-x64-msvc` out of `dependencies` (remove it, or make it an `optionalDependencies` entry) and confirm a clean install works on Linux. Remove the duplicate `vite` entry. Rename the package to `hayloo`.
- Make the server use `process.env.PORT || 3000`.
- Confirm `.env` is git-ignored and `.env.example` contains only placeholders.
- Add a `typecheck` script if it helps, but keep `lint` working.

**Preserve:** all runtime behaviour, scripts that already work (`dev`, `build`, `start`), the esbuild server bundle step.

**Acceptance criteria:** `npm ci` then `npm run lint` exits 0; `npm run build` produces `dist/` and `dist/server.cjs`; `npm start` serves the site on `$PORT`; zero new `any` casts or suppressions added.

**Tests:** run the four commands above and paste the real output. Smoke-test `/` and a WebSocket connection to `/ws`.

**Rollback:** commit before starting; dependency changes are isolated to `package.json` and the lockfile.
````

### SEC-01

**Run notes:** Findings SEC-A, SEC-B, SEC-D · Priority P0 · Prerequisite: BLD-01 · Files: `server.ts`, `server/geminiService.ts`, `vite.config.ts` · Independent: No · Expected result: safe limits, headers, compression.

````
PROMPT SEC-01: Harden the Express server (limits, proxy trust, headers, compression)

**Objective:** Close the rate-limit bypass, protect the paid Gemini endpoints, add modern security headers and compression.

**Context:** `server.ts` rate-limits `/api` per IP using the raw `x-forwarded-for` header (about line 71), which any client can spoof, and the `rateLimits` Map is never pruned. The WebSocket handler (about line 199) also trusts the first XFF value. `express.json({ limit: '25mb' })` applies to all routes. The four Gemini routes (`/api/suggest-icebreaker`, `/api/transcribe-audio`, `/api/translate`, `/api/translate-autodetect`) are unauthenticated. Headers set today: `X-Content-Type-Options`, `X-Frame-Options`, the deprecated `X-XSS-Protection`, and `Referrer-Policy`. There is no CSP, HSTS, or Cross-Origin-Opener-Policy, and no compression. Lighthouse Best Practices scored 58 and flagged exactly these.

**Files to inspect:** `server.ts`, `server/geminiService.ts`, `vite.config.ts` (dev middleware), `index.html` (to know which third-party origins the page loads: Google Fonts, `translate.google.com`, Firebase endpoints, WebSocket).

**Instructions:**

- Configure `app.set('trust proxy', ...)` correctly for the actual host (ask me which hosting platform if you cannot tell; default to 1 hop) and use `req.ip`, never the raw header, for limiting and for the WS IP.
- Replace the hand-rolled limiter with a bounded one: prune expired buckets on an interval, cap map size, and use separate, stricter limits for the AI endpoints than for the rest (for example transcription much lower than translation). Return `429` with `Retry-After`.
- Apply a small JSON limit (for example 100 KB) globally and a larger limit only on `/api/transcribe-audio`, with an enforced maximum audio size and an allow-list of MIME types.
- Validate and cap `targetLanguage`/`sourceLanguage` against the language codes in `src/data/languages.ts`.
- Add a Content-Security-Policy that works with the real origins found above (start with `Content-Security-Policy-Report-Only`, report what breaks, then enforce), HSTS (only when served over HTTPS), `Cross-Origin-Opener-Policy`, `frame-ancestors`, and a `Permissions-Policy` that still allows camera and microphone for this origin. Remove `X-XSS-Protection`.
- Add the `compression` middleware. Serve hashed files in `dist/assets` with `Cache-Control: public, max-age=31536000, immutable` and `index.html` with `no-cache`.
- Return JSON 404 for unknown `/api/*` paths and do not fall through to `index.html` for them.
- Mirror the same validation in the `vite.config.ts` dev middleware by importing shared helpers (see ARCH-01), or note clearly if you defer that.

**Preserve:** the cache layer, response shapes the client expects, the existing `/ws` endpoint behaviour.

**Security:** no stack traces or upstream error text in responses; log details server-side only.

**Acceptance criteria:** a forged `X-Forwarded-For` no longer resets the limit; a 5 MB POST to `/api/translate` gets 413; a 1 MB audio POST is accepted only on the audio route; `curl -I` shows CSP, HSTS (on HTTPS), nosniff, frame protection; the app still loads fonts, Google Translate, Firebase sign-in, WebSocket and camera/mic.

**Tests:** write supertest-style (or equivalent) tests for limits and headers; manually load the site and check the browser console for CSP violations; re-run Lighthouse Best Practices (production build, incognito).

**Rollback:** ship CSP in report-only first; keep the previous middleware in Git history.
````

### SEC-02

**Run notes:** Findings SEC-E, SEC-F, SEC-G, SEC-H · Priority P0 · Prerequisites: BLD-01, VER-01 · Files: `server.ts`, `server/serverCore.ts`, `haylooSocket.ts` · Independent: No (run after SEC-01) · Expected result: validated, bounded WebSocket engine. SEC-F and SEC-H are suspected: verify them (VER-01) before changing.

````
PROMPT SEC-02: Validate WebSocket input and harden session identity

**Objective:** Make the real-time engine safe against malformed, oversized or hostile messages.

**Context:** `server.ts` creates `new WebSocketServer({ server, path: '/ws' })` with no `maxPayload` (the `ws` default is 100 MiB) and no Origin check. `server/serverCore.ts` `processMessage` (about line 357) does `JSON.parse` then switches on `msg.type` with no schema validation. Several handlers call `.trim()` on client fields without a type check (about lines 1098, 1237, 1321, 1342). `handleWebRTCSignal` (about line 896) forwards `signal: any` to the paired partner with no size or shape check. Session and visitor IDs come from `Math.random()` (about lines 284 and 291). The client also contains an `AdminModerationView` while no admin concept exists in `serverCore.ts`.

**Files to inspect:** `server.ts`, `server/serverCore.ts` (all message handlers, `registerSession`, `processMessage`), `server/safetyAgent.ts`, `server/matchmaker.ts`, `src/services/haylooSocket.ts`, `src/App.tsx` (where the admin view is reachable), `src/components/AdminModerationView.tsx`.

**Instructions:**

- Set `maxPayload` (for example 64 KB; allow more only if code-pad content needs it, which is currently sliced to 10,000 chars) and verify the Origin header against an allow-list built from `APP_URL` (permit localhost in dev).
- Add a runtime validator for every `ClientMessage` variant (hand-written type guards or a small schema library; justify any dependency). Reject unknown types, wrong field types, over-long strings and bad enums with an `ERROR` message, and never throw.
- Wrap `processMessage` in try/catch so one bad message cannot crash the process or leave a session half-updated.
- Validate `WEBRTC_SIGNAL`: must be an object with a known `type` (`offer`/`answer`/`candidate` or the shape the client actually sends), size-capped, and only forwarded between currently paired sessions.
- Add per-connection message-rate limiting at the WebSocket layer, in addition to existing chat and skip limits, and close abusive connections.
- Replace `Math.random()` IDs with `crypto.randomUUID()` or `crypto.randomBytes`.
- Determine whether `AdminModerationView` shows real data or is a mock. If it is reachable by ordinary users, gate or remove it from production builds and report what you found. Do not add fake admin auth on the client only.

**Preserve:** message names, matchmaking flow, existing cooldowns, the 5-minute session TTL.

**Acceptance criteria:** a 1 MB frame is rejected and the socket closed; messages with non-string `name`/`question`/`answer` return `ERROR` without throwing; a forged signal from an unpaired session is dropped; cross-origin WebSocket handshakes are refused in production; normal 1:1 chat and video still work.

**Tests:** unit tests for the validators; a script that opens two WebSocket clients, pairs them and exchanges chat, a valid signal and an invalid signal.
````

### SEC-03

**Run notes:** Finding SEC-C · Priority P0 · Prerequisite: BLD-01 · Files: `firestore.rules`, `userService.ts`, `botFirewall.ts` · Independent: Yes · Expected result: locked trust fields and metrics. **Manual step: you must deploy the rules yourself.**

````
PROMPT SEC-03: Tighten Firestore rules (manual deploy required)

**Objective:** Stop clients from tampering with trust data and global metrics.

**Context:** `firestore.rules` is default-deny with owner-scoped `users/{id}`. But `isValidUserProfile` only type-checks `trustScore` and `isHumanVerified`, so a user can write any value to their own document, and `firewallMetrics/{id}` allows **any signed-in user** to `create, update` arbitrary `totalBotChallenges`, `botsBlocked` and `verifiedHumans`. `src/services/userService.ts` reads/writes `firewallMetrics/global` (about lines 158 and 191). Also `securityLogs` allow create with only length checks.

**Files to inspect:** `firestore.rules`, `firebase-blueprint.json`, `src/services/userService.ts`, `src/services/botFirewall.ts`, `src/services/firebase.ts`, `src/components/BotFirewallModal.tsx`, `src/App.tsx` (where trust score and verification are used).

**Instructions:**

- Establish what `trustScore` and `isHumanVerified` actually gate in the app. If nothing server-side depends on them, mark them as informational and either remove them from client-writable fields or lock them: on create require a fixed default, and on update require they are unchanged (`incoming().trustScore == existing().trustScore`).
- Make `firewallMetrics` read-only for clients. If the dashboard needs live numbers, move increments to the Node server using the Firebase Admin SDK (explain the credential requirement) or remove the global counter and compute locally.
- Add a field allow-list to `users` writes (`incoming().keys().hasOnly([...])`), type checks on `interests` elements, and require `uid == request.auth.uid`.
- Add size caps and an allowed `action` list to `securityLogs`.
- Write rule unit tests with the Firebase emulator (`@firebase/rules-unit-testing`).

**Acceptance criteria:** emulator tests prove a user cannot change another user's data, cannot change their own `trustScore`, and cannot write `firewallMetrics`; the app's sign-in and profile flows still work.

**Rollback and manual step:** keep the old rules file in Git. **I must deploy the rules myself** (Firebase console or `firebase deploy --only firestore:rules`); tell me exactly how, and do not claim deployment.
````

### PRV-01

**Run notes:** Findings PRV-A, PRV-B · Priority P1 · Prerequisite: SEC-01 · Files: privacy views, `visitorService.ts`, `index.html` · Independent: Partly (`index.html`) · Expected result: honest privacy story, fewer trackers. Gemini must show you its data table before editing copy.

````
PROMPT PRV-01: Make privacy claims match reality

**Objective:** Remove the contradiction between "accountless, zero logs, zero localStorage" and what the code does, and reduce third-party tracking.

**Context:** README and `index.html` meta describe an accountless, zero-logs platform. The code uses `localStorage` in `OneToOneChatView.tsx`, `useChatTranslation.ts`, `useTheme.ts`, `soundService.ts`, `CookieConsentBanner.tsx` and `visitorService.ts` (which also builds a persistent canvas/hardware fingerprint and a persistent `hayloo_visitor_id`). Firebase Google sign-in stores email in Firestore. `index.html` loads Google Translate through a protocol-relative URL (`//translate.google.com/...`); Lighthouse flagged 3 insecure requests, 26 third-party cookies and an untitled iframe.

**Files to inspect:** `PRIVACY.md`, `README.md`, `src/components/PrivacyView.tsx`, `PrivacyInspectorModal.tsx`, `CookieConsentBanner.tsx`, `TermsView.tsx`, `src/services/visitorService.ts`, `src/services/firebase.ts`, `src/services/userService.ts`, `index.html`.

**Instructions:**

- Produce a table of every piece of data stored or sent (localStorage keys, fingerprint, Firestore fields, server memory, Gemini requests including what text/audio is sent to Google, Google Translate, fonts) and show it to me before editing copy.
- Rewrite the privacy page, README and meta text so every claim is true. Remove or qualify "zero logs" and "zero localStorage" unless the code is changed to make them true. Do not write legal claims you cannot support.
- Make non-essential storage (fingerprint, visitor ID used for blocking) clearly disclosed. Strongly consider dropping the canvas fingerprint or making it opt-in; explain the trade-off for ban-evasion defence.
- Load Google Translate only after an explicit user action, over `https:`, with a `title` on its iframe; or replace it with the existing Gemini translation if that covers the need.
- Make the cookie banner honest: only non-essential items need consent, and "Reject" must be as easy as "Accept".
- State plainly that audio and text sent for translation or transcription go to Google's Gemini API.

**Acceptance criteria:** every storage item appears in the privacy page; no third-party script loads before consent where consent applies; Lighthouse shows no insecure requests; a legal review is recommended (I am not giving legal advice).

**Rollback:** copy changes are low risk; keep fingerprint removal as a clearly named change so it can be reverted.
````

---

## SECTION 12: Architecture, UI, SEO, growth, performance, QA

### ARCH-01

**Run notes:** Findings ARCH-A, ARCH-B · Priority P1 · Prerequisites: SEC-01, SEC-02 · Files: `vite.config.ts`, `serverCore.ts`, `App.tsx`, `OneToOneChatView.tsx` · Independent: No · Expected result: shared API, smaller modules. Do not run in parallel with SEC-01, SEC-02, UI-01.

````
PROMPT ARCH-01: Remove dev/prod API duplication and split the largest files

**Objective:** One implementation of the API handlers used by both dev and production, and smaller, testable modules, with zero behaviour change.

**Context:** `vite.config.ts` re-implements `/api/transcribe-audio`, `/api/translate`, `/api/translate-autodetect` and `/api/suggest-icebreaker` for dev, without the validation, caching or rate limiting in `server.ts`; it also builds its own WebSocket server. Large files: `server/serverCore.ts` (1,420 lines), `src/App.tsx` (1,070), `src/components/OneToOneChatView.tsx` (1,255), `BotFirewallModal.tsx` (597), `ProfessionSelectView.tsx` (556).

**Files to inspect:** those files, `server.ts`, `server/*.ts`, `src/types/index.ts`.

**Instructions:**

- Extract the API routes into a shared module (for example `server/api.ts` exporting an Express router) used by both `server.ts` and the Vite dev plugin (use `server.middlewares.use(router)`), so dev equals prod. Do this after SEC-01 so the hardened version is the one shared.
- Split `serverCore.ts` by responsibility (session registry, 1:1 matching handlers, communities, classrooms, moderation/reporting, WebRTC relay) behind the same public `haylooEngine` interface.
- Split `App.tsx`: move view routing, socket wiring and per-feature state into hooks/context providers. Split `OneToOneChatView.tsx` into message list, composer, translation/subtitle controls and call controls.
- Move shared message types so client and server import the same definitions (check how `src/types/index.ts` and the server types differ).
- Do it in small commits: one extraction at a time, running lint, build and a smoke test after each.

**Preserve:** every user-visible behaviour, message protocol, styling and view names.

**Acceptance criteria:** no file above ~500 lines among the listed ones; dev and prod return identical results for the four API routes; lint and build pass; a manual 1:1 chat, community join and classroom flow still work.

**Tests:** add tests for the extracted pure logic first (queue, scoring, rate windows), then refactor.

**Rollback:** work on a branch; do not merge until smoke tests pass. Do not run in parallel with SEC-01, SEC-02, UI-01.
````

### REL-01

**Run notes:** Finding REL-A · Priority P1 · Prerequisites: SEC-02, ARCH-01 · Files: `server.ts`, `useWebRTC.ts`, `haylooSocket.ts` · Independent: No · Expected result: health checks, shutdown, TURN config. Manual tasks: TURN credentials, host-level HTTPS, uptime monitoring account.

````
PROMPT REL-01: Production reliability and deployment

**Objective:** Make the deployed server observable and survivable.

**Context:** All sessions, queues and rooms live in process memory, so a restart drops every conversation. There is no health endpoint, no graceful shutdown, no structured logging. WebRTC uses only public Google STUN servers (`src/hooks/useWebRTC.ts` lines ~22-26), so calls will fail for users behind symmetric NATs or strict corporate/mobile networks.

**Files to inspect:** `server.ts`, `server/serverCore.ts` (session TTL logic around lines 270-280), `src/hooks/useWebRTC.ts`, `src/components/ConnectionLostView.tsx`, `ConnectionBanner.tsx`, `src/services/haylooSocket.ts`.

**Instructions:**

- Add `/healthz` (process up) and `/readyz` (engine initialised) endpoints; no sensitive data.
- Handle `SIGTERM`/`SIGINT`: stop accepting connections, notify clients with a clear message, close sockets, then exit.
- Add structured logging that never records message content, audio, emails or IPs in plain form; add a global `unhandledRejection`/`uncaughtException` handler that logs and exits cleanly.
- Make ICE servers configurable from environment variables on the server (served via an endpoint) so TURN credentials are never hardcoded in the client bundle; keep the Google STUN list as the fallback. Tell me which TURN provider values I need to supply.
- Check the client reconnect flow: after a dropped socket, the user must see a clear state and be able to re-queue without a refresh.
- Document in the README that in-memory state means single-instance deployment, and what is needed (for example Redis) before scaling horizontally. Do not implement scaling unless I ask.

**Acceptance criteria:** `/healthz` returns 200; killing the process sends users a message instead of a silent drop; with TURN configured a call across two networks connects; no secrets appear in the client bundle (`grep` the `dist/assets` output to prove it).

**Manual tasks for me:** TURN credentials, host-level HTTPS, uptime monitoring account.
````

### A11Y-01

**Run notes:** Finding A11Y-A · Priority P2 · Prerequisite: ARCH-01 · Files: modals, `index.css`, `Navbar.tsx` · Independent: No · Expected result: WCAG 2.2 AA fixes.

````
PROMPT A11Y-01: Accessibility to WCAG 2.2 AA

**Objective:** Fix known issues and verify the rest honestly.

**Context:** Lighthouse Accessibility is 96 with one failure (an `<iframe>` without a title: the Google Translate element in `index.html`). Lighthouse covers only a subset of WCAG. `src` has about 35 `aria-label` usages across 55 components and no `prefers-reduced-motion` rule in `src/index.css`. Dark theme is the default; red `#E60012`/`#D71920` on near-black needs contrast checking. The app has many modals and drawers (`SettingsDrawer`, `ConfirmationModal`, `BlockAndReportModal`, `StartTalkingModal`, `FullSiteSearchModal`).

**Files to inspect:** `index.html`, `src/index.css`, every `*Modal.tsx`, `SettingsDrawer.tsx`, `Navbar.tsx`, `ChatMessageBubble.tsx`, `OneToOneChatView.tsx`, `LandingView.tsx`, `src/components/PasswordInput.tsx`.

**Instructions:**

- Give the Translate iframe (or its replacement) an accessible title.
- For every modal/drawer: `role="dialog"`, `aria-modal`, a labelled heading, focus moved in on open, focus trapped, Escape closes, focus returns to the trigger.
- Ensure every icon-only button has an accessible name; every input has a label; errors are linked with `aria-describedby` and announced.
- Announce new chat messages and match status with a polite live region without spamming screen readers.
- Add global `@media (prefers-reduced-motion: reduce)` rules and make `motion` components respect it.
- Verify visible focus on every interactive element, 24x24 px minimum targets (WCAG 2.2 AA target size), and text contrast 4.5:1 (3:1 for large text). Fix by adjusting tokens, not by redesigning.
- Check `<img>` elements for `alt` (a grep suggests four lack a literal `alt=`; confirm in context).

**Acceptance criteria:** keyboard-only run through landing, onboarding, matching, chat, report and settings with no traps; axe DevTools shows no serious/critical issues; Lighthouse Accessibility stays at 100 on the production build. Report which items you could not test (for example real screen readers).
````

### UI-01

**Run notes:** Growth/visual improvement · Priority P2 · Prerequisites: A11Y-01, UX-02 · Files: `index.css`, `LandingView.tsx`, `MatchingView.tsx` · Independent: No · Expected result: consistent polish and motion. Run after A11Y-01 and ARCH-01, strictly before GROW-01 (shared files).

````
PROMPT UI-01: Professional, animated feel (a consistent motion and polish system)

**Objective:** Make the site feel premium and alive without hurting performance or accessibility.

**Context:** Brand is red/black/white with Plus Jakarta Sans. `motion` (v12) is installed but imported in only 3 files; `src/index.css` has one `@keyframes`; Lighthouse found 4 non-composited animations and a CLS of 0.1, with 20 long tasks. `LandingView.tsx` (634 lines) has `ai-gradient-text` styles and multiple sections; `MatchingView.tsx` and `NoMatchView.tsx` are the waiting states.

**Files to inspect:** `src/index.css`, `LandingView.tsx`, `MatchingView.tsx`, `ModeSelectView.tsx`, `ProfessionSelectView.tsx`, `InterestSelectView.tsx`, `Navbar.tsx`, `ScrollProgressBar.tsx`, `MultimediaShowcaseGrid.tsx`, and the three files that already import `motion`.

**Instructions:**

- Define shared design tokens (spacing, radius, durations 150-400 ms, easing) and a small set of reusable motion variants (fade-up on scroll, stagger lists, button press, card hover lift). Use only `transform` and `opacity`.
- Landing hero: staggered headline reveal, a subtle animated gradient or particle-free glow behind the CTA, an animated "professionals online" style element **only if backed by real data** (do not fake counts).
- Matching screen: an animated radar/orbit that communicates searching, with a clear cancel button and an elapsed-time hint.
- Match found: a short celebratory transition showing shared interests (the app already computes them).
- Page/view transitions through `AnimatePresence`, kept under 250 ms.
- Reserve space for images, fonts and async content to bring CLS well under 0.1; replace the 4 non-composited animations with transform/opacity versions.
- Lazy-load below-the-fold animated sections; pause offscreen animation.
- Everything honours `prefers-reduced-motion` (see A11Y-01).

**Preserve:** palette, typography, layout structure, copy meaning.

**Acceptance criteria:** consistent motion across all primary views; no animation longer than 600 ms for UI feedback; 60 fps on a mid-range phone in the Performance panel; CLS under 0.1 and no new long tasks in a production-build Lighthouse run. Show before/after screenshots at 375, 768 and 1440 px.

**Order:** after A11Y-01 and ARCH-01, strictly before GROW-01 (shared files).
````

### SEO-01

**Run notes:** Findings SEO-A, SEO-B · Priority P1 · Prerequisite: SEC-01 · Files: `index.html`, `server.ts`, `public/` · Independent: Partly · Expected result: robots, sitemap, metadata, JSON-LD. Manual task: Search Console (no ranking or indexing guaranteed).

````
PROMPT SEO-01: robots.txt, sitemap, metadata, social cards, structured data

**Objective:** Fix the Lighthouse SEO failure and add the missing basics.

**Context:** There is no `public/` directory. `server.ts` ends with `app.get('*', ... sendFile(index.html))`, so `/robots.txt` returns HTML (Lighthouse: "robots.txt is not valid, 64 errors"). `index.html` has title, description, keywords, `robots: index, follow`, basic Open Graph (type, site_name, title, description, url `https://heyloo.network`) but **no** `og:image`, Twitter card, canonical, or JSON-LD. The brand is spelled both Hayloo and Heyloo (zip name, favicon comment, domain).

**Files to inspect:** `index.html`, `server.ts`, `vite.config.ts`, `src/App.tsx` (title handling around line 101), `README.md`, `metadata.json`.

**Instructions:**

- Ask me for the final canonical domain and brand spelling; use `APP_URL`/an env var rather than hardcoding if possible.
- Create `public/robots.txt` (allow public pages; `Disallow` for any private/app paths once SEO-02 defines them; `Sitemap:` line) and `public/sitemap.xml` listing only genuinely public pages. Make sure Express serves them as `text/plain`/`application/xml` *before* the SPA fallback, and that unknown file-like paths return a real 404.
- Add canonical, `og:image` (1200x630 branded image, in `public/`), `twitter:card=summary_large_image`, `theme-color`, and a real favicon set (SVG plus PNG/apple-touch) as files.
- Add `WebSite` and `Organization` JSON-LD with only facts that are true (name, URL). No ratings, reviews, addresses or social links you cannot verify.
- Rewrite title and description around the real value proposition (conversations with professionals by profession and interest). Provide 3 options and let me choose. Do not stuff keywords; remove the `keywords` meta (ignored by Google).
- Make sure there is exactly one `<h1>` per view and a logical heading order.

**Acceptance criteria:** `curl -i /robots.txt` is `200 text/plain`; `/sitemap.xml` validates; Lighthouse SEO is 100 on the production build; Rich Results/Schema validator shows no errors; Facebook/LinkedIn/X share previews render the image (use their debuggers).

**Manual tasks for me:** add the site to Google Search Console and submit the sitemap. No ranking or indexing is guaranteed.
````

### SEO-02

**Run notes:** Finding SEO-C · Priority P2 · Prerequisites: SEO-01, UI-01 · Files: `App.tsx`, `LandingView.tsx`, static views · Independent: No · Expected result: real URLs, `noindex` for the app. SEO-C is partly suspected (two `<h1>` may be separate views): verify first (VER-01).

````
PROMPT SEO-02: Real URLs and a few useful public pages

**Objective:** Let search engines and shared links reach distinct pages, while keeping the app itself private.

**Context:** `App.tsx` switches views through state (no `pushState` or hash routing found), so the entire app is one URL, the browser Back button does not behave like a website, and nothing can be indexed beyond `/`. Static views exist: Terms, Privacy, Community Rules, Landing.

**Files to inspect:** `src/App.tsx`, `src/types/index.ts` (`AppView`), `LandingView.tsx`, `TermsView.tsx`, `PrivacyView.tsx`, `CommunityRulesView.tsx`, `NotFoundView.tsx`, `server.ts`.

**Instructions:**

- Add lightweight path routing (History API, or `react-router` if justified) mapping public views to `/`, `/about`, `/privacy`, `/terms`, `/community-rules` and app views under `/app/...`. Back/forward and refresh must work, and unknown paths show `NotFoundView` with a real HTTP 404 (server returns 404 for non-app unknown paths).
- Update per-route `<title>`, description, canonical and `og:*` (at build time or via a small head manager). Consider build-time prerendering of public routes only if client rendering proves insufficient; explain the trade-off first.
- Add `noindex` on `/app/*` and keep authentication/matching/chat out of the sitemap. Private data is protected by access rules, not by `noindex`.
- Propose, but do not auto-generate, a very small number of profession landing pages (for example 3 to 5) that each have unique, truthful copy about a feature that actually exists. No doorway pages, no hundreds of thin pages.

**Acceptance criteria:** each public route has its own title/canonical and loads when opened directly; `/app/*` has `noindex`; Back works; sitemap lists only public URLs.
````

### GROW-01

**Run notes:** Growth · Priority P3 · Prerequisites: SEO-02, PRV-01 · Files: `SessionSummaryModal.tsx`, `LandingView.tsx` · Independent: No · Expected result: invite links and share cards. Improves the chance of sharing; it cannot guarantee virality.

````
PROMPT GROW-01: Shareable, viral-by-design features (only real ones)

**Objective:** Add honest loops that bring new users in from existing ones.

**Context:** The core hook is instant conversations by profession and interest. The app already computes shared interests and affinity (`AffinityBreakdownModal`, `SharedInterestBadgePopover`, `SessionSummaryModal`). There is a floating contact button and newsletter section. `src/utils/tracking.ts` adds UTM parameters to outbound links. There is no invite or share mechanism and no share image.

**Files to inspect:** `SessionSummaryModal.tsx`, `SmartMatchView.tsx`, `AffinityBreakdownModal.tsx`, `LandingView.tsx`, `NewsletterSection.tsx`, `FloatingContactButton.tsx`, `src/utils/tracking.ts`, `server.ts`.

**Instructions:**

- Add an "Invite a colleague" link of the form `/?ref=invite&profession=<slug>` that pre-selects the profession on the landing page. Use the Web Share API where available with a copy-link fallback.
- In the session summary, offer a shareable "my conversation card" (profession and topics, no names, no chat content, no personal data) rendered client-side to an image or via a generated share page. Nothing private may leave the device without an explicit tap.
- Add a branded, per-profession `og:image` strategy (generic first; dynamic only if cheap).
- Add honest social proof only from real, server-verified counts (for example online now); if no reliable number exists, show nothing.
- Add privacy-respecting measurement for the loop (invite link opened, match completed) with no personal data; tell me which analytics tool you chose and why, and what consent it needs (see PRV-01).
- Do not add fake testimonials, fake counters, dark patterns, or auto-posting to social accounts.

**Acceptance criteria:** invite link opens with the profession preselected; share works on mobile and desktop; shared card contains no chat text or identifiers; works with JS-disabled crawlers by serving correct meta.

**Honest note:** this improves the chance of sharing; it cannot guarantee virality.
````

### PERF-01

**Run notes:** Findings PERF-A, PERF-B · Priority P2 · Prerequisites: UI-01, SEO-02 · Files: `vite.config.ts`, `App.tsx`, `index.html`, fonts · Independent: No · Expected result: measured speed gains.

````
PROMPT PERF-01: Real performance work on the production build

**Objective:** Measure properly, then reduce JS, blocking resources and long tasks.

**Context:** The pasted Lighthouse run was incomplete and looks like the dev server (unminified 3.7 MB JS, 7.8 MB total). Production build sizes: `index-*.js` 505 KB, `vendor-firebase` 668 KB, `vendor-react` 223 KB, `vendor-lucide` 35 KB, CSS 105 KB. No `React.lazy`/`Suspense` anywhere; Firebase is bundled up-front although the app is mostly accountless; five Google font families (Inter, JetBrains Mono, Outfit, Plus Jakarta Sans, Syne) are render-blocking (Lighthouse: 1,220 ms savings). Lighthouse also reported 20 long tasks and TBT 4.19 s on the dev run.

**Files to inspect:** `vite.config.ts` (manualChunks), `index.html`, `src/main.tsx`, `src/App.tsx` (45 imports), `src/services/firebase.ts`, `src/services/userService.ts`, `src/index.css`.

**Instructions:**

- First: run `npm run build && npm start`, then Lighthouse (mobile, incognito, no extensions) three times and report the median LCP, TBT, CLS and the Performance score. Save the baseline.
- Lazy-load every non-landing view and modal with `React.lazy` and `Suspense` with a skeleton fallback; prefetch the likely next step (for example profession select after the landing CTA).
- Load Firebase only when the user chooses sign-in (dynamic `import()`), so it leaves the initial bundle.
- Reduce fonts to what is used (likely 2 families), self-host WOFF2 subsets with `font-display: swap` and `preload` for the heading font; remove unused families.
- Confirm compression and immutable caching are active (SEC-01) and that Google Translate does not load at startup (PRV-01).
- Move heavy work off the main thread or split it (large data files `professionsData.ts`, `professionInterests.ts`, `countriesData.ts` should be loaded on demand).
- Check `useWebRTC` and speech hooks for work running before the user needs it.
- Re-measure and report before/after. Do not remove features.

**Targets** (real-user, 75th percentile; lab numbers are only an estimate): LCP 2.5 s or less, INP 200 ms or less, CLS 0.1 or less.

**Acceptance criteria:** initial JS under roughly 250 KB gzip; Lighthouse Performance 90+ on mobile lab conditions (state clearly if not reached and why); no features removed.
````

### QA-01

**Run notes:** Finding QA-A · Priority P1 (start early) · Prerequisite: BLD-01 · Files: new test files · Independent: Yes · Expected result: tests and `npm run verify`.

````
PROMPT QA-01: Automated tests and a release gate

**Objective:** Stop regressions during the repair work.

**Context:** The project contains no tests and no test runner. Critical pure logic lives in `server/matchmaker.ts` (scoring, queue), `server/safetyAgent.ts` (regex tiers), and `serverCore.ts` (rate windows, cooldowns, reports).

**Instructions:**

- Add Vitest (or the runner that best fits Vite) and write unit tests for matchmaker scoring (exact interest +100, category +40, related +20, shared profession +15, complementary +10, per README), queue behaviour (no self-match, blocked users never paired, cancel/skip), safety-agent tiers, and message validators (SEC-02).
- Add integration tests: two WebSocket clients pair, chat, skip, report; oversized and malformed frames; forged signal; API rate-limit and size limits.
- Add Playwright end-to-end tests for: landing loads; choose profession and interests; get matched (use two browser contexts); send a message; block/report; refresh keeps the app usable; unknown path shows 404.
- Add axe checks in Playwright for landing and chat, plus a test that fetches `/robots.txt` and `/sitemap.xml`.
- Add one `npm run verify` script: lint, tests, build.

**Acceptance criteria:** `npm run verify` passes from a clean checkout; the report lists exactly what is covered and what is not. Do not mark an unimplemented feature as tested.

**Matching quality is Not verified in this audit.** Ask Gemini to read `matchmaker.ts` fully and report any bugs it finds as a separate list before changing anything.
````

---

## SECTION 18: Additional prompts

### SAFE-00

**Run notes:** Stage 0, SEC-I · Priority P0 · Prerequisite: none · Files: repo root, `.env`, `.gitignore` · Independent: Yes · Expected result: backup, baseline, no code change. **Run this first.**

````
PROMPT SAFE-00: Backup and baseline (no code changes)

**Objective:** Create a safe restore point and a measured starting state before any repair.

**Audit evidence:** Stage 0. The uploaded zip contained `node_modules` (370 MB), a stale `dist/` build, a `.env` file (placeholder value only), and a `scratch/` folder. `.gitignore` already lists `node_modules/`, `dist/`, and `.env*` (except `.env.example`).

**Files to inspect:** project root, `.gitignore`, `.env`, `.env.example`, `scratch/`, `package.json`.

**Steps:**

- Confirm whether the project is a Git repository; if not, run `git init`, make the first commit, and create a tag `pre-repair-baseline`. Never commit `.env` or `node_modules`.
- Create a clean archive of the source excluding `node_modules`, `dist` and `.env`.
- Record a baseline: Node version, `npm ci` result, `npm run lint` output (expected to fail, record the error count), `npm run build` result, `npm audit` summary (counts by severity only).
- List `scratch/` contents and tell me whether anything there is needed. Do not delete it.
- Screenshot or describe the working flows: landing, profession select, interest select, matching, 1:1 chat, community room, classroom, settings.

**Preserve:** everything. This task changes no source files.

**Acceptance:** tag exists; baseline file `docs/baseline.md` records the real command outputs; no secrets in the commit history (`git log -p` check for `GEMINI_API_KEY` values).

**Rollback:** `git checkout pre-repair-baseline`.
````

### VER-01

**Run notes:** Findings SEC-F, SEC-H, A11Y img alt, SEO-C double h1, matching (not verified) · Priority P0 · Prerequisite: BLD-01 · Files: read-only · Independent: Yes · Expected result: verification report, **no edits**. You must review the report and approve fixes before SEC-02, PROD-02, PROD-03.

````
PROMPT VER-01: Verify the suspected items (report only, no edits)

**Objective:** Turn the audit's "suspected" and "not verified" items into confirmed facts before anything is changed.

**Audit evidence:** SEC-F (client fields are `.trim()`-ed without type checks at about `serverCore.ts` lines 1098, 1237, 1321, 1342; unknown whether `processMessage` has try/catch around the switch). SEC-H (`AdminModerationView` exists; no admin concept found in `serverCore.ts`). Image alt text (a grep found 4 `<img>` lines with no literal `alt=`; JSX may span lines). SEO-C (`LandingView.tsx` has `<h1>` at lines 173 and 279; may be separate views). Matching quality (`server/matchmaker.ts`, 523 lines) was not read in depth. `safetyAgent.ts` rules were not reviewed.

**Files to inspect:** `server/serverCore.ts`, `server/matchmaker.ts`, `server/safetyAgent.ts`, `src/components/AdminModerationView.tsx`, `src/App.tsx`, `src/components/LandingView.tsx`, every `<img>` in `src`.

**Steps:** For each item, answer CONFIRMED BUG, NOT A BUG, or CANNOT TELL, citing file and line numbers, and for confirmed bugs give a minimal reproduction (for example, a WebSocket message that throws). Read `matchmaker.ts` completely and list any logic errors, race conditions, or cases where two users could be paired twice or paired with someone they blocked. Read the `safetyAgent.ts` patterns and list obvious false-positive or bypass risks. Check how `AdminModerationView` is reached and whether it renders real data.

**Rules:** Edit nothing. Output a report only.

**Acceptance:** every listed item has a verdict with evidence. I will then approve the fixes in SEC-02, PROD-02, PROD-03.
````

### PROD-01

**Run notes:** Onboarding · Priority P2 · Prerequisite: UX-02 · Files: `ModeSelectView`, `ProfessionSelectView`, `InterestSelectView`, `OnboardingView` · Independent: No · Expected result: clear first-time flow.

````
PROMPT PROD-01: Clear onboarding and profession/interest selection

**Objective:** Make first-time use obvious and fast without changing what the app matches on.

**Audit evidence:** Selection flow spans `ModeSelectView.tsx` (461 lines), `ProfessionSelectView.tsx` (556), `InterestSelectView.tsx` (334), `OnboardingView.tsx`, `DynamicProfessionInterestEngine.tsx` (418), with data in `src/data/professionsData.ts`, `professionInterests.ts`, `interestExplanations.ts`. Matching scores on exact interest (+100), category affinity (+40), related interest (+20), shared profession (+15), complementary profession (+10).

**Steps:**

- Inspect the real flow in the browser and write down every step, click count and dead end before changing anything.
- Add a visible progress indicator (for example step 1 of 3), a back button that preserves choices, and clear primary actions.
- Make profession and interest lists searchable and keyboard-operable, with sensible limits (explain the existing limit of 50 interests in Firestore rules, if relevant) and a visible selected count.
- Add a one-line explanation of why interests matter, reusing `interestExplanations.ts` where it exists. Offer a quick-start option (pick a profession, get suggested interests).
- First-time help: a short, dismissible orientation about what to expect (matching, skipping, safety rules) that links to `CommunityRulesView`.
- Validate inputs with friendly inline errors; never lose the user's selections on error.
- Make it work one-handed on a 375px phone.

**Preserve:** data shapes sent to the server, matching scoring, existing data files, brand styling.

**Acceptance:** a new user can reach matching in 3 screens or fewer; all steps keyboard-usable; no choices lost on back/refresh within a session; mobile layout has no horizontal scroll.

**Tests:** component tests for selection limits and back behavior; Playwright run of the full flow.
````

### PROD-02

**Run notes:** Matching reliability · Priority P1 · Prerequisites: VER-01, ARCH-01, REL-01 · Files: `matchmaker.ts`, `serverCore.ts`, `MatchingView.tsx` · Independent: No · Expected result: reliable queue, skip, reconnect. The reconnect behavior is a hypothesis: Gemini must confirm it by test first.

````
PROMPT PROD-02: Matching, queue, skip and reconnection reliability

**Objective:** Make pairing correct and the waiting experience honest and recoverable.

**Audit evidence:** Pairing happens in `serverCore.ts` (`pairSessions`, about line 608, which re-enqueues a session if its candidate vanished). `server.ts` calls `haylooEngine.registerSession(ws, undefined, ip)`, so the server never receives an `existingId`, which suggests a reconnecting client gets a new session (confirm; README describes a 5-minute session TTL). Skip and message cooldowns exist. UI states: `MatchingView.tsx`, `NoMatchView.tsx`, `ConnectionLostView.tsx`, `ConnectionBanner.tsx`. Depends on VER-01 findings.

**Steps:**

- Confirm the reconnect behavior by test. If a dropped socket loses the user's queue position, mode and partner without notice, design and implement a safe resume: a server-issued, unguessable resume token (crypto random), short expiry, single use, bound to the same session; never accept a client-chosen session ID.
- Add tests for races: two users matched simultaneously by two events, a partner disconnecting mid-pairing, a blocked pair never matching, a user in the queue twice, cancel while pairing, skip spam.
- Waiting experience: show elapsed time, a cancel button, and after a timeout offer to broaden criteria (clearly say what changes), try again, or join a community room. Never fabricate "X people online".
- Partner disconnect: tell the user clearly, offer re-queue with the same criteria in one click.
- Show cooldown and rate-limit messages with a countdown instead of silent failure.

**Preserve:** scoring weights, existing message protocol (extend, do not rename), privacy (no chat storage).

**Security:** resume tokens must not allow session hijack; add a test that a forged token fails.

**Acceptance:** race tests pass repeatedly (run them 50 times); a Wi-Fi drop and reconnect within the TTL returns the user to a sensible state; no duplicate matches.
````

### PROD-03

**Run notes:** Moderation and abuse · Priority P1 · Prerequisites: SEC-02, PRV-01 · Files: `safetyAgent.ts`, block/report modals, `visitorService.ts` · Independent: No · Expected result: server-enforced block/report.

````
PROMPT PROD-03: Blocking, reporting and abuse prevention

**Objective:** Make safety controls enforceable on the server and honest to users.

**Audit evidence:** README states blocks and cooldowns are session-scoped and can be bypassed by reconnecting. `visitorService.ts` stores `blocked_strangers` in localStorage and a persistent `hayloo_visitor_id`. Server tracks `blockedSessionIds`, `blockedVisitorIds`, `violationCount`, `isMutedUntil`, `isRestrictedUntil`, a 10-minute report rolling window. UI: `BlockAndReportModal.tsx`, `BlockModal.tsx`, `ReportModal.tsx`, `SafetyWarningBanner.tsx`, `RestrictionView.tsx`.

**Steps:**

- Verify how a client-supplied `visitorId` reaches the server. If clients can choose it, treat it as untrusted: a client can clear storage and change it. Document the real strength of the block and say so in the UI text.
- Make sure block and report decisions are enforced server-side (pairing filter, message routing) and cannot be undone by a client message.
- Report flow: categories, optional details with length limit, confirmation, and the user is moved away from the reported person immediately. Rate-limit reports to stop report abuse.
- Escalation: define thresholds in one config object (mute, restrict) with tests. Keep the existing fail-toward-delivery policy unless I change it.
- Never store chat content in reports unless the user explicitly submits it, and say exactly what is kept and for how long (align with PRV-01).
- Review `safetyAgent.ts` for unsafe false positives; add tests for both blocked and allowed phrases.

**Preserve:** existing cooldown behaviour and UI styling.

**Acceptance:** a blocked user is never re-paired in tests; spamming reports hits a limit; UI copy matches real behavior; the README limitation text is still accurate or updated.
````

### UX-02

**Run notes:** Empty/loading/error states, responsive · Priority P2 · Prerequisite: A11Y-01 · Files: many views · Independent: No · Expected result: recoverable, responsive states. Error-boundary presence is unverified: Gemini must check first.

````
PROMPT UX-02: Empty, loading and error states, plus responsive behavior

**Objective:** Every screen explains what is happening and how to recover.

**Audit evidence:** Lighthouse CLS 0.1 and 20 long tasks (dev run). Views for failure states exist (`NoMatchView`, `ConnectionLostView`, `NotFoundView`, `RestrictionView`); whether the app has a React error boundary was not verified. `VideoRoomView.tsx` and `useWebRTC.ts` handle camera/microphone.

**Steps:**

- Check for an error boundary; if missing, add one with a friendly recovery screen (reload, go home) that never shows stack traces.
- Camera/microphone: handle denied, no device, device busy, and unsupported browser with a specific message and instructions; let users continue in text.
- Add skeleton/loading states for lazy content and AI features (translation, transcription, icebreaker), with timeouts and retry.
- Every Gemini-backed feature must fail gracefully (the server already returns generic errors); show a short message, keep the app usable.
- Test layouts at 360, 375, 768, 1024, 1440 px; fix horizontal overflow, tap targets under 44px for primary actions, iOS safe areas, virtual keyboard covering the chat composer.
- Empty states for community and classroom lists.

**Preserve:** existing copy tone, brand, flows.

**Acceptance:** no unhandled error shows a blank page; denying camera still allows text chat; no horizontal scroll at any listed width; chat input stays visible with the mobile keyboard open.
````

### ANL-01

**Run notes:** Growth measurement (optional) · Priority P3 · Prerequisites: PRV-01, GROW-01 · Files: new analytics module, `CookieConsentBanner.tsx` · Independent: Partly · Expected result: privacy-respecting metrics. Gemini must let you choose the tool before building.

````
PROMPT ANL-01: Privacy-respecting measurement (only if you want analytics)

**Objective:** Measure growth without personal data.

**Audit evidence:** `measurementId` in `firebase-applet-config.json` is empty; there is no analytics today; `src/utils/tracking.ts` only appends UTM parameters to outbound links; cookie banner exists. 26 third-party cookies were reported in Lighthouse.

**Steps:**

- Recommend one option (cookieless and self-hosted or privacy-focused, or simple server-side counters) with a short trade-off table and let me choose before building.
- Events only: landing view, CTA click, profession selected, match started, match completed, invite link opened, share clicked. No chat text, no profession combinations that could identify a person, no IP storage, no fingerprint reuse.
- Gate any non-essential tracker behind the consent choice built in PRV-01; the default must be off where consent applies.
- Provide a simple way to read the numbers (a dashboard or exported report).

**Acceptance:** network tab shows no analytics call before consent where required; events contain no personal data; privacy page lists the tool.
````

### REL-02

**Run notes:** Release · Priority P0 at launch · Prerequisites: all · Files: whole project · Independent: No · Expected result: final verification and deploy readiness.

````
PROMPT REL-02: Release verification

**Objective:** A final evidence-based go/no-go.

**Steps:** On a fresh clone: `npm ci`, `npm run verify` (QA-01), production build and start. Then check, with real output: security headers via `curl -I`; `/robots.txt`, `/sitemap.xml`, `/healthz`; WebSocket origin refusal; rate-limit behavior with a forged `X-Forwarded-For`; Firestore rules emulator tests; Lighthouse mobile (median of 3, incognito, production build); axe results; a manual two-browser chat and video test across two networks with TURN; `grep` of `dist/assets` for secrets; `npm audit` summary. Produce a table: item, VERIFIED PASS / VERIFIED FAIL / NOT TESTED / BLOCKED, with evidence. Do not mark anything passed without output.

**Acceptance:** zero VERIFIED FAIL on P0/P1 items; every NOT TESTED or BLOCKED item is listed for me with who must do it.
````

---

# PART D: SECTION 19: MASTER EXECUTION CHECKLIST

Tick each box only after the Completion Report shows real passing output. Commit and tag after each group.

**Group A: Safety and foundation**

- [ ] SAFE-00 done; tag `pre-repair-baseline` exists.
- [ ] BLD-01: `npm ci`, `npm run lint`, `npm run build`, `npm start` all pass.
- [ ] VER-01 report reviewed; I approved the confirmed fixes.
- [ ] QA-01 started: test runner and the first unit tests exist (keep adding tests after every later prompt).

**Group B: Security and privacy (do not skip)**

- [ ] SEC-01 done; forged `X-Forwarded-For` test passes; headers present; no CSP violations in console.
- [ ] SEC-02 done; oversized, malformed and forged-signal tests pass.
- [ ] SEC-03 done; emulator tests pass; **I deployed the rules myself** and verified in the Firebase console.
- [ ] PRV-01 done; privacy page matches the data table; Translate loads only after action.
- [ ] Rotate any real key that was ever committed or shared (the zip held a placeholder only, so rotate only if you used a real key anywhere public).

**Group C: Architecture and core product**

- [ ] ARCH-01 done; dev and prod behave the same; big files split.
- [ ] REL-01 done; `/healthz` works; TURN credentials supplied and a cross-network call succeeded.
- [ ] PROD-02 done; race tests pass 50 runs.
- [ ] PROD-03 done; block and report enforced on the server.

**Group D: Experience**

- [ ] A11Y-01 done; keyboard-only pass and axe clean.
- [ ] UX-02 done; error boundary, camera-denied flow and mobile layouts verified.
- [ ] PROD-01 done; new user reaches matching in 3 screens or fewer.
- [ ] UI-01 done; screenshots at 375/768/1440; reduced-motion respected.

**Group E: Discoverability and growth**

- [ ] SEO-01 done; robots, sitemap, share image, JSON-LD valid.
- [ ] SEO-02 done; real URLs, 404s, `noindex` on `/app/*`.
- [ ] GROW-01 done; invite link and share card leak no chat or personal data.
- [ ] ANL-01 done (optional); consent respected.

**Group F: Performance and launch**

- [ ] PERF-01 done; baseline and after numbers recorded from the production build.
- [ ] REL-02 verification table has no VERIFIED FAIL on P0/P1.
- [ ] Hosting: HTTPS on, canonical domain redirect, env vars (`GEMINI_API_KEY`, `APP_URL`, TURN) set in the host secret manager.
- [ ] Submit sitemap to Google Search Console and Bing Webmaster Tools; check coverage after a few days (no indexing or ranking is guaranteed).
- [ ] Monitoring and a rollback plan in place (previous build kept, tag ready).

**Reminder:** Gemini's reports can be wrong. After each prompt, open the preview, click through the main flows yourself, and compare against the baseline from SAFE-00 before approving the next prompt.
