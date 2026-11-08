# NextMe

Independent React and Node.js journaling web app. No AppDeploy SDK, account, hosting or injected runtime is required.

## Run

Use Node.js **22.18 or later** (Node 24 recommended).

```sh
npm ci
npm run build
npm start
```

Open http://localhost:3000. Use Sign in to create an account with an email and a password of at least 12 characters. Existing platform accounts are separate and are not automatically imported.

For development run `npm run dev:server` and `npm run dev` in separate terminals. Vite proxies API requests to port 3000.

## Configuration

Copy `.env.example` to `.env`. `npm start` and `npm run dev:server` load it automatically when present. Hosting providers can inject the same variables directly.

| Variable | Purpose |
| --- | --- |
| PORT | HTTP port; defaults to 3000 |
| DATABASE_PATH | Persistent SQLite file; defaults to ./data/nextme.sqlite |
| NODE_ENV | Set production behind HTTPS to enable Secure session cookies |
| APP_ORIGIN | Public URL, e.g. https://nextme.example.com; required behind an HTTPS reverse proxy |
| AI_PROVIDER | `openai` or `openrouter`; defaults to openai |
| AI_API_KEY | Server-side key for the selected AI provider |
| AI_BASE_URL | Optional endpoint override; defaults to the selected provider endpoint |
| AI_MODEL | Defaults to gpt-4o-mini (OpenAI) or openai/gpt-4o-mini (OpenRouter) |
| AI_IMAGE_PROVIDER / AI_IMAGE_API_KEY / AI_IMAGE_BASE_URL | Optional separate image provider and credentials |
| AI_IMAGE_MODEL | Defaults to gpt-image-1 or openai/gpt-image-1; base64 raster output required |
| VAPID_SUBJECT | Optional real HTTPS contact URL or mailto address; defaults to HTTPS APP_ORIGIN |
| API_CONTACT_EMAIL | Optional developer contact header for Open Library |

Without an AI key, account and journal features work; AI routes return an unavailable message. Never put server keys in frontend VITE variables. Generated avatars up to 8 MB of encoded data can be saved; larger results return a retry message.

## Deploy anywhere

Build with `npm ci && npm run build`, start with `npm start`, expose port 3000 (or PORT), and attach a persistent volume at `/app/data`. Set DATABASE_PATH to `/app/data/nextme.sqlite`. Use one server instance with SQLite; migrate storage before horizontal scaling. HTTPS and APP_ORIGIN are required for production account security. Dockerfile is included; set runtime configuration through your host. Do not bake secrets into images.

Create regular SQLite backups using SQLite backup tooling, including WAL state consistently; protect backups as private journal data. The database contains password hashes, journal records and session hashes. Do not commit it.

## Features and limits

The existing dashboard, mood tracking, journal editing/history, AI summaries, future-self portrait/chat/avatar and birthday experience are retained. Authentication now uses app-owned email/password accounts with scrypt password hashing, server-side sessions, HttpOnly cookies and origin checks. Sign-in attempts have a per-process IP rate limit. Email verification, password recovery and account deletion are not yet implemented. Emails are identifiers and are not verified.

Standard browser Web Push is integrated. Users explicitly enable browser permission and daily/weekly/monthly schedules. VAPID keys are generated once and persisted in SQLite. The server checks due reminders each minute while running. Daily: 18:00 UTC; weekly: Sunday 18:00 UTC; monthly: first day at 18:00 UTC. Notifications contain only generic text, not diaries or goal titles. Production requires an always-running server, persistent database, HTTPS and APP_ORIGIN. iOS/iPadOS users must add the app to their Home Screen. Delivery is subject to browser support, device conditions and push-service availability. Calendar reminders remain an alternative.

Existing hosted journals and users are **not copied** from the old service by this code migration. Export and verify existing user data before shutting down the old deployment. This repository contains code and illustrations, not hosted journal records. Keep the old app available until migration and replacement hosting are verified.

AI processing sends selected journal content to the configured AI provider. Data is not end-to-end encrypted. Complete privacy/legal policies and account recovery/deletion before a public launch.

## Validate

```sh
npm test
npm run typecheck
npm run build
```

Tests exercise real HTTP account creation/login/logout, authenticated journal persistence, account isolation and cross-origin rejection with an in-memory SQLite database. AI integration and scheduled delivery require separately configured services and live verification.

## Personal experience

The Today screen now includes Reflect, Unwind and Celebrate prompts, a one-minute pause with pause/reset controls, and a “Make it mine” panel. Users can choose gentle, playful or direct language, sunshine/ocean/rose colours and quiet movement. Preferences are stored in this browser, are shared by accounts using that browser, and do not sync across devices. Tone is passed to the live chat endpoint; sample responses remain labelled as samples. Low or difficult moods receive a neutral invitation rather than a humour prompt. Prompt cards preserve an existing draft and never send automatically.

These features are a design-thinking prototype based on the needs of starting easily, choosing the right support and keeping control. They have not yet been validated through user interviews or usability sessions. Next validation should cover first-time journaling, low-mood check-ins, accessibility and shared-device preferences.

## Diary-based future self and life goals

Future Me has a private life-goal planner with title, reason, optional target date, next action and active/paused/completed status. Up to ten goals are saved per account. The persona, everyday future-self chat and journal-inspired avatar use current goals and selected included diaries. Appearance is chosen by the user, never inferred from diary text. Rebuild the persona after changing goals; each chat request rechecks inclusion and reads current goals.

The annual birthday meeting unlocks on the saved birthday in the profile time zone (29 February uses 28 February in non-leap years). It is a **five-minute interactive meeting**, with a personalised opening, text chat, optional browser narration and the saved symbolic avatar. The server starts its 300-second clock after successful generation; reload and narration pause do not extend it. The user can resume an active meeting or use everyday chat after it ends. The annual limit is enforced on the backend. No live video calling is implied.

Journal opens on Monthly advice & plan. Choose a month and create a personalised report with dated diary evidence, goal progress, next-month recommendations, obstacles, practical next actions and a measurable review. Reports are generated on request, not automatically sent. The latest 250 included entries in the selected month are used; partial coverage and shortened excerpts are disclosed. Birthday meetings use up to 2,000 included entries across history. AI/API configuration and independent deployment are still required for live generation. Automated tests use a stub AI response to verify source selection and access rules without transmitting journals to a provider.

## Public API review and integrations

Reviewed the public-apis/public-apis directory and provider documentation. The directory is a discovery list, not an availability guarantee or a source of API credentials.

| Service | NextMe use | Setup / verification |
| --- | --- | --- |
| OpenRouter | Optional AI text for diary reflection, future-self chat and monthly plans; image generation for avatars | Set AI_PROVIDER=openrouter and AI_API_KEY to your OpenRouter key. Provider model defaults are selected automatically unless overridden. Adapter tested with mocked responses; live paid generation is not verified. |
| OpenAI-compatible existing adapter | Existing AI option retained with separate image settings | Needs owner-supplied credentials and provider credit. No automatic paid fallback. |
| Open Library | Optional book discovery by a user-selected generic topic | Keyless; live endpoint returned valid data during verification. Six-hour shared topic cache, one request per second, three results. No diaries, goal titles or account IDs sent. |
| Standard Web Push | Opt-in daily, weekly and monthly generic reminders | No OneSignal account needed. Authenticated subscriptions, host validation, at most ten devices per account, persisted VAPID keys, bounded retries and expired-subscription removal. Transport is unit-tested with a fake sender; real browser delivery remains to be verified on HTTPS. |

OpenRouter text endpoint: https://openrouter.ai/api/v1/chat/completions. Its image adapter uses the documented https://openrouter.ai/api/v1/images endpoint and validates raster base64 results. The provider can change model availability, prices and eligibility. No free-tier or unlimited-use guarantee is made. Journals selected for AI are sent only to the server-configured AI provider under existing user consent; random public quote/advice services are not used as personalised advice.

The Future Me page includes learning resources and an authenticated service-status panel. Status reports configuration only, not a live credit or availability check; it never returns keys. Failed book discovery does not block journaling. Saving weekly/monthly schedules without a registered browser still supports in-app reminders. Device registration is removed from the current account on normal sign-out.

SQLite now stores encrypted-push subscription credentials and a private VAPID key. Include these in protected backups and never rotate the key casually: existing devices would need re-registration. Run only one scheduler instance for this SQLite deployment. On transient push failures the server retries twice at five-minute intervals, then moves to the next scheduled occurrence. Push services are allowlisted to reduce SSRF risk; unsupported browser push hosts require explicit review before addition.

Provider references: https://github.com/public-apis/public-apis, https://openrouter.ai/docs/quickstart, https://openrouter.ai/docs/guides/overview/multimodal/image-generation, https://openlibrary.org/developers/api, https://openlibrary.org/dev/docs/api/search, https://github.com/web-push-libs/web-push.
