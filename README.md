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

Copy `.env.example` to `.env` and load it with your hosting provider or run `node --env-file=.env --experimental-strip-types backend/server.ts`.

| Variable | Purpose |
| --- | --- |
| PORT | HTTP port; defaults to 3000 |
| DATABASE_PATH | Persistent SQLite file; defaults to ./data/nextme.sqlite |
| NODE_ENV | Set production behind HTTPS to enable Secure session cookies |
| APP_ORIGIN | Public URL, e.g. https://nextme.example.com; required behind an HTTPS reverse proxy |
| AI_API_KEY | Server-side key for an OpenAI-compatible API |
| AI_BASE_URL | API base URL; defaults to https://api.openai.com/v1 |
| AI_MODEL | Chat model; defaults to gpt-4o-mini |
| AI_IMAGE_MODEL | Image model; defaults to gpt-image-1; provider must return base64 images |

Without an AI key, account and journal features work; AI routes return an unavailable message. Never put server keys in frontend VITE variables. Avatar results remain subject to the existing size limit and may be rejected if too large.

## Deploy anywhere

Build with `npm ci && npm run build`, start with `npm start`, expose port 3000 (or PORT), and attach a persistent volume at `/app/data`. Set DATABASE_PATH to `/app/data/nextme.sqlite`. Use one server instance with SQLite; migrate storage before horizontal scaling. HTTPS and APP_ORIGIN are required for production account security. Dockerfile is included; set runtime configuration through your host. Do not bake secrets into images.

Create regular SQLite backups using SQLite backup tooling, including WAL state consistently; protect backups as private journal data. The database contains password hashes, journal records and session hashes. Do not commit it.

## Features and limits

The existing dashboard, mood tracking, journal editing/history, AI summaries, future-self portrait/chat/avatar and birthday experience are retained. Authentication now uses app-owned email/password accounts with scrypt password hashing, server-side sessions, HttpOnly cookies and origin checks. Sign-in attempts have a per-process IP rate limit. Email verification, password recovery and account deletion are not yet implemented. Emails are identifiers and are not verified.

Scheduled web push is **not configured**. Enabling it reports an explicit error rather than claiming delivery. Calendar downloads remain available. A provider-independent Web Push service and scheduler are needed to restore scheduled notifications.

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
