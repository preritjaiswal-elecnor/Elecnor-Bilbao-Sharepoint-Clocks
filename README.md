# Elecnor Madrid — World Clock

A self-contained clock / weather / FX / stock board, embeddable in SharePoint.

This is an **independent** deployment from the ANZ board. It has its own
Cloudflare Pages project, its own domain, and its own proxy functions under
`/api/*`. Nothing is shared with the other project, so upstream rate limits and
usage counters never collide.

## Structure

```
index.html                      the board (calls /api/* relatively)
functions/api/fx/[[path]].js     FX proxy   -> Frankfurter (EUR-based conversion)
functions/api/stock/index.js     stock proxy -> Yahoo Finance chart API
functions/api/weather/[[path]].js weather proxy -> Open-Meteo
_headers                         CORS header for /api/*
```

Because the frontend uses **relative** paths (`/api/fx`, `/api/stock`,
`/api/weather`), it works on whatever domain Pages assigns — no hard-coded host.

## Endpoints

| Endpoint | Example |
|---|---|
| FX latest | `/api/fx/latest?from=EUR&to=AUD,NZD` |
| FX historical | `/api/fx/2026-06-19?from=EUR&to=AUD,NZD` |
| Stock | `/api/stock?symbol=ENO.MC&range=1d&interval=1d` |
| Weather | `/api/weather/v1/forecast?latitude=40.4&longitude=-3.7&current=temperature_2m&timezone=auto` |

## Deploy to Cloudflare Pages

### Option A — via GitHub (recommended)

1. Create a new GitHub repo and push this folder (see below).
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** → pick the new repo.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/`
4. **Save and Deploy.** Cloudflare auto-detects the `functions/` folder and
   deploys each file as a Pages Function.
5. You'll get a `*.pages.dev` URL. Embed that in your SharePoint page.

### Option B — via Wrangler CLI

```bash
npm install -g wrangler
wrangler login
wrangler pages deploy . --project-name elecnor-madrid-clocks
```

## Push to GitHub

```bash
cd elecnor-madrid-clocks
git init
git add .
git commit -m "Initial commit: Elecnor Madrid world clock board"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/elecnor-madrid-clocks.git
git push -u origin main
```

## Notes

- The `index.html` keeps three keyless/backup weather fallbacks
  (OpenWeatherMap, WeatherAPI.com, wttr.in) in the browser in case the primary
  Open-Meteo proxy is unavailable.
- Stock proxy auto-retries via Yahoo's `query2` host if `query1` rate-limits.
- No secrets are required for the default configuration.
