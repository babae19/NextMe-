# NextMe free Render preview

The `render-free` branch runs on Render Free with no paid disk, no billing card and `DEMO_ONLY=true`. It serves the interactive NextMe sample. Private sign-in, account creation, diary writes and scheduled push are disabled on the server; a frontend banner explains the limit. The temporary SQLite file contains no private account or journal records.

Free web instances can sleep when idle; the first request may take time to start. Browser notifications cannot be guaranteed while the server sleeps. AI API usage is not included by a free hosting plan; this preview uses labelled sample responses.

To enable real accounts without a paid Render disk, connect a separate persistent database and migrate the server persistence, authentication and notification storage before removing DEMO_ONLY. Do not simply enable accounts against /tmp or the ephemeral service filesystem. A connected Supabase organization is available, but the user must choose the organization before a new NextMe project can be created; no other application's database has been changed.

The paid production configuration remains on main. This free preview uses the `render-free` branch and can later be upgraded to a persistent setup deliberately.
