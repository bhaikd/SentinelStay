# SentinelStay

SentinelStay is a real-time emergency response platform built for hospitality and corporate environments. It connects guests in distress with rapid response teams, provides a centralized command center for dispatchers, and ensures robust real-time communication during critical incidents.

## 🌟 Key Features

- **Guest SOS Portal & Chat** – frictionless way for guests to trigger SOS alerts and stay in touch with staff during emergencies.
- **Centralized Command Center** – live floor plans, incident timelines, guest roster, and dispatch.
- **Staff & Responder Portals** – dedicated interfaces for on-ground staff and responders.
- **Corporate & Analytics Dashboards** – KPIs, response times, severity distribution.
- **Real-Time Sync** – Supabase Realtime drives instant cross-client updates.
- **AI Summaries** – streamed Gemini-powered incident summaries with rate limiting (mock fallback if no key).
- **Role-Based Access** – Postgres RLS keyed off an `app_role` enum (`guest`, `staff`, `responder`, `dispatcher`, `admin`).
- **Drill / Simulation Mode** – generate synthetic incidents for training & demos.

## 🛠️ Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind v4, Framer Motion, Lucide, Recharts
- **State**: Zustand
- **Backend**: Supabase (Postgres, Realtime, Auth) + Vercel Edge Functions
- **AI**: Google Gemini (`@google/generative-ai`)

## 🚀 Getting Started

### Prerequisites

- Node.js **18+**
- A Supabase project
- (Optional) A Gemini API key for live AI summaries — without it, the API streams a realistic mock so the UX still works end-to-end.

### 1. Install

```bash
git clone https://github.com/bhaikd/SentinelStay.git
cd SentinelStay
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in:

| Variable | Where to get it | Required |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API (anon, public) | ✅ |
| `SUPABASE_URL` | same as above | only for `npm run simulate` |
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API (service role — keep secret!) | only for `npm run simulate` |
| `GEMINI_API_KEY` | <https://aistudio.google.com/app/apikey> | optional |

### 3. Provision the database

In the Supabase SQL editor, run the entire contents of [`schema.sql`](schema.sql). It creates tables, enums, the `profiles` table with role-based RLS, the realtime publication, and an auto-trigger that creates a profile row whenever a new auth user signs up.

After your first sign-up, promote yourself to admin:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';
```

### 4. Run locally

```bash
npm run dev
```

This starts:

- Vite (frontend) at <http://localhost:5173>
- An Express dev server (API) at `http://localhost:3001`, proxied at `/api/*` by Vite

Other useful scripts:

```bash
npm run dev:web    # frontend only
npm run dev:api    # AI dev API only
npm run typecheck  # tsc -b (strict)
npm run lint
npm run build      # production bundle
npm run preview    # serve the production bundle
npm run simulate   # populate Supabase with synthetic incidents
```

## ☁️ Deploying to Vercel

1. Push the repo to GitHub.
2. Import it in Vercel — the framework auto-detects as **Vite**.
3. Set the following project environment variables in Vercel → Settings → Environment Variables:
   - `VITE_SUPABASE_URL` (Production, Preview, Development)
   - `VITE_SUPABASE_ANON_KEY` (Production, Preview, Development)
   - `GEMINI_API_KEY` (Production at minimum) — optional
4. Click **Deploy**.

The `api/summarize-incident.ts` file runs on Vercel's **Edge runtime** (`export const config = { runtime: 'edge' }`). This is critical: the default Node serverless runtime buffers SSE responses, which is what previously caused the AI summary to never stream into the Command Center. Edge keeps the stream alive.

`vercel.json` rewrites everything except `/api/*` to `index.html` so client-side routing works after deploy.

## 🔐 Security notes

- The anon key is meant to be public; the **service role key** must never ship to the client. The simulation worker is the only thing that uses it, and only locally.
- RLS is enabled on every public table. Anonymous users can only insert SOS alerts (`alerts.type = 'sos'`). Reads, writes, escalations, and resolutions are gated by the `app_role` of the signed-in user.
- The AI endpoint applies a small in-memory per-IP rate limit (10 req/min). For higher scale, swap in Upstash/Redis.
- Content-Security-Policy is set in `index.html`.

## 🔄 Workflows

- **Guest emergency**: `/guest/sos` → triggers an alert → `/guest/chat` for live updates.
- **Command/dispatch**: `/command` shows live incidents, deployable units, AI summaries, and the floor plan.
- **Staff/responder**: `/staff`, `/responder` show assigned incidents and let responders update status.
- **Corporate/analytics**: `/corporate`, `/analytics` for historical KPIs.

## 📄 License

Proprietary and confidential.
