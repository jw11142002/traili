# traili

Beli for trails. A friends-only hiking journal where you **rank** every hike you've done instead of rating it.

- **Log → feel → compare → rank.** Pick *Loved it / It was fine / Not for me*, answer a few "which did you prefer?" head-to-heads against hikes of similar effort, and the hike lands in your list with a score (1–10). Scores live in fixed bands so a "loved" hike is always above a "fine" one.
- **One list that's yours.** Drag to reorder or nudge a score (9.5 → 9.3); crossing a neighbour moves the rank.
- **Hiker-specific visit logs.** Date, effort, conditions (mud/snow/smoke…), crowds, who came, would-you-go-back, notes and photos. One trail page, many visits, one rank per person.
- **Friends, not the internet.** Mutual friendships, invite links that auto-friend, a friends-only feed, and "friends' favorites you haven't done".
- **Any trail on earth.** Search OpenStreetMap (Nominatim + Overpass) — Zion to the Dolomites — with a manual fallback.
- **Been / Want lists**, taste profile, profile stats (hikes, miles, gain, countries), mobile-first PWA-ready UI.

## Stack

Next.js 15 (App Router, server actions) · React 19 · Tailwind CSS v4 · Prisma 6 + SQLite · sharp (photo processing) · arctic (Google OAuth) · dnd-kit.

## Run locally

```bash
npm install
cp .env.example .env          # defaults work out of the box
npx prisma db push            # creates data/traili.db
npm run dev                   # http://localhost:3000
```

## Public URL (current setup)

The app is served from this machine and exposed through a Cloudflare quick tunnel:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-public.ps1   # builds nothing; run `npm run build` first
powershell -ExecutionPolicy Bypass -File scripts\stop-public.ps1
```

The script writes the public URL to `data/public-url.txt`. Quick tunnels get a new `*.trycloudflare.com` hostname each time they start; invite links are generated from the request host so they always match.

## Permanent hosting

The included `Dockerfile` runs anywhere Docker does (Fly.io, Railway, Render, a VPS). Mount a persistent volume at `/app/data` — it holds the SQLite database and uploaded photos. Set `APP_URL` to your domain.

## Google sign-in (optional)

Create an OAuth client at <https://console.cloud.google.com/apis/credentials> with the redirect URI `https://<your-domain>/api/auth/google/callback`, then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`. The "Continue with Google" button appears automatically once both are set. (It needs a stable domain — quick-tunnel hostnames change.)

## Data sources

Trail search © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors via Nominatim and Overpass. Requests are throttled to their usage policies (≤1 req/s, identifying User-Agent). Set `OSM_USER_AGENT` to override the identifier.
