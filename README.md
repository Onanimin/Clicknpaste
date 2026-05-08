# Clicknpaste

Pastebin-lite app for the internship assignment.

## Description

Clicknpaste is a small Pastebin-style app that lets users create a text paste, get a shareable link, and view the paste through either the API or an HTML page. Pastes have optional time-based expiry (TTL) and view-count limits.

## Stack

- Node.js 20+
- Express.js
- PostgreSQL with Prisma ORM
- Vercel serverless deployment
- Local JSON file fallback (when DATABASE_URL is not set)

## Prerequisites

- Node.js 20 or newer
- PostgreSQL DATABASE_URL (optional; uses local file storage if not set)

## Environment

Copy [.env.example](.env.example) to `.env` and set:

- `DATABASE_URL` - Optional; PostgreSQL connection string (uses local .data/pastes.json if not set)
- `BASE_URL` - Optional; defaults to request origin
- `TEST_MODE` - Optional; set to "1" to enable deterministic time testing via `x-test-now-ms` header

## Persistence

**Default:** PostgreSQL on Neon through Prisma ORM. Data survives across serverless requests and deployments.

**Fallback:** If `DATABASE_URL` is not set, the app uses a local JSON file at `.data/pastes.json`. Suitable for local development; not recommended for production.

## Design Decisions

- **Atomic view increments:** Uses `Prisma.$transaction` with raw SQL to atomically increment view count and check constraints in a single operation, preventing race conditions.
- **Constraint enforcement:** Both TTL and max-view limits are checked during fetch. If either constraint is met, the paste is deleted and returns 404.
- **Optional TTL:** Pastes expire only when `ttl_seconds` is provided. If no TTL is set, the paste does not expire by time.
- **Deterministic testing:** `TEST_MODE=1` allows the `x-test-now-ms` header to override the current time for expiry logic, enabling reproducible test scenarios.
- **Secure password storage:** Passwords are hashed with scrypt before storage; never returned in responses except to the creator on creation.
- **HTML escaping:** All paste content is HTML-escaped before rendering to prevent script injection.
- **No global state:** All request state is transaction-scoped or passed as parameters, enabling seamless serverless deployment.

## Local Development

1. Install dependencies: `npm install`
2. Set up environment: `cp .env.example .env` and update `DATABASE_URL` if using PostgreSQL
3. Generate Prisma client: `npm run prisma:generate`
4. (Optional) Push schema to database: `npm run prisma:push`
5. Start dev server: `npm run dev`
6. Open http://localhost:3000
7. Run tests: `npm test`

## Deployment to Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables:
   - `DATABASE_URL` - PostgreSQL connection string from Neon
   - `BASE_URL` - Your Vercel deployment URL (e.g., https://your-app.vercel.app)
   - `TEST_MODE` - Set to "1" if you want deterministic testing enabled
4. Vercel will automatically run `npm run vercel-build` which executes Prisma migrations
5. Deploy!

## API

### Health Check
```
GET /api/healthz
```
Returns 200 if database is accessible.

### Create Paste
```
POST /api/pastes
Content-Type: application/json

{
  "content": "string (required, non-empty)",
  "ttl_seconds": 3600,
  "max_views": 5,
  "password": "string (optional, min 4 chars)"
}
```

Response (201):
```json
{
  "id": "string",
  "url": "https://your-app.vercel.app/p/<id>",
  "private": false,
  "password": "string (only if password was provided)"
}
```

### Fetch Paste (API)
```
GET /api/pastes/:id
Header: x-paste-password (optional)
Query: ?password=<string> (optional)
```

Response (200):
```json
{
  "content": "string",
  "remaining_views": 4,
  "expires_at": "2026-05-08T10:00:00.000Z"
}
```

Notes:
- `remaining_views` is null if unlimited
- `expires_at` is null if no TTL
- Each fetch counts as one view
- Returns 404 if paste is expired, exhausted, or missing
- Returns 401 if password is required or incorrect

### View Paste (HTML)
```
GET /p/:id
```
Returns HTML page containing the paste. If paste is protected, shows a password prompt. Returns 404 if unavailable.