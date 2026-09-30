# Foma Velo — Cycling Performance Management Chart (PMC) & Automated Strava Scraper

**Foma Velo** is a full-stack cycling analytics web application and Dockerized microservice system built with **React 18**, **TypeScript**, **Tailwind CSS v4**, **Framer Motion**, **Express 5**, **Playwright**, **Supabase (Postgres + Auth + Realtime)**, and **Google Gemini AI**.

Instead of manually uploading CSV files, Foma Velo includes a dedicated **Strava Scraper Microservice** (`services/strava-scraper`) that authenticates with Strava, scrapes your complete cycling history (and runs daily via a built-in cron scheduler at `02:00 AM`), normalizes missing sensor data (`null` heart rate or power), and upserts activities into Supabase.

---

## ✨ Key Features

### 1. Coggan Performance Management Chart (PMC)
- **Fitness (CTL)**: 42-day exponentially weighted moving average of daily Training Stress Score (TSS).
- **Fatigue (ATL)**: 7-day exponentially weighted moving average of daily TSS.
- **Form (TSB)**: Readiness balance (`CTL - ATL`) classified into 5 physiological zones (*Overreaching, Productive Training, Maintenance, Race Ready, Transition*).
- **7-Day Ramp Rate**: Rolling weekly CTL progression monitor to prevent overtraining.
- **Multi-Mode TSS Engine (`PmcEngine`)**:
  - **Auto TSS**: Prioritizes Strava Training Load $\rightarrow$ Power TSS (Normalized Power / FTP) $\rightarrow$ Heart Rate trIMP (Avg HR / LTHR) $\rightarrow$ Duration fallback.
  - **Power Mode**: Computes TSS from power data (`avg_watts` / `weighted_watts`).
  - **Heart Rate Mode**: Computes cardiovascular TSS from heart rate (`avg_hr` / `max_hr`).

### 2. Automated Strava Scraper Microservice (`services/strava-scraper`)
- **Full History & Incremental Daily Sync**:
  - **Initial Sync**: Paginates through Strava's `/athlete/training_activities` feed (up to 500 pages / 10,000+ rides) to import your entire account history.
  - **Daily Cron (`0 2 * * *`)**: Automatically wakes up once a day inside Docker, scrapes newly recorded rides, and stops early as soon as it encounters already-synced `strava_activity_id`s.
- **Dual Scraping Engine**:
  - **Authenticated HTTP Fast-Path**: Uses your `_strava4_session` cookie + rotated Rails CSRF tokens for fast, lightweight scraping that bypasses 6-digit email OTP challenges.
  - **Playwright Headless Chromium Fallback**: Full browser automation for session renewal and detail page scraping.
- **Null-Safe Sensor Normalization**:
  - Rides recorded without a Heart Rate monitor (`avg_hr: null`, `max_hr: null`) or without a Power meter (`avg_watts: null`, `weighted_watts: null`, `kilojoules: null`) are preserved cleanly as SQL `NULL` rather than `0` or `NaN`.
- **AES-256-GCM Credential Encryption**:
  - Passwords, session cookies, and tokens are encrypted at rest using `STRAVA_ENCRYPTION_KEY`.

### 3. Interactive Training Calendar & Sticky Telemetry Inspector
- **Monthly Calendar Grid**: High-contrast day cells showing daily total TSS badges and individual ride cards with duration, distance, and TSS.
- **Sticky Right-Hand Inspector Rail**:
  - Stays pinned in the viewport while scrolling down the calendar.
  - **Week Summary View**: Displays weekly CTL, ATL, TSB, total workouts, moving time, distance, and weekly TSS.
  - **Ride Details View (Smooth Motion Transition)**: Clicking any ride card in the calendar smoothly transitions the right-hand card to display full ride telemetry (TSS source, Moving/Elapsed Time, Distance, Average Speed, Elevation Gain, Avg/Normalized/Max Power, Intensity Factor, Avg/Max Heart Rate, Energy Output in kJ, Day CTL/ATL/TSB snapshot, Strava deep link, and workout deletion).

### 4. AI Cycling Coach (Google Gemini)
- Generates structured physiological coaching audits based on your live PMC metrics, recent workout distribution, and target focus areas using Gemini models (`gemini-2.5-flash` with automatic fallback).

### 5. High-Contrast Dual Theme & Collapsible Workspace
- **Pitch-Black Dark Mode**: Pure `#000000` canvas, `#0c0c0e` cards, and `#c8e6c9` sage accents.
- **Minimalist Pure-White Light Mode**: Pure `#ffffff` canvas with crisp `#000000` primary interactive surfaces and WCAG AA/AAA contrast enforcement.
- **Collapsible Sidebar Rail**: Smooth spring-animated sidebar (`228px` expanded $\leftrightarrow$ `60px` icon rail).

---

## 🗂️ Project Architecture

```text
foma-velo-web/
├── Dockerfile                         # Multi-stage production image for Web + API server (:3000)
├── docker-compose.yml                 # Orchestrates foma-velo (:3000) + strava-scraper (:4001)
├── server.ts                          # Express 5 server: static SPA, Gemini AI Coach, & Strava proxy/routes
├── supabase/
│   ├── schema.sql                     # Full database schema + RLS policies (activities, user_settings, strava_connections)
│   └── migrations/
│       └── 002_strava_connections.sql # Incremental migration for Strava scraper connections
├── services/
│   └── strava-scraper/                # Standalone Dockerized Strava Scraper Microservice
│       ├── Dockerfile                 # Playwright v1.51.0-noble container image (:4001)
│       ├── package.json               # Microservice dependencies
│       └── src/
│           ├── index.ts               # Express server + daily cron bootstrap
│           ├── routes.ts              # REST API routes, Supabase upsert, & mock-data cleanup
│           ├── scraper.ts             # HTTP cookie fast-path + Playwright scraper & null-safe parser
│           ├── scheduler.ts           # 5-field cron parser & daily scheduler
│           ├── crypto.ts              # AES-256-GCM encryption/decryption utilities
│           └── test-scraper.ts        # End-to-end test suite (mock server, null HR/power, cron, crypto)
└── src/
    ├── components/
    │   ├── MainScreen.tsx             # Root authenticated workspace, realtime Supabase sync, & state
    │   ├── StravaConnectDialog.tsx    # Modal for Strava cookie/credential setup & Sync Full History
    │   ├── MetricsSummaryCards.tsx    # Top KPI cards (CTL, ATL, TSB, Weekly Volume)
    │   ├── ActivityListItem.tsx       # Expandable ride row in dashboard history
    │   ├── AddWorkoutDialog.tsx       # Manual & future planned workout creator
    │   ├── SettingsDialog.tsx         # FTP, LTHR, Max HR, Weight, & CTL/ATL window settings
    │   ├── TrainingZonesSheet.tsx     # Coggan 7-zone Power & Friel 5-zone HR reference sheet
    │   ├── AiTrainingAnalysisModal.tsx# Gemini AI Coach modal
    │   ├── layout/
    │   │   ├── SideRail.tsx           # Sticky collapsible left navigation rail
    │   │   └── TopNav.tsx             # Sticky top workspace header & theme switcher
    │   └── pages/
    │       ├── LoginPage.tsx          # Supabase email/password & OAuth sign-in
    │       ├── dashboard/
    │       │   ├── DashboardPage.tsx  # Main PMC chart, Time in HR Zones, Duration by Week
    │       │   └── PmcChart.tsx       # Interactive SVG Performance Management Chart
    │       └── calendar/
    │           └── CalendarPage.tsx   # Monthly calendar + sticky Week Summary / Ride Details card
    ├── context/
    │   └── ThemeContext.tsx           # Pitch-Black dark & Pure-White light theme provider
    ├── lib/
    │   ├── supabase.ts                # Supabase browser client initialization
    │   └── supabaseService.ts         # Typed CRUD & Realtime subscriptions for activities & settings
    └── utils/
        ├── pmcEngine.ts               # Coggan CTL/ATL/TSB & multi-mode TSS calculation engine
        ├── storage.ts                 # LocalStorage backup & mock sample activity filter
        └── contrastText.ts            # WCAG contrast luminance helpers
```

---

## 🗄️ Supabase Database Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** in your Supabase Dashboard and run the full schema in [`supabase/schema.sql`](supabase/schema.sql) (or run [`supabase/migrations/002_strava_connections.sql`](supabase/migrations/002_strava_connections.sql) if you already created the base tables).
3. This provisions three tables protected by Row Level Security (RLS):
   - `public.activities`: Stores all scraped Strava rides, manual rides, and planned workouts (`avg_hr`, `max_hr`, `avg_watts`, `max_watts`, `weighted_watts`, `kilojoules`, `strava_tss` are all nullable).
   - `public.user_settings`: Stores per-user physiological thresholds (`ftp`, `lthr`, `max_hr`, `weight_kg`, `calculation_mode`, `ctl_days`, `atl_days`).
   - `public.strava_connections`: Stores encrypted Strava credentials/cookies, `sync_enabled`, `last_sync_at`, `last_sync_status`, and `last_synced_count`.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

| Variable | Required | Description |
| :--- | :---: | :--- |
| `VITE_SUPABASE_URL` | **Yes** | Your Supabase project URL (`https://<project-ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Your Supabase public `anon` key |
| `GEMINI_API_KEY` | **Yes** (for AI Coach) | Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | Supabase `service_role` key for unattended background cron upserts |
| `STRAVA_ENCRYPTION_KEY` | Recommended | Secret passphrase/hex key used for AES-256-GCM credential encryption |
| `SYNC_CRON_SCHEDULE` | Optional | 5-field cron schedule for daily scraping (defaults to `0 2 * * *` — 02:00 AM daily) |
| `STRAVA_SCRAPER_URL` | Optional | URL of the scraper microservice (defaults to `http://127.0.0.1:4001` locally or `http://strava-scraper:4001` in Docker) |

---

## 🚀 Running Locally & With Docker

### Option 1: Docker Compose (Recommended for Production & Daily Cron)

Builds and launches both the **Foma Velo Web App** (`http://localhost:3000`) and the **Strava Scraper Microservice** (`http://localhost:4001`):

```bash
docker compose up --build
```

To run in detached background mode:

```bash
docker compose up -d --build
```

### Option 2: Local Node.js Development

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Start the development server** (serves both the Vite React frontend and Express API + Strava routes on `http://localhost:3000`):
   ```bash
   npm run dev
   ```
3. *(Optional)* **Run the standalone scraper microservice in a second terminal**:
   ```bash
   npm run dev:scraper
   ```

---

## 🔑 Connecting Your Strava Account

To avoid Strava's 6-digit email OTP verification blocking automated logins, use the **Session Cookie (Recommended)** method:

1. Open [strava.com](https://www.strava.com) in your desktop browser and sign in.
2. Open Developer Tools (`Cmd + Option + I` on macOS or `F12` on Windows/Linux) $\rightarrow$ **Application** tab (or **Storage** in Firefox).
3. In the left sidebar, expand **Cookies** $\rightarrow$ `https://www.strava.com`.
4. Locate the cookie named **`_strava4_session`**, double-click its **Value**, and copy it.
5. In **Foma Velo**, click **Strava Auto-Sync** in the top toolbar or left sidebar, paste the `_strava4_session` value, and click **Save & Sync All Strava Rides**.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Web server health check (`{ "status": "ok" }`) |
| `POST` | `/api/ai/analyze-training` | Generates a Gemini AI coaching report from PMC metrics |
| `GET` | `/api/strava/status/:userId` | Returns current Strava connection status, last sync timestamp, and synced ride count |
| `POST` | `/api/strava/connect` | Encrypts and saves Strava session cookie or email/password for a user |
| `POST` | `/api/strava/sync` | Triggers an immediate Strava scrape (`fullHistory: true` by default) and upserts to Supabase |
| `POST` | `/api/strava/sync-all` | Triggers the batch sync job across all users with `sync_enabled = true` |
| `DELETE` | `/api/strava/disconnect/:userId` | Removes stored Strava credentials and disables auto-sync |

---

## 🧪 Testing & Verification

Run the end-to-end Strava Scraper & Null-Sensor test suite (verifies AES-256-GCM encryption, cron schedule matching, full-sensor rides, rides without a heart-rate monitor, rides without a power meter, and non-cycling activity filtering):

```bash
npm run test:scraper
```

Run TypeScript typechecking and production bundle compilation:

```bash
npx tsc --noEmit && npm run build
```

---

## 🌐 Deployment

Because Foma Velo uses Dockerized Node.js + Playwright services alongside Supabase, the recommended deployment platforms are:

1. **Railway.app**: Connect your GitHub repo, deploy the root `Dockerfile` (`foma-velo`) and `services/strava-scraper/Dockerfile` (`strava-scraper`), and set `STRAVA_SCRAPER_URL=http://strava-scraper.railway.internal:4001`.
2. **VPS (Hetzner / DigitalOcean) + Docker Compose / Coolify**: Clone the repository, configure `.env`, and run `docker compose up -d --build` behind Caddy or Coolify for automatic HTTPS.
3. **Google Cloud Run + Cloud Scheduler**: Deploy both containers to Cloud Run and configure Cloud Scheduler (`0 2 * * *`) to `POST /api/strava/sync-all`.
4. **Fly.io**: Deploy using `fly launch` with internal `.internal` service networking.

---

## 🛡️ License

Distributed under the MIT License.
