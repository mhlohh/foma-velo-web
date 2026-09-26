# Migrating Foma Velo to Supabase

This app now uses **Supabase (Postgres + Auth + Realtime)** instead of Firebase, and ships with a **Docker** setup for one-command deployment.

---

## Part 1 — Create your Supabase project (your side)

1. **Sign up / log in** at [supabase.com](https://supabase.com) and click **New project**.
2. Pick a name (e.g. `foma-velo`), a strong **database password** (save it), and a region close to your users.
3. Wait ~2 minutes for provisioning.

### 2. Run the schema

1. In the project dashboard open **SQL Editor → New query**.
2. Copy the entire contents of **`supabase/schema.sql`** from this repo and paste it in.
3. Click **Run**. This creates:
   - `public.activities` — one row per workout/ride
   - `public.user_settings` — FTP, LTHR, CTL/ATL windows, setup flag
   - Row Level Security policies (every user only sees their own rows)
   - A `user_settings` row auto-created on signup
   - Realtime enabled on both tables
   - `public.delete_my_data()` helper (GDPR-style wipe)

### 3. Enable Google sign-in

1. Supabase Dashboard → **Authentication → Providers → Google** → enable.
2. You need a Google OAuth client: go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID (Web application)**, and add these redirect URIs:
   - `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` (production)
   - `http://localhost:3000/auth/v1/callback` is **not** needed — the Supabase hosted callback handles it. If you self-host Supabase, use your own domain.
3. Paste the Google **Client ID** and **Client Secret** into the Supabase Google provider settings and save.

### 4. Configure allowed redirect URLs

Supabase Dashboard → **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3000` (dev) and your production URL.
- **Redirect URLs**: add `http://localhost:3000/**` and `https://your-production-domain/**`.

---

## Part 2 — Wire up the app (your side)

1. Copy the env template and fill it in:

   ```bash
   cp .env.example .env
   ```

   | Variable | Where to find it |
   |---|---|
   | `VITE_SUPABASE_URL` | Dashboard → Project Settings → API → Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Dashboard → Project Settings → API → anon public key |
   | `GEMINI_API_KEY` | Optional — only for the AI coach feature ([Google AI Studio](https://aistudio.google.com/apikey)) |

   The `VITE_*` keys are safe to expose in the browser — data access is locked down by Row Level Security.

2. Restart the dev server (`npm run dev`). The app checks for the env vars at startup and shows a clear configuration screen if they're missing.

3. Open the app, click **Sign in with Google**, complete the OAuth flow, pick your thresholds, and you're in.

---

## Part 3 — Migrating existing data (optional)

Data previously stored in Firebase Firestore can be exported as JSON and re-imported.

### Quick path: in-app

If your old data is still in localStorage (the app kept a backup), simply sign in on the same browser — the app pushes local activities up to Supabase automatically on first sync.

### Bulk path: script

1. Export Firestore: `gcloud firestore export gs://your-bucket` or use the Firebase console JSON export of `users/{uid}/activities`.
2. Convert each document to this shape (snake_case → the app handles the rest):

   ```json
   {
     "id": 1727000000000,
     "strava_activity_id": "1234567890",
     "date_millis": 1726000000000,
     "name": "Morning Ride",
     "type": "Ride",
     "moving_time_sec": 3600,
     "elapsed_time_sec": 3900,
     "distance_meters": 34000,
     "elevation_gain_meters": 320,
     "avg_watts": 190,
     "weighted_watts": 205,
     "avg_hr": 140,
     "max_hr": 165,
     "kilojoules": 700,
     "strava_tss": null,
     "is_planned": false,
     "is_manual": false,
     "notes": null
   }
   ```

3. Import via Supabase SQL editor (as the service role, then RLS re-applies per-user on read):

   ```sql
   insert into public.activities (id, user_id, date_millis, name, type, moving_time_sec, elapsed_time_sec, distance_meters, elevation_gain_meters, avg_watts, weighted_watts, avg_hr, max_hr, kilojoules, strava_tss, is_planned, is_manual, notes)
   values (1727000000000, 'AUTH-USER-UUID', 1726000000000, 'Morning Ride', 'Ride', 3600, 3900, 34000, 320, 190, 205, 140, 165, 700, null, false, false, null);
   ```

   Find the `user_id` in **Authentication → Users** after the user has signed in once.

---

## Part 4 — Docker deployment

### Build & run locally

```bash
cp .env.example .env        # fill it in first
docker compose up --build
```

Then open **http://localhost:3000**. The image runs the Express server in production mode: static `dist/` assets + `/api/*` routes.

### Build a standalone image

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your-anon-key \
  -t foma-velo:latest .

docker run -p 3000:3000 \
  -e GEMINI_API_KEY=your-key \
  foma-velo:latest
```

> `VITE_*` values are **baked at build time** (Vite inlines them into the JS bundle) — they are public by design. `GEMINI_API_KEY` is injected at **runtime** only and never leaves the server.

### Deploy to a host

Any container host works:

- **Fly.io**: `fly launch` → `fly deploy` → set `GEMINI_API_KEY` secret with `fly secrets set`.
- **Render / Railway**: point at the repo, Dockerfile is auto-detected, add the env vars in the dashboard.
- **VPS**: `docker compose up -d` behind Caddy/Nginx for TLS. Remember to add your domain to Supabase redirect URLs.

---

## What changed in the codebase

| Before (Firebase) | After (Supabase) |
|---|---|
| `firebase` SDK | `@supabase/supabase-js` |
| `src/lib/firebase.ts` | `src/lib/supabase.ts` |
| `src/lib/firestoreService.ts` (onSnapshot) | `src/lib/supabaseService.ts` (fetch + realtime channels) |
| Firestore subcollections `users/{uid}/activities` | `activities` table with `user_id` + RLS |
| `firebase-applet-config.json` | `.env` (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) |
| `signInWithPopup` | `signInWithOAuth` (redirect flow) |
| `firestore.rules` | RLS policies in `supabase/schema.sql` |

The PMC engine, Strava CSV parser, and all UI logic are unchanged — only the persistence layer moved.
