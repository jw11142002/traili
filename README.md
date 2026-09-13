# traili

Beli for trails. A friends-only hiking journal where you **rank** every hike you've done instead of rating it.

- **Log → feel → compare → rank.** Pick *Loved it / It was fine / Not for me*, answer a few "which did you prefer?" head-to-heads against hikes of similar effort, and the hike lands in your list with a score (1–10). Scores live in fixed bands so a "loved" hike is always above a "fine" one.
- **One list that's yours.** Drag to reorder or nudge a score (9.5 → 9.3); crossing a neighbour moves the rank.
- **Hiker-specific visit logs.** Date, effort, conditions (mud/snow/smoke…), crowds, who came, would-you-go-back, notes and photos. One trail page, many visits, one rank per person.
- **Friends, not the internet.** Mutual friendships, invite links that auto-friend, a friends-only feed, and "friends' favorites you haven't done".
- **Any trail on earth.** Search OpenStreetMap (Nominatim + Overpass) — Zion to the Dolomites — with a manual fallback.
- **Been / Want lists**, taste profile, profile stats (hikes, miles, gain, countries), mobile-first PWA-ready UI.

## Stack

Next.js 15 (App Router, server actions) · React 19 · Tailwind CSS v4 · Prisma 6 + **Supabase Postgres** · **Supabase Storage** for photos · sharp · arctic (Google OAuth) · dnd-kit. Hosted on **Vercel**.

## Deploy (Vercel + Supabase, both free tiers)

### 1. Supabase
1. <https://supabase.com/dashboard> → **New project** (name `traili`, region *West US (Oregon)*, save the database password).
2. **Connect** (top bar) → **ORMs → Prisma**. Copy the two URLs:
   - `DATABASE_URL` — *Transaction pooler*, port **6543**, append `?pgbouncer=true&connection_limit=1`
   - `DIRECT_URL` — *Session pooler*, port **5432**
3. **Project Settings → API**: copy **Project URL** (`SUPABASE_URL`) and the **service_role** key (`SUPABASE_SERVICE_ROLE_KEY`).
   The `photos` storage bucket is created automatically on first upload.

### 2. Vercel
1. <https://vercel.com/new> → import the GitHub repo `jw11142002/traili`. Framework is detected as Next.js; the build command comes from `vercel.json` (`npm run vercel-build`, which also applies the Prisma schema).
2. **Environment Variables** — add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | pooler URL, port 6543, with `?pgbouncer=true&connection_limit=1` |
   | `DIRECT_URL` | pooler URL, port 5432 |
   | `SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | service role key |
   | `APP_URL` | `https://traili.justinyjwang.com` |

3. **Deploy**. First build creates all tables.
4. **Project → Settings → Domains** → add `traili.justinyjwang.com`. Vercel shows the CNAME target (`cname.vercel-dns.com`).

### 3. Namecheap DNS
Domain List → **Manage** → **Advanced DNS** → Add record:

| Type | Host | Value | TTL |
|---|---|---|---|
| CNAME | `traili` | `cname.vercel-dns.com.` | Automatic |

Propagation is usually minutes; Vercel issues the TLS certificate automatically.

### 4. Optional — Google sign-in
Create an OAuth client at <https://console.cloud.google.com/apis/credentials> with redirect URI `https://traili.justinyjwang.com/api/auth/google/callback`, then add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel and redeploy. The button appears automatically.

## Run locally

```bash
npm install
cp .env.example .env     # fill in the Supabase values (a second free project works well for dev)
npx prisma db push
npm run dev              # http://localhost:3000
```

Without `SUPABASE_URL` set, photos are written to `UPLOAD_DIR` on disk instead.

`scripts/start-public.ps1` / `stop-public.ps1` run a production build on this machine behind a Cloudflare quick tunnel (temporary URL) — handy for testing, superseded by Vercel. A `Dockerfile` is also included for any container host.

## Data sources

Trail search © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors via Nominatim and Overpass. Requests are throttled to their usage policies (≤1 req/s, identifying User-Agent). Set `OSM_USER_AGENT` to override the identifier.
