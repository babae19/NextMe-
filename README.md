# NextMe

A personal journaling and AI wellbeing MVP. Users record feelings and everyday experiences, review weekly/monthly summaries, complete gentle journal quests, and unlock a one-minute possible-future-self encounter on their birthday.

**Live app:** https://nextme-stgh67.v2.appdeploy.ai/

## Included features

- Account sign-in and user-scoped journal records.
- Daily mood check-ins, conversational journaling and an optional wellbeing guide.
- Editable entries with exclusion controls for AI summaries and birthday reflections.
- Complete journal history loading, search, month/feeling filters and chronological sorting.
- Calendar-week and calendar-month AI summaries with downloads and coverage information.
- Weekly/monthly activity reviews and optional scheduled push reminders.
- Journal quests, milestone badges and an optional daily journaling reminder.
- Birthday-gated, one-minute captions with optional browser speech narration.
- Responsive Sunshine Studio interface with readable type and custom illustrations.

AI guidance is wellbeing support, not professional therapy or a prediction of future events.

## Source layout

- `src/App.tsx`: main navigation, account setup, chat, journal and birthday experience.
- `src/SunshineHome.tsx`: interactive dashboard and week view.
- `src/JournalTasks.tsx`: task progress, milestone badges and daily reminder controls.
- `src/JournalSummary.tsx`: weekly/monthly journal summaries.
- `src/ActivityCheckIn.tsx`: periodic activity reviews and reminder settings.
- `src/index.css`: interface styling, responsive layouts and readability rules.
- `backend/index.ts`: authenticated routes, AI calls, persistence and scheduled handlers.
- `cron.json`: scheduled daily, weekly and monthly notification jobs.
- `public/resources/`: custom sunshine and birthday illustrations.
- `tests/tests.json`: AppDeploy browser workflow test specifications.

## Runtime and development

The frontend uses React 19, TypeScript, Vite, Tailwind CSS and Lucide icons. The backend runs on AppDeploy.

**This is an export of the AppDeploy project source, not a standalone replacement for the AppDeploy runtime.** The platform injects `@appdeploy/client` and `@appdeploy/sdk`; they are intentionally absent from `package.json`. Their authentication, API transport, database, AI, notification and scheduler services must be available for full functionality.

The frontend scripts are:

```bash
npm install
npm run dev
npm run build
```

A plain local checkout does not include the platform-injected SDKs. These scripts require that integration to be provided by the AppDeploy environment; without it, SDK imports will not resolve. Running on a different hosting provider requires implementing compatible replacements for the managed services. This upload does not configure automatic GitHub-to-AppDeploy deployment.

## Reminder schedules

All scheduled notifications require explicit user opt-in and a supported, registered browser/device.

| Job | Schedule |
| --- | --- |
| Daily journal reminder | Every day at 18:00 UTC |
| Weekly activity check-in | Sunday at 18:00 UTC |
| Monthly activity check-in | First day of the month at 18:00 UTC |

18:00 UTC is 6:00 PM in Freetown. Notifications contain generic reminders, never journal text. Downloaded calendar events are managed separately in the user's calendar.

## Privacy and pilot limitations

The repository contains application source and illustration assets, not user journals, account records, secrets or access tokens.

- Server routes scope journal access to the authenticated account.
- Users choose which saved entries may inform AI reflections.
- Chat and included journal content are processed by the managed AI service.
- The pilot is not end-to-end encrypted.
- Account deletion and app-owned legal policies still need completion before a wider launch.
- Summaries disclose source limits and use up to 250 included entries in a selected period.
- Birthday and time zone are fixed after setup in this pilot.
- Voice recording and realistic video avatars are not implemented.
- The chosen next-step card is stored on the current device.

## Validation

The exported workflow specifications are in `tests/tests.json` and run through AppDeploy's test environment; `npm test` is not configured. The latest deployment reported no application frontend/backend/network errors. Sample-mode browser checks covered mood selection, chat, journal saving, summary generation, history filtering and task progress. Scheduled delivery still depends on user permission and device registration.

## Export provenance

- AppDeploy app: `nextme-stgh67`
- Source snapshot: `1793206754658`
- Recovery date: 2026-11-08
- All 21 source/resource paths from the current snapshot have been recovered. Repository maintenance files and package metadata are added separately.

No open-source licence has been added; the repository owner can choose one.

## Repository maintenance

Use Node.js 22 (`nvm use`). Run `npm test` for dependency-free source integrity checks covering scheduled handlers, illustration files, relative imports, and browser scenario metadata. GitHub Actions runs these checks on pushes and pull requests. These checks do not execute the app or replace AppDeploy browser testing.

Dependabot checks npm dependencies and GitHub Actions weekly. Review and validate its pull requests in AppDeploy before merging. Keep secrets and personal journal exports out of GitHub; local environment files are ignored.

### Deployment and recovery

The running app remains managed by AppDeploy (`nextme-stgh67`). Pushing to this repository does **not** deploy it. Deploy source changes through AppDeploy, validate authenticated journal operations and opt-in reminders there, and record the resulting snapshot. Before a release, preserve the previous AppDeploy version so it can be restored if needed. Export subsequent app changes back to GitHub to avoid source drift.

All three PNG illustrations are included under `public/resources/`. Historical app logs reported illustration loading failures and avatar-generation HTTP 503 responses. Repository checks verify the recovered PNG files, but do not establish that live resource delivery or the managed image-generation service has recovered.

### Current verification limits

The source was recovered from the ready AppDeploy deployment on 8 November 2026. Scheduled jobs reported successful last runs. Full local build and TypeScript validation require the real platform SDK integration; no substitute SDK or fake authentication is supplied. Account deletion and legal-policy completion remain release requirements for a wider launch.
