# ClawForge URL Shortener

A production-ready URL shortener with click analytics — built entirely by AI agents in a single autonomous pipeline run.

This project was not written by a human. It was planned, built, reviewed, tested, and deployed by 5 specialized AI agents coordinated by [ClawForge](https://github.com/mamoor123/clawforge) on [OpenClaw](https://github.com/openclaw/openclaw).

**Live → [clawforge-url-shortener.onrender.com](https://clawforge-url-shortener.onrender.com)**

## Features

- **Shorten any URL** — 7-character codes via nanoid
- **Custom short codes** — branded links (`/myapp`, `/launch`)
- **Click tracking** — referrer, user agent, IP, timestamp
- **Analytics dashboard** — daily clicks, top referrers, recent activity
- **REST API** — full CRUD with pagination
- **Dark UI** — clean, responsive, copy-to-clipboard
- **SQLite + WAL** — fast reads, safe concurrent writes
- **TypeScript** — fully typed, strict mode

## Quick Start

```bash
npm install
npm run dev
# → http://localhost:3456
```

## API

### Create a short URL

```bash
curl -X POST http://localhost:3456/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very/long/path"}'
```

Response (201):
```json
{
  "id": 1,
  "originalUrl": "https://example.com/very/long/path",
  "shortCode": "a3K9x2b",
  "shortUrl": "http://localhost:3456/a3K9x2b",
  "clicks": 0
}
```

### Custom short code

```bash
curl -X POST http://localhost:3456/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/mamoor123/clawforge", "customCode": "clawforge"}'
```

### List all URLs

```bash
curl http://localhost:3456/api/urls?limit=10&offset=0
```

### Redirect (302)

```bash
curl -I http://localhost:3456/a3K9x2b
# HTTP/1.1 302 Found
# Location: https://example.com/very/long/path
```

### Analytics

```bash
curl http://localhost:3456/api/analytics/a3K9x2b
```

Response:
```json
{
  "url": {
    "originalUrl": "https://example.com/very/long/path",
    "shortCode": "a3K9x2b",
    "totalClicks": 42
  },
  "dailyClicks": [
    {"date": "2026-04-20", "count": 12},
    {"date": "2026-04-21", "count": 18},
    {"date": "2026-04-22", "count": 12}
  ],
  "topReferrers": [
    {"referrer": "https://twitter.com", "count": 25},
    {"referrer": "https://google.com", "count": 17}
  ],
  "recentClicks": [...]
}
```

### Health check

```bash
curl http://localhost:3456/api/health
# {"status":"ok","uptime":3600.5}
```

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/shorten` | Create a short URL |
| GET | `/api/urls` | List all URLs (paginated) |
| GET | `/api/analytics/:code` | Click stats for a URL |
| GET | `/api/health` | Health check |
| GET | `/:code` | Redirect to original URL |

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | Node.js 18+ | ESM support, native fetch |
| Language | TypeScript 5.6 | Strict types, catch bugs early |
| Framework | Express.js 4.x | Minimal, battle-tested |
| Database | SQLite (better-sqlite3) | Zero-config, embedded, fast |
| Short IDs | nanoid 3.x | URL-safe, collision-resistant |
| Testing | Vitest + supertest | Fast, modern, TypeScript-native |

## Project Structure

```
src/
├── index.ts          # Express server, middleware, route wiring
├── db.ts             # SQLite setup, migrations, WAL mode
└── routes/
    ├── shorten.ts    # POST /api/shorten — create short URLs
    ├── redirect.ts   # GET /:code — redirect + click tracking
    └── analytics.ts  # GET /api/analytics/:code — click stats

public/
└── index.html        # Frontend — dark UI, form, dashboard

tests/
└── api.test.ts       # 10 tests covering all endpoints
```

## Scripts

```bash
npm run dev    # Start dev server with hot reload (tsx watch)
npm run build  # Compile TypeScript → dist/
npm start      # Run compiled build
npm test       # Run test suite (vitest)
```

## Test Results

```
✓ POST /api/shorten creates short URL
✓ POST /api/shorten rejects missing URL
✓ POST /api/shorten rejects invalid URL
✓ POST /api/shorten accepts custom codes
✓ POST /api/shorten rejects duplicate codes
✓ GET /:code redirects to original
✓ GET /:code returns 404 for unknown
✓ GET /:code increments click counter
✓ GET /api/analytics/:code returns stats
✓ GET /api/analytics/:code returns 404 for unknown
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3456 | Server listen port |

## Security

- ✅ Parameterized SQL queries (no injection)
- ✅ Input validation on all endpoints
- ✅ URL format validation via `new URL()`
- ✅ Custom code regex whitelist (`[a-zA-Z0-9_-]+`)
- ✅ Generic error messages (no stack leaks)
- ⚠️ No rate limiting (add for production)
- ⚠️ No security headers (add helmet for production)

## How It Was Built

This project was created by [ClawForge](https://github.com/mamoor123/clawforge) — an autonomous multi-agent pipeline:

- 🧠 **Architect** planned the stack, schema, and endpoints
- 💻 **Coder** implemented all 11 files in TypeScript
- 🔍 **Reviewer** audited for security and quality
- 🧪 **Tester** wrote and ran the test suite
- 🚀 **Deployer** pushed to GitHub and deployed

**Human input:** 1 Telegram message — "Build me a URL shortener with click analytics"

**Time to production:** ~20 minutes

## License

MIT
