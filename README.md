# Personal Finance Tracker

A full-stack, enterprise-grade Personal Finance Tracker application with Role-Based Access Control (RBAC), interactive analytics, Redis caching, rate limiting, and OpenAPI/Swagger documentation.

## Tech Stack
- **Frontend**: React 18, Vite, React Router v6, Recharts, Virtual Scrolling (`react-window`)
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with `pg` driver (parameterized queries)
- **Cache**: Redis (`ioredis`)
- **Documentation**: Swagger / OpenAPI 3.0 (`swagger-ui-express`, `swagger-jsdoc`)

## Project Structure
```text
finance-tracker/
  backend/   # Node.js + Express REST API
  frontend/  # React 18 + Vite SPA
  docker-compose.yml
  README.md
```

## Status
- [x] Phase 0: Project Scaffold
- [ ] Phase 1: Database & Backend Skeleton
- [ ] Phase 2: Auth, JWT, RBAC & Security
- [ ] Phase 3: Transactions & Categories API
- [ ] Phase 4: Redis Caching & Rate Limiting
- [ ] Phase 5: Analytics & Admin Users API
- [ ] Phase 6: Swagger Docs & Backend Verification
- [ ] Phase 7: Frontend Foundation & Auth
- [ ] Phase 8: Transactions UI & Virtual Scrolling
- [ ] Phase 9: Dashboard & Recharts Analytics
- [ ] Phase 10: Performance Metrics & Final Polish
