# Personal Finance Tracker — VS Code Agent Prompt Playbook

**Stack:** React 18 · Node.js/Express · PostgreSQL · Redis · Recharts · JWT + RBAC · Swagger
**Plan:** 10 phases, ~6 hours (start 2:20 PM → done by ~8:30 PM IST)

---

## How to use this

1. Create an empty folder `finance-tracker`, open it in VS Code, run `git init`.
2. Open the agent chat (Copilot Agent / Claude Code / Cline) in **agent mode**.
3. Paste the **Master Prompt** once (Phase 0).
4. Paste **one phase prompt at a time**. Do not move on until that phase's **Checkpoint** passes.
5. If something breaks, use the **Fix Prompts** at the end.
6. After each phase, commit (the prompt asks the agent to do it). This gives the "proper commit history" the assignment requires.

### Timeline

| Phase | What | Time (IST) | Duration |
|---|---|---|---|
| 0 | Master context + project scaffold | 2:20 – 2:40 PM | 20 m |
| 1 | DB schema, Docker (Postgres + Redis), backend skeleton | 2:40 – 3:20 PM | 40 m |
| 2 | Auth, JWT, RBAC, security | 3:20 – 4:00 PM | 40 m |
| 3 | Transactions + categories + pagination | 4:00 – 4:40 PM | 40 m |
| 4 | Redis caching + rate limiting | 4:40 – 5:10 PM | 30 m |
| 5 | Analytics + admin users API | 5:10 – 5:40 PM | 30 m |
| 6 | Swagger docs + backend smoke test | 5:40 – 6:00 PM | 20 m |
| 7 | Frontend foundation (contexts, auth, lazy routes) | 6:00 – 6:40 PM | 40 m |
| 8 | Transactions UI (hooks, pagination, virtual scroll) | 6:40 – 7:25 PM | 45 m |
| 9 | Dashboard charts | 7:25 – 7:55 PM | 30 m |
| 10 | Performance metrics, README, deploy, final QA | 7:55 – 8:30 PM | 35 m |

> Buffer: if you fall behind, skip virtual-scroll polish and deployment polish first. Never skip RBAC, caching, rate limiting, or Swagger (they are explicit requirements).

---

## PHASE 0 — Master Prompt (paste once, 2:20 PM)

```
You are a senior full-stack engineer. Build a "Personal Finance Tracker" in this
workspace, phase by phase. I will give you one phase at a time. Do ONLY the
current phase, verify it works, commit, then stop and summarize.

## Tech stack (mandatory)
- Frontend: React 18+ (Vite), Recharts for charts, React Router
- Backend: Node.js + Express.js
- Database: PostgreSQL (use the `pg` driver with parameterized queries)
- Cache: Redis (`ioredis`)
- Docs: Swagger/OpenAPI (swagger-ui-express + swagger-jsdoc)

## Folder structure
finance-tracker/
  backend/   (src/config, src/middleware, src/routes, src/controllers,
              src/services, src/db, src/utils, src/docs)
  frontend/  (src/components, src/pages, src/context, src/hooks, src/api, src/utils)
  docker-compose.yml
  README.md

## Product requirements
1. Auth: register/login, JWT, protected routes, RBAC with roles:
   - admin: full access incl. user & data management
   - user: CRUD only their own transactions, view own analytics
   - read-only: view own transactions + analytics only; cannot add/edit/delete
2. Transactions: add/edit/delete income/expense (admin & user only),
   categories (Food, Transport, Entertainment, etc.), search + filter,
   read-only users can view list and details only.
3. Dashboard: monthly/yearly overview, category-wise expense breakdown,
   income vs expense trends, interactive charts. All roles can access it.
4. Performance: lazy loading, pagination, caching, rate limiting.

## Frontend technical requirements
- useContext: AuthContext (user data) and ThemeContext (light/dark) as global state
- useCallback: optimize handlers in transaction forms + prevent child re-renders
- useMemo: totals/averages and memoized filtered/sorted transaction lists
- React.lazy + Suspense for route-based code splitting
- Virtual scrolling for large transaction lists
- Recharts: at least Pie (category), Line (monthly trend), Bar (income vs expense)
- Frontend conditional rendering: disable/hide add/edit/delete for read-only users

## Backend technical requirements
- Redis caching: user analytics cached 15 min, category list cached 1 hour,
  invalidate cache on transaction create/update/delete
- express-rate-limit: auth 5 req/15 min, transactions 100 req/hour,
  analytics 50 req/hour
- Security: prevent XSS and SQL injection (helmet, input sanitization/validation,
  parameterized queries only), token-based API calling (Bearer JWT)
- RBAC: `role` column in users table (default 'user'); middleware reads role
  from JWT claims and enforces permissions:
  GET /api/transactions -> all roles
  POST/PUT/DELETE /api/transactions -> admin, user
  GET /api/analytics -> all roles
  GET /api/users -> admin only

## Deliverables
- Clean GitHub-ready repo, README with setup, commit after every phase with
  meaningful messages (feat:, chore:, docs:)
- Swagger docs at /api/docs
- Seed demo users: admin@demo.com / user@demo.com / readonly@demo.com
  (password: Demo@1234) with realistic sample transactions
- Performance metrics showing cache effectiveness (hit vs miss timings)

## Rules for you
- Use environment variables (.env + .env.example), never hardcode secrets.
- Use async/await, centralized error handling, consistent JSON responses:
  { success, data, message } and { success:false, error:{code,message} }.
- Keep code simple and readable; no unnecessary libraries.
- After each phase: run the app/tests, fix errors, then `git add -A && git commit`.
- Do not start the next phase until I ask.

Confirm you understood, then do PHASE 0: create the folder structure, git
ignore files, backend `package.json` + frontend Vite React app, install
dependencies, and a root README stub. Commit as "chore: project scaffold".
```

**Checkpoint:** folders `backend/` and `frontend/` exist, `npm install` succeeded in both, first commit made.

---

## PHASE 1 — Database, Docker, Backend skeleton (2:40 PM)

```
PHASE 1: Database + backend skeleton.

1. Create docker-compose.yml at the root with services: postgres:16
   (db: finance_tracker, user/password from env) and redis:7, with ports
   5432 and 6379 and a named volume for postgres.
2. In backend/, create src/config (env loader with dotenv), src/db/pool.js
   (pg Pool), and src/db/redis.js (ioredis client with error logging).
3. Create SQL migration file backend/src/db/schema.sql:
   - users(id SERIAL PK, name, email UNIQUE, password_hash, role VARCHAR
     DEFAULT 'user' CHECK role IN ('admin','user','read-only'), created_at)
   - categories(id SERIAL PK, name UNIQUE, type CHECK IN ('income','expense'))
   - transactions(id SERIAL PK, user_id FK->users ON DELETE CASCADE,
     category_id FK->categories, type CHECK IN ('income','expense'),
     amount NUMERIC(12,2) CHECK > 0, description, transaction_date DATE,
     created_at, updated_at)
   - Indexes on transactions(user_id, transaction_date), (user_id, category_id),
     (user_id, type)
4. Create scripts: `npm run db:migrate` (runs schema.sql) and `npm run db:seed`
   (inserts default categories: Salary, Freelance, Investments, Food, Transport,
   Entertainment, Shopping, Bills, Health, Education, Rent, Other; and 3 demo
   users admin@demo.com, user@demo.com, readonly@demo.com with password
   Demo@1234 hashed with bcrypt; and ~150 realistic transactions for the
   'user' and 'read-only' accounts spread over the last 12 months).
5. Create src/app.js and src/server.js: express app with helmet, cors (origin
   from env), express.json (limit 10kb), morgan, a GET /api/health route that
   checks DB and Redis, a 404 handler, and a centralized error handler
   (src/middleware/errorHandler.js) with a custom AppError class.
6. Add a .env.example with PORT, DATABASE_URL, REDIS_URL, JWT_SECRET,
   JWT_EXPIRES_IN, CLIENT_URL.

Verify: run docker compose up -d, migrate, seed, start server, and curl
/api/health. Fix any errors. Commit: "feat(backend): db schema, docker, server skeleton".
```

**Checkpoint:** `curl localhost:5000/api/health` shows DB and Redis OK; tables are seeded.

---

## PHASE 2 — Auth, JWT, RBAC, Security (3:20 PM)

```
PHASE 2: Authentication, RBAC, and security in backend/.

1. Auth endpoints under /api/auth:
   - POST /register (name, email, password) -> creates user with role 'user'
     (ignore any role in the body). Hash with bcrypt (cost 10+).
   - POST /login -> returns { token, user:{id,name,email,role} }.
   - GET /me -> returns current user (protected).
   JWT payload must contain id, email, role. Use JWT_SECRET and expiry from env.
2. Middleware:
   - src/middleware/auth.js `authenticate`: reads `Authorization: Bearer <token>`,
     verifies it, attaches req.user from JWT claims; 401 on missing/invalid/expired.
   - src/middleware/rbac.js `authorize(...roles)`: 403 if req.user.role is not
     in the allowed roles.
3. Validation: use express-validator (or zod) for register/login: valid email,
   password min 8 chars with letter+number, name 2-50 chars.
4. Security hardening:
   - helmet already set; add `xss-clean` alternative: write a small
     sanitize middleware (or use `sanitize-html`/`xss`) that strips HTML/script
     from all string fields in req.body, req.query, req.params.
   - ALL SQL must use parameterized queries ($1, $2...). No string concatenation.
   - Do not leak whether email or password was wrong ("Invalid credentials").
   - Limit body size, disable x-powered-by.
5. Write a short backend/src/routes/index.js that mounts routes under /api.

Verify with curl: register, login, /me with token, /me without token (401),
and a test route protected with authorize('admin') returning 403 for a normal
user. Commit: "feat(backend): JWT auth, RBAC middleware, input sanitization".
```

**Checkpoint:** login works for all 3 demo users; role is inside the JWT; 401/403 behave correctly.

---

## PHASE 3 — Transactions & Categories (4:00 PM)

```
PHASE 3: Transactions and categories API.

Categories:
- GET /api/categories (all roles) -> list of categories, optional ?type=income|expense.

Transactions (all routes require `authenticate`):
- GET /api/transactions (all roles): returns ONLY the current user's rows
  (admin may pass ?userId= to view another user's, or ?all=true for all).
  Support query params: page (default 1), limit (default 10, max 100),
  search (ILIKE on description and category name), type, categoryId,
  startDate, endDate, minAmount, maxAmount, sortBy (date|amount),
  sortOrder (asc|desc). Response: { data: [...], pagination:{page,limit,total,totalPages} }.
  Return category name joined in each row.
- GET /api/transactions/:id (all roles): only own record (admin any); 404 if not found.
- POST /api/transactions (authorize admin,user): validate type, amount>0,
  categoryId exists and matches the type, date valid, description <=255.
- PUT /api/transactions/:id (admin,user): owner or admin only.
- DELETE /api/transactions/:id (admin,user): owner or admin only.
read-only role must get 403 on POST/PUT/DELETE.

Structure the code properly: routes -> controllers -> services (SQL lives in
services). Use parameterized queries only; build dynamic WHERE clauses safely
with a params array and a whitelist for sortBy/sortOrder.

Verify with curl for all three roles (read-only must be blocked from writes;
user must not see/edit another user's data). Commit:
"feat(backend): transactions CRUD with filters, search, pagination".
```

**Checkpoint:** filters + pagination work; read-only gets 403 on writes; user A cannot touch user B's data.

---

## PHASE 4 — Redis Caching & Rate Limiting (4:40 PM)

```
PHASE 4: Redis caching and rate limiting.

Caching (backend/src/services/cache.js):
- Helpers: getCache(key), setCache(key, value, ttlSeconds), delCache(key),
  delByPattern(pattern) (use SCAN, not KEYS).
- Cache GET /api/categories under key `categories:{type|all}` for 3600s (1 hour).
- Create cache-key helpers for analytics: `analytics:{userId}:{endpoint}:{paramsHash}`
  with TTL 900s (15 minutes). (Analytics endpoints come in Phase 5, but build
  the helper + a reusable `cacheMiddleware(keyBuilder, ttl)` now.)
- Add response header `X-Cache: HIT` or `MISS` on cached endpoints, and log
  hit/miss counters in Redis (keys `metrics:cache:hits`, `metrics:cache:misses`).
- Cache invalidation: after any transaction create/update/delete, delete all
  `analytics:{userId}:*` keys for the affected user.
- The app must still work if Redis is down (fail open, log a warning).

Rate limiting (backend/src/middleware/rateLimiters.js, express-rate-limit):
- authLimiter: 5 requests / 15 minutes, applied to /api/auth/login and /register
- transactionLimiter: 100 requests / 1 hour on /api/transactions
- analyticsLimiter: 50 requests / 1 hour on /api/analytics
- Return JSON 429 with a clear message and standard RateLimit headers.
- Optionally use rate-limit-redis as the store.
- Make limits configurable via env so I can raise them temporarily for testing
  (e.g. RATE_LIMIT_DISABLED=true skips them in development).

Verify: call GET /api/categories twice and show MISS then HIT; hit /auth/login
6 times and show the 6th returns 429. Commit:
"feat(backend): redis caching, invalidation, rate limiting".
```

**Checkpoint:** `X-Cache: MISS` then `HIT`; 6th login attempt gives 429.

---

## PHASE 5 — Analytics & Admin Users API (5:10 PM)

```
PHASE 5: Analytics and user management endpoints.

Analytics (authenticate, all roles, analyticsLimiter, cached 15 min via
cacheMiddleware; scoped to current user, admin may pass ?userId=):
- GET /api/analytics/summary?year=&month= -> totalIncome, totalExpense,
  balance, savingsRate, transactionCount, averageExpense.
- GET /api/analytics/monthly?year= -> array of 12 months:
  { month, income, expense, net } (fill missing months with 0).
- GET /api/analytics/yearly -> per-year income/expense totals.
- GET /api/analytics/category-breakdown?type=expense&year=&month= ->
  [{ category, total, percentage }].
- GET /api/analytics/trends?months=12 -> income vs expense per month for
  line/bar charts.
Use SQL aggregation (SUM, GROUP BY, date_trunc) with parameterized queries.

Admin users API (authorize('admin')):
- GET /api/users (paginated, search by name/email)
- GET /api/users/:id
- PATCH /api/users/:id/role  { role: admin|user|read-only }  (cannot demote self)
- DELETE /api/users/:id (cannot delete self)
- Invalidate that user's cache when their role/data changes.

Also add GET /api/metrics/cache (admin only) returning hits, misses, and hit rate
from the Redis counters.

Verify each endpoint with curl as admin/user/read-only (read-only CAN use
analytics; only admin can use /api/users). Commit:
"feat(backend): analytics endpoints and admin user management".
```

**Checkpoint:** read-only user can call analytics; `/api/users` returns 403 for non-admins.

---

## PHASE 6 — Swagger Docs & Backend Smoke Test (5:40 PM)

```
PHASE 6: API documentation and backend verification.

1. Set up swagger-jsdoc + swagger-ui-express, served at /api/docs and raw JSON
   at /api/docs.json. Define in OpenAPI 3: bearerAuth security scheme (JWT),
   schemas (User, Transaction, Category, Pagination, Error), and document EVERY
   endpoint (auth, categories, transactions, analytics, users, metrics, health)
   with request bodies, query params, responses (200/201/400/401/403/404/429),
   and which roles are allowed. Put docs in src/docs/ or JSDoc comments.
2. Write a script backend/scripts/smoke-test.js (plain Node fetch, no framework)
   that: logs in as each demo role, checks RBAC (read-only blocked from POST,
   user blocked from /api/users, admin allowed), checks pagination, checks the
   X-Cache MISS->HIT behavior, and prints PASS/FAIL per check. Add
   `npm run smoke`.
3. Fix any failures.

Commit: "docs(backend): swagger/openapi docs and smoke tests".
```

**Checkpoint:** `/api/docs` renders with the Authorize button working; `npm run smoke` all PASS. **Backend is done.**

---

## PHASE 7 — Frontend Foundation (6:00 PM)

```
PHASE 7: Frontend foundation in frontend/ (React 18 + Vite + React Router).

1. src/api/client.js: axios instance with baseURL from VITE_API_URL, request
   interceptor adding `Authorization: Bearer <token>`, response interceptor that
   logs the user out on 401 and shows a friendly message on 429.
2. src/context/AuthContext.jsx (useContext): state {user, token, loading},
   login(), register(), logout(), persisted in localStorage, restores session
   via GET /api/auth/me on load. Export useAuth() hook plus helper flags:
   isAdmin, canWrite (admin or user), isReadOnly. Wrap handlers in useCallback
   and the context value in useMemo.
3. src/context/ThemeContext.jsx: light/dark theme, persisted, toggled via
   data-theme on <html>, with CSS variables. Export useTheme().
4. Routing with lazy loading: in App.jsx use React.lazy for pages (Login,
   Register, Dashboard, Transactions, Users[admin]) wrapped in <Suspense> with a
   nice spinner fallback. Create:
   - ProtectedRoute (redirects to /login if unauthenticated)
   - RoleRoute (e.g. only admin can see /users; show 403 page otherwise)
5. Layout: responsive Navbar/Sidebar with app name, nav links (Dashboard,
   Transactions, Users only for admin), user name + role badge, theme toggle,
   logout button.
6. Pages: working Login and Register pages with validation and error display, and
   a "Demo credentials" box on Login (admin/user/read-only) that fills the form
   on click. Dashboard and Transactions can be placeholders for now.
7. Clean, modern, responsive styling (plain CSS with variables or Tailwind —
   pick one and stay consistent). Dark mode must look good.

Verify: login as each role, role badge shows correctly, Users link hidden for
non-admin, refresh keeps session, build succeeds (`npm run build`).
Commit: "feat(frontend): auth/theme contexts, lazy routes, layout, login".
```

**Checkpoint:** login works, protected routes redirect, theme toggle works, separate JS chunks in the build output.

---

## PHASE 8 — Transactions UI (6:40 PM)

```
PHASE 8: Transactions page.

1. src/hooks/useTransactions.js: fetches /api/transactions with filters +
   pagination, with debounced search (custom useDebounce hook, 400 ms), loading
   and error states, and a refetch() function.
2. Filters bar: search input, type (all/income/expense), category dropdown
   (from /api/categories), date range, min/max amount, sort selector, and a
   "Clear filters" button.
3. Transaction list:
   - Show date, description, category badge, type, amount (green for income,
     red for expense, formatted currency), actions.
   - Pagination controls (prev/next/page numbers, page-size selector).
   - VIRTUAL SCROLLING: implement for large lists using `react-window`
     (FixedSizeList) in a "Show all (virtualized)" mode that loads up to
     1000 rows (limit=100 paged loading is fine), OR on the normal list when
     rows > 50. Rows must keep consistent heights.
4. Add/Edit form in a modal: type toggle, amount, category (filtered by type),
   date, description; validation; submit loading state. Use useCallback for
   all handlers (onChange, onSubmit, onDelete, onEdit) and React.memo for the
   row component so rows do not re-render needlessly.
5. useMemo: compute page totals (income, expense, net, average) and the
   filtered/sorted client-side list; show them in a summary strip.
6. Delete with a confirmation dialog.
7. RBAC in UI: if user is read-only, hide or disable "Add", "Edit" and "Delete"
   (with a tooltip "Read-only access") and add a banner "You have read-only
   access". Also add a transaction details view (modal/drawer) available to all.
8. Empty state, loading skeletons, error toasts, success toasts.

Verify as all three roles; confirm read-only cannot see active write controls and
that the backend would reject them anyway. Build passes.
Commit: "feat(frontend): transactions page with filters, pagination, virtual scroll".
```

**Checkpoint:** CRUD works as `user`; read-only sees view-only UI; typing in search does not spam requests.

---

## PHASE 9 — Dashboard & Charts (7:25 PM)

```
PHASE 9: Dashboard with Recharts (all roles can access).

1. src/pages/Dashboard.jsx (lazy-loaded). Load charts in their own lazy
   components so Recharts is code-split.
2. Controls: year selector, month selector (or "Whole year"), view toggle
   Monthly / Yearly.
3. Summary cards: Total Income, Total Expense, Balance, Savings Rate (from
   /api/analytics/summary) with subtle icons/colors.
4. Charts (Recharts, responsive, tooltips, legends, interactive):
   - PIE chart: category-wise expense breakdown (click a slice to highlight and
     show amount + percentage; show a legend list beside it).
   - LINE chart: monthly trend (net balance and/or income & expense lines).
   - BAR chart: income vs expenses per month (grouped bars).
   - Optional: yearly overview bar chart.
5. Use useMemo to transform API data into chart-friendly format and useCallback
   for handlers. Show loading skeletons and empty states. Charts must adapt to
   dark/light theme (use CSS variables/theme context for colors).
6. Add a small "Cache" indicator badge that reads the X-Cache response header
   (optional but nice for the demo): shows "cached" or "fresh".
7. Ensure the read-only role can fully view the dashboard, and that adding a
   transaction then returning to dashboard shows updated numbers (cache is
   invalidated on the backend).

Verify visually and with `npm run build`. Commit:
"feat(frontend): analytics dashboard with pie, line, bar charts".
```

**Checkpoint:** all 3 chart types render with real data in both themes.

---

## PHASE 10 — Performance Metrics, README, Deploy, Final QA (7:55 PM)

```
PHASE 10: Finalize deliverables.

1. Performance metrics: create backend/scripts/benchmark.js that, for
   /api/analytics/summary and /api/analytics/category-breakdown, flushes the
   relevant cache, measures response time for the first request (MISS) and the
   average of 20 subsequent requests (HIT), then prints a table and saves
   docs/PERFORMANCE.md with: endpoint, miss ms, avg hit ms, speedup %, and the
   cache hit rate from /api/metrics/cache. Run it and commit the real numbers.
   Also show frontend bundle sizes from `vite build` (lazy chunks) in the doc.
2. README.md (root): project overview, features, tech stack, architecture
   diagram (ASCII or mermaid), folder structure, prerequisites, step-by-step
   local setup (docker compose up -d, backend .env, migrate, seed, run; frontend
   .env, run), demo credentials table (admin/user/read-only), RBAC permission
   matrix table, rate-limit table, caching strategy table (TTLs + invalidation),
   API docs link (/api/docs), performance results, screenshots placeholders,
   and deployment links placeholders.
3. Add `npm run dev` at root (concurrently) to start both apps, and a root
   .gitignore. Ensure .env files are not committed, .env.example files are.
4. Deployment preparation: add a Dockerfile for backend and frontend (or
   instructions) and a `render.yaml` or clear steps for deploying
   backend (Render/Railway with managed Postgres + Redis) and frontend
   (Vercel/Netlify). Make CORS/CLIENT_URL and VITE_API_URL env-driven.
5. Final QA pass: run the smoke test, build the frontend, check for console
   errors, unused code, missing loading/error states, and README accuracy.
   Fix everything you find.
6. Commit: "docs: README, performance report, deployment config" and show
   `git log --oneline`.
```

**Checkpoint:** `docs/PERFORMANCE.md` has real numbers, README is complete, `git log` shows ~10 meaningful commits.

---

## Fix Prompts (use when something breaks)

**Generic bug fix**
```
The following is broken: <describe what you expected vs. what happened>.
Error output: <paste the exact error/stack trace>.
Find the root cause (don't just patch the symptom), fix it, re-run the relevant
check to prove it works, and tell me which files you changed. Commit as
"fix: <short description>".
```

**RBAC audit (run before submitting)**
```
Audit RBAC end to end. For each of admin, user, read-only, test every backend
route and list: route, method, expected status, actual status. Also confirm the
frontend hides/disables write actions for read-only and the Users page is
admin-only. Fix any mismatch.
```

**Security audit**
```
Audit the backend for: SQL injection (any string-concatenated SQL), XSS (try
sending <script>alert(1)</script> in description and name fields and confirm it
is sanitized), missing validation, secrets in code, missing auth on routes,
missing rate limiters, and CORS/helmet config. Fix every issue and report.
```

**Requirements checklist check (final)**
```
Compare the repo against this checklist and mark each Done/Missing, then fix the
Missing items: JWT auth + protected routes, 3 roles + backend middleware +
frontend conditional rendering, transaction CRUD + categories + search/filter,
dashboard with pie/line/bar, lazy loading (React.lazy + Suspense), pagination,
virtual scrolling, useContext (auth + theme), useCallback, useMemo, Redis cache
(analytics 15 min, categories 1 hr, invalidation), express-rate-limit (auth
5/15min, transactions 100/hr, analytics 50/hr), XSS + SQL injection protection,
Bearer-token API calls, Swagger docs, README + setup, demo credentials,
performance metrics, separate frontend/backend folders, commit history.
```

---

## Tips to avoid errors

- **One phase per prompt.** Large combined prompts cause the agent to skip or half-do steps.
- **Always make it run the code** (the prompts say so). If it says "done" without running, reply: *"Run it and show me the output."*
- **Keep Docker running** (`docker compose up -d`) before Phases 1–6.
- **Test rate limits last.** While developing, use `RATE_LIMIT_DISABLED=true`, then switch it off for the final demo.
- **Don't rewrite working phases.** If Phase 8 needs a backend tweak, ask for only that tweak.
- **Don't commit `.env`.** Only `.env.example`.
- **Deploy early if short on time** — start the backend deploy right after Phase 6 in parallel while you build the frontend.

## Demo credentials (seeded in Phase 1)

| Role | Email | Password |
|---|---|---|
| admin | admin@demo.com | Demo@1234 |
| user | user@demo.com | Demo@1234 |
| read-only | readonly@demo.com | Demo@1234 |
