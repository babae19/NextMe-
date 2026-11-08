# NextMe Render deployment

## Prepared configuration

`render.yaml` defines the GitHub repository, main branch, Node 24, a build with frontend/backend type checks, the start command, database-backed health check, automatic deploy after CI, one web instance, and a 1 GB persistent disk. `APP_ORIGIN` uses Render's `RENDER_EXTERNAL_URL` unless a custom domain override is supplied. SIGTERM closes the HTTP server and SQLite cleanly within Render's default shutdown window.

The smallest paid web compute plan is proposed because free instances cannot attach the disk needed to preserve SQLite journals and VAPID keys. Disk-backed deployments have a brief interruption; do not scale this SQLite service to multiple instances.

## Confirmed deployment target

The user supplied `https://dashboard.render.com/project/prj-dbo66fvf3r2c73a9jr60`. Browser sign-in confirmed **NextMe / Production** (`evm-dbo66fvf3r2c73a9jr6g`) in Abdulai's workspace. The environment is empty. A new Node service form is prepared there with the public GitHub source, main branch, build/start commands, health check, runtime variables and a 1 GB disk. The service has not been submitted or created.

Render's form quotes $7/month for 0.5 CPU / 512 MB plus $0.25/month for a 1 GB disk. Applying this recurring charge requires the user's approval. AI credentials must be entered securely through Render; no key is committed. The currently connected deployment credential in this workspace lists only africakonnectinfo-oss repositories, so the public repository URL was selected. Automatic GitHub-triggered deployments must be verified or the babae19 Git provider connection completed after creation; selecting a setting alone does not prove the webhook works.

## Apply once the intended service is identified

1. Confirm its existing Git repository, branch, runtime, disk and database location. Back up existing data before moving a database path or mounting a new disk.
2. Merge the prepared configuration into the linked GitHub branch.
3. Use Render's GitHub integration for repository access and automatic deploys. Link `babae19/NextMe-`, branch `main`.
4. Review the Blueprint plan. Preserve any existing secret environment variables and custom domain settings. Add the AI key through Render's secure Environment page or initial Blueprint prompt, selecting openai or openrouter to match the key.
5. Apply the reviewed configuration and monitor the deploy ID until live. Request `/api/health` and verify account sign-in, journal persistence across a restart, and only then configured AI and opt-in reminders.
6. In the Android preview, tap Connect and enter the final HTTPS URL.

For a new service only, the Blueprint entry point is https://dashboard.render.com/blueprint/new?repo=https://github.com/babae19/NextMe- . This can create paid resources; it is not a link to an already-created NextMe service.

Schema validation is separate from Render account-aware plan validation. Do not claim a live deployment from a valid YAML file alone.
