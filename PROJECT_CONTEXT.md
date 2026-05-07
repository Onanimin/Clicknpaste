# Clicknpaste - Project Context & Status

**Project:** Pastebin-lite application (internship assignment)  
**Location:** `/Users/onanimin/CLickpaste`  
**Status:** 90% complete - ready for deployment
**Last Updated:** May 7, 2026

---

## 🎯 Project Overview

Clicknpaste is a Pastebin-style application where users can:
- Create text pastes with optional TTL (time-to-live) and view count limits
- Share pastes via a unique URL
- View pastes through HTML or JSON API
- Optionally protect pastes with passwords

**Stack:**
- Node.js 20+ / Express.js
- PostgreSQL (Neon) with Prisma ORM
- Local JSON file fallback (`.data/pastes.json`)
- Vercel serverless deployment
- Vitest + Supertest for testing

---

## ✅ COMPLETED TASKS

### Core Features
- [x] Health check endpoint (`GET /api/healthz`)
- [x] Create paste endpoint (`POST /api/pastes`)
  - [x] Support for `ttl_seconds` parameter
  - [x] Support for `max_views` parameter
  - [x] Support for optional `password` protection
  - [x] Response includes `id`, `url`, `private`, and `password` (if provided)
- [x] Fetch paste API (`GET /api/pastes/:id`)
  - [x] Returns `content`, `remaining_views`, `expires_at`
  - [x] Password verification with header/query support
  - [x] Atomic view count increment
  - [x] 404 on expired/exhausted/missing pastes
- [x] View paste HTML (`GET /p/:id`)
  - [x] HTML rendering with proper escaping
  - [x] Password prompt for protected pastes
  - [x] 404 error page
- [x] Raw text endpoint (`GET /p/:id/raw`)
- [x] Delete endpoint (`DELETE /api/pastes/:id`)

### Constraints & Logic
- [x] TTL enforcement (defaults to 24 hours if not specified)
- [x] View count limits
- [x] Combined constraint logic (paste unavailable when ANY constraint triggers)
- [x] Atomic operations with Prisma transactions
- [x] Deterministic time testing via `x-test-now-ms` header (when `TEST_MODE=1`)
  - [x] Manual verification of TTL expiry with `TEST_MODE=1`

### Database
- [x] Prisma schema with Paste model
- [x] PostgreSQL persistence layer
- [x] Local JSON fallback
- [x] Automatic migrations via `prisma db push`

### Security & Validation
- [x] Input validation with Zod (content required, ttl_seconds ≥ 1, max_views ≥ 1)
- [x] HTML escaping to prevent script injection
- [x] Password hashing with scrypt
- [x] Timing-safe password comparison
- [x] No global mutable state (serverless-safe)

### UI & Frontend
- [x] Homepage with paste form
- [x] Recent pastes list (from `/api/pastes`)
- [x] Share URL with copy button
- [x] Keyboard shortcut (Ctrl+Cmd+Enter to submit)
- [x] Private paste badges in list
- [x] Error display for validation failures
- [x] Action buttons (raw, delete) on paste page

### Testing
- [x] 13 unit tests via Vitest
- [x] All tests passing
- [x] Test coverage includes:
  - Homepage rendering
  - Health check
  - Paste creation (public & private)
  - URL generation (localhost vs production)
  - Password protection
  - Raw endpoint
  - Delete endpoint
  - HTML escaping
  - Error handling

### Code Quality
- [x] No hardcoded localhost URLs in source code
- [x] `.env` properly ignored in `.gitignore`
- [x] No secrets committed
- [x] Environment-based configuration
- [x] Serverless-ready (no global state)

### Documentation
- [x] Comprehensive README.md with:
  - Project description
  - Stack details
  - Prerequisites
  - Environment setup
  - Persistence explanation
  - Design decisions
  - Local development instructions
  - Deployment to Vercel instructions
  - Full API documentation
  - Examples

---

## ⏳ TODO - NEXT STEPS (Not Yet Started)

### 1. **Deploy to Vercel & Neon** (CRITICAL)
   - [ ] Create Neon PostgreSQL database
     - Go to https://console.neon.tech
     - Create new project
     - Copy CONNECTION STRING (DATABASE_URL format)
   - [ ] Create GitHub repository
     - Initialize: `git init`
     - Add remote: `git remote add origin https://github.com/YOUR_USERNAME/clicknpaste`
     - Commit and push: `git push -u origin main`
   - [ ] Connect to Vercel
     - Go to https://vercel.com/new
     - Import from GitHub
     - Select clicknpaste repository
   - [ ] Set environment variables in Vercel dashboard:
     - `DATABASE_URL` = PostgreSQL connection string from Neon
     - `BASE_URL` = Your Vercel URL (e.g., https://clicknpaste-YOUR_NAME.vercel.app)
     - `TEST_MODE` = "1" (optional, for deterministic testing)
   - [ ] Trigger deployment (Vercel will automatically run `npm run vercel-build`)

### 2. **Test Deployed Application** (CRITICAL)
   - [ ] Test health check: `curl https://YOUR_DEPLOYMENT_URL/api/healthz`
   - [ ] Test paste creation:
     ```bash
     curl -X POST https://YOUR_DEPLOYMENT_URL/api/pastes \
       -H "Content-Type: application/json" \
       -d '{"content":"test","ttl_seconds":3600,"max_views":5}'
     ```
   - [ ] Test fetch with view limits
   - [ ] Test fetch with TTL expiry (using `x-test-now-ms` header)
   - [ ] Test password protection
   - [ ] Test HTML rendering
   - [ ] Test raw endpoint
   - [ ] Test delete endpoint

### 3. **Verify Automated Test Scenarios**
   - [ ] Service checks (healthz, JSON responses, timeouts)
   - [ ] Paste creation (valid id, url format)
   - [ ] Paste retrieval (API & HTML)
   - [ ] View limits (max_views enforcement)
   - [ ] TTL constraints (deterministic testing)
   - [ ] Combined constraints
   - [ ] Error handling (4xx responses)
   - [ ] Robustness (no negative views, concurrent load)

### 4. **Final Submission**
   - [ ] Ensure GitHub repository is public
   - [ ] Verify README.md is at repository root
   - [ ] Double-check no secrets in git history
   - [ ] Collect submission details:
     - Deployed URL
     - Git repository URL
     - Summary of persistence choice and design decisions
   - [ ] Submit to assignment platform

---

## 📂 Project Structure

```
CLickpaste/
├── .data/                       # Local file storage (ignored in git)
│   └── pastes.json             # File-based paste store (fallback)
├── .env.example                # Template for environment variables
├── .gitignore                  # Git ignore patterns
├── README.md                   # Comprehensive project documentation
├── PROJECT_CONTEXT.md          # This file
├── api/
│   └── index.js               # Vercel serverless handler
├── node_modules/              # Dependencies (npm install)
├── package.json               # Project metadata & scripts
├── package-lock.json          # Locked dependency versions
├── prisma/
│   └── schema.prisma          # Prisma ORM schema (Paste model)
├── public/
│   ├── home.js                # Client-side form & list logic
│   └── favicon.ico            # Favicon
├── src/
│   ├── app.js                 # Express app setup & homepage render
│   ├── server.js              # Node.js dev server (port 3000)
│   ├── lib/
│   │   ├── config.js          # BASE_URL, TEST_MODE, getCurrentTime
│   │   ├── errors.js          # ApiError class
│   │   ├── html.js            # HTML rendering functions
│   │   └── prisma.js          # Prisma client singleton
│   ├── middleware/
│   │   ├── errorHandler.js    # Express error & 404 handlers
│   │   └── validate.js        # Zod validation middleware
│   ├── routes/
│   │   ├── health.js          # GET /api/healthz
│   │   ├── pastesList.js      # GET /api/pastes (public listing)
│   │   ├── pastesApi.js       # POST /api/pastes, GET /api/pastes/:id
│   │   └── pastesPage.js      # GET /p/:id, GET /p/:id/raw, DELETE /api/pastes/:id
│   ├── services/
│   │   └── pasteService.js    # Paste CRUD with DB/file storage
│   └── validation/
│       └── pasteSchemas.js    # Zod schemas for API inputs
├── test/
│   └── app.test.js            # 13 unit tests (Vitest + Supertest)
├── vercel.json                # Vercel serverless config
└── vitest.config.js           # Vitest configuration

```

---

## 🔑 Key Technical Decisions

1. **Atomic View Increments:**
   - Uses `Prisma.$transaction` with raw SQL `UPDATE ... RETURNING`
   - Prevents race conditions where multiple requests increment simultaneously

2. **Constraint Enforcement:**
   - Both TTL and max-views checked on every fetch
   - Paste deleted immediately when constraint triggers
   - Returns 404 to client

3. **Password Storage:**
   - Hashed with scrypt (64-byte hash)
   - Salt included in hash
   - Never returned in API responses (except to creator on creation)
   - Timing-safe comparison prevents timing attacks

4. **Deterministic Testing:**
   - `TEST_MODE=1` enables `x-test-now-ms` header override
   - Allows TTL testing without waiting
   - Disabled by default for security

5. **No Global State:**
   - All state is transaction-scoped or passed as parameters
   - Ensures serverless functions are stateless
   - Each request independent

6. **Persistence Layer:**
   - **Primary:** PostgreSQL via Prisma ORM (production)
   - **Fallback:** Local JSON file (development/testing)
   - Toggle via `DATABASE_URL` environment variable

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [x] All tests passing (13/13)
- [x] No console.logs in production code
- [x] No hardcoded URLs
- [x] No secrets in git
- [x] Environment variables documented
- [ ] Database created (Neon)
- [ ] GitHub repository created and code pushed

### During Deployment
- [ ] Connect Vercel to GitHub repo
- [ ] Configure environment variables
- [ ] Trigger build (automatic)
- [ ] Verify build succeeds
- [ ] Verify app starts without errors

### Post-Deployment
- [ ] Health check returns 200 + JSON
- [ ] Create paste returns correct response
- [ ] Fetch paste returns content + metadata
- [ ] View limits work correctly
- [ ] TTL expiry works with deterministic testing
- [ ] Password protection works
- [ ] HTML rendering secure (no XSS)
- [ ] Delete endpoint works

---

## 📋 Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string (format: `postgresql://user:pass@host:port/db?schema=public`)
- `BASE_URL` - Deployment URL for share links (e.g., `https://your-app.vercel.app`)

**Optional:**
- `TEST_MODE` - Set to "1" to enable deterministic time testing via `x-test-now-ms` header

**Example `.env` file:**
```
DATABASE_URL="postgresql://user123:pass@ep-123.neon.tech:5432/clicknpaste?schema=public"
BASE_URL="https://clicknpaste-myname.vercel.app"
TEST_MODE="0"
```

---

## 🔗 Important Files for Reference

| File | Purpose |
|------|---------|
| [README.md](README.md) | Full project documentation |
| [src/app.js](src/app.js) | Express app setup, homepage render |
| [src/services/pasteService.js](src/services/pasteService.js) | Paste CRUD logic, DB/file storage |
| [src/routes/pastesApi.js](src/routes/pastesApi.js) | POST/GET /api/pastes endpoints |
| [src/routes/pastesPage.js](src/routes/pastesPage.js) | HTML page, raw, delete endpoints |
| [prisma/schema.prisma](prisma/schema.prisma) | Database schema |
| [test/app.test.js](test/app.test.js) | Unit tests |
| [vercel.json](vercel.json) | Vercel serverless config |
| [package.json](package.json) | Dependencies & scripts |

---

## 📝 NPM Scripts

```bash
npm run dev              # Start dev server (localhost:3000)
npm run start            # Start production server
npm test                 # Run Vitest suite (13 tests)
npm run prisma:generate  # Generate Prisma client
npm run prisma:push      # Push schema to database
npm run vercel-build     # Build for Vercel (generate + push)
```

---

## 🧪 Test Command

```bash
npm test
# Output should show: ✓ test/app.test.js (13)
```

---

## 🔍 API Quick Reference

### Health
```bash
curl http://localhost:3000/api/healthz
# Response: { "ok": true }
```

### Create Paste
```bash
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello, world!",
    "ttl_seconds": 3600,
    "max_views": 5,
    "password": "secret123"
  }'
# Response: { "id": "...", "url": "...", "private": true, "password": "secret123" }
```

### Fetch Paste
```bash
curl http://localhost:3000/api/pastes/PASTE_ID
# Response: { "content": "...", "remaining_views": 4, "expires_at": "2026-05-08T10:00:00Z" }
```

### View HTML
```bash
curl http://localhost:3000/p/PASTE_ID
# Response: HTML page with paste content
```

### Delete Paste
```bash
curl -X DELETE http://localhost:3000/api/pastes/PASTE_ID \
  -H "x-paste-password: secret123"
# Response: { "ok": true }
```

---

## ⚠️ Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Cannot find module @prisma/client" | Run `npm run prisma:generate` |
| PORT 3000 already in use | Kill process: `pkill -f 'node src/server.js'` |
| Tests fail with "DATABASE_URL not set" | Tests use file fallback, this is normal |
| Paste returns 404 immediately after creation | Check if paste is expired or view limit reached |
| Password doesn't work | Ensure `password` was provided during creation and is sent in fetch request |

---

## 🎓 Key Concepts

**Atomic Operations:**
- View count increment and constraint check happen in single transaction
- Prevents double-counting or race conditions

**TTL (Time-to-Live):**
- Optional expiry time in seconds
- Default: 24 hours if not specified
- Enforced on fetch (paste deleted if expired)

**View Count Limit:**
- Optional maximum number of times a paste can be fetched
- Enforced on fetch (paste deleted if limit reached)
- `remaining_views` returned in API response

**Test Mode:**
- `TEST_MODE=1` enables `x-test-now-ms` header
- Allows deterministic TTL testing without waiting
- Example: `curl -H "x-test-now-ms: 1234567890" http://localhost:3000/api/pastes/ID`

**Serverless Ready:**
- No global mutable state
- Each request independent
- Database transactions ensure consistency
- Suitable for Vercel, AWS Lambda, etc.

---

## 📞 Support Notes

If something breaks during deployment:

1. Check Vercel build logs (Vercel dashboard → Deployments → Build & Runtime logs)
2. Check DATABASE_URL is correct (copy from Neon without extra quotes)
3. Verify Prisma schema matches database (run `prisma db push` on local machine first)
4. Check environment variables are set in Vercel dashboard
5. Restart deployment or trigger manual deploy

---

## 🎉 Next Person's Checklist

When you take over:

- [ ] Read this entire file
- [ ] Verify current state: `npm test` (should show 13/13 passing)
- [ ] Check git status: `git status`
- [ ] Start dev server: `npm run dev`
- [ ] Open http://localhost:3000
- [ ] Test health check: `curl http://localhost:3000/api/healthz`
- [ ] Create a test paste and verify it works
- [ ] Create Neon database and get CONNECTION STRING
- [ ] Create GitHub repository
- [ ] Push code to GitHub
- [ ] Connect to Vercel and set environment variables
- [ ] Test deployed application
- [ ] Verify all requirements are met
- [ ] Submit application

Good luck! 🚀
