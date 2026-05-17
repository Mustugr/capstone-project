# Roadmap — From Capstone to CUNY-Wide Deployment

> Companion document to [PURPOSE.md](./PURPOSE.md). PURPOSE describes what the app **is today**; this document describes what it would take to get from "Hunter CS capstone" to "institutional tool used by CUNY students and Public Safety staff."
>
> Audience: project team internally, plus anyone evaluating institutional adoption (department chair, dean, CUNY IT).

---

## 1. Context

The Lost & Found Portal is a fully working web app:
- React 19 / Vite 7 frontend
- Node.js / Express 4 backend
- PostgreSQL on Supabase
- Real-time messaging via Socket.io
- LLM-backed assistant (Hawk AI) with verification-first design
- Auditable, with role-based access, rate limiting, fraud-lockout, ticket numbers, and structured ownership claims

What it is **not** yet:
- Not behind CUNY single sign-on (anyone with an email can register)
- Not multi-campus (one shared dataset)
- Not formally audited for accessibility, FERPA, or security
- Hosted on Vercel (frontend) + Render (API) + Supabase (DB) — vendor stack not yet aligned with CUNY infrastructure

The plan: pilot the app **as-is** to demonstrate working value, then deliver an institutional version in phases.

---

## 2. Three-tier delivery plan

The work is split into tiers so adoption can happen in stages. **Tier 1 unlocks a Hunter-only pilot. Tier 2 unlocks CUNY-wide. Tier 3 is the steady-state operational baseline.**

### Tier 1 — Non-negotiable for any institutional pilot

These four items gate any deployment that touches real CUNY student data.

#### 1.1 SSO / CUNYfirst integration
- **Why**: Today anyone with any email can register. Real institutional use must verify the user is an active CUNY student or staff member.
- **Implementation**:
  - Add a SAML 2.0 SP (service provider) endpoint to the API using `@node-saml/passport-saml` (the maintained fork; the original `passport-saml` package is deprecated) or `samlify`. CUNY may run Shibboleth specifically — same SAML 2.0 underneath, but worth confirming with their IdP team.
  - One new route: `/api/auth/sso/callback`. On successful assertion, find-or-create a `profiles` row keyed by CUNYfirst-verified email + full name, issue the existing JWT, continue.
  - Replace the registration form with an "Sign in with CUNYfirst" button. Keep email/password for legacy admins or kill it entirely.
- **Code estimate**: ~200 lines, 3–5 working days.
- **Calendar estimate**: **4–6 weeks** — bottleneck is CUNY IT giving you IdP credentials, approving the service in their identity provider, and scheduling test rounds.

#### 1.2 FERPA posture
- **Why**: Student data is a student record. CUNY's General Counsel will require evidence of FERPA-aligned handling.
- **What's already done** (this codebase):
  - JWT authentication, role-based access enforced server-side.
  - bcrypt-hashed passwords (cost 10), 7-day token expiry.
  - Auditable: every chat turn → `chat_logs`, every state change → DB rows.
  - `viewed_by_admin` tracks who saw what; `student_last_read_at` / `admin_last_read_at` add per-conversation read state.
  - Data minimization for AI: the `search_found_items` tool returns `{ match_found: boolean }` only — no found-item data (descriptions, locations, storage) is sent to Anthropic. The student's own chat messages do flow to Anthropic, which is why a DPA with Anthropic is still required even with the boolean tool.
- **What's missing**:
  - Written data retention policy (auto-delete resolved reports + claims after N months/years).
  - "Right-to-delete" endpoint — student requests account erasure → cascading deletion.
  - Data export endpoint — student requests a copy of all data we hold on them.
  - DPAs (Data Processing Agreements) signed with Supabase and Anthropic. Anthropic offers Zero Data Retention for enterprise; Supabase offers BAA / DPA on paid tiers.
- **Code estimate**: ~2–3 days for the endpoints.
- **Calendar estimate**: **weeks of legal back-and-forth** for the actual policies and signed contracts — owned by Counsel, not engineering.

#### 1.3 Accessibility (Section 508 / WCAG 2.1 AA)
- **Why**: CUNY is a public university. Accessibility compliance is not negotiable for any student-facing tool.
- **Known gaps in the current codebase** (informal audit):
  - Several icon-only buttons (back arrow, ✕ modal close, hamburger menu, drag-and-drop upload) lack `aria-label`.
  - Modal focus traps not implemented (Tab key escapes the modal).
  - Color contrast on muted gray text (`var(--muted)`) likely fails the 4.5:1 ratio against light backgrounds.
  - No "Skip to main content" link.
  - Some `<input>` elements rely on placeholders rather than persistent `<label>` text.
  - Keyboard navigation through the conversation list / message thread not explicitly tested.
- **What's needed**:
  - Manual screen-reader pass (NVDA on Windows, VoiceOver on Mac/iOS).
  - Automated checks with axe-core / Lighthouse — fix all critical and serious issues.
  - Documented accessibility statement on the public site.
- **Estimate**: **3–4 weeks** for a real audit + remediation, not 2. Optimistic estimates here always blow up because screen-reader bugs are subtle.

#### 1.4 JWT-role staleness fix (HTTP side) ✅ DONE
- **Status**: Shipped. `server/middleware/auth.js` now treats the JWT as identity-only and re-reads `role` from `profiles` on every protected request. Both `requireAuth` and `requireAdmin` go through the same DB lookup; `requireAdmin` checks the freshly-fetched role rather than the JWT claim.
- **Verification**: all routes only consume `req.user.{id, email, role}`, which the new code still sets. A demoted admin loses HTTP admin access on the next request, matching the existing Socket.io behavior.

#### 1.5 Restrict `GET /api/found-items` to admins ✅ DONE
- **Status**: Shipped. Both `router.get('/', …)` and `router.get('/:id', …)` in `server/routes/foundItems.js` now use `requireAdmin`; the unused `requireAuth` import was removed. A student JWT hitting either endpoint directly now gets `403 Admin access required` instead of the inventory.
- **Verification**: every client-side caller (`AdminDashboard.jsx`, `AdminAddItemPage.jsx`, `ModalOverview.jsx`) is admin-only, so the UI is unaffected. No student-facing page calls `/found-items`.

---

### Tier 2 — Required before multi-campus rollout

#### 2.1 Multi-tenancy (campus scoping)
- **Why**: Hunter's lost-and-found office must not see Brooklyn College's items. Today there's no `campus_id` anywhere.
- **Implementation**:
  - Add `campus_id` column to `profiles`, `lost_reports`, `found_items`, `claims`, and `chat_logs`. `messages` is transitively scoped via `report_id`, so the scope-by-campus check there is a join through `lost_reports` — fine for current query volume, but worth denormalizing `campus_id` onto `messages` if `messages` ever grows enough that the extra join hurts.
  - Every query gets a `WHERE campus_id = $current` clause; admins only see their campus.
  - Admin role can be extended with `campus_id` so a Hunter admin doesn't have rights at Brooklyn.
  - The Hawk AI search tool is filtered by campus too — students searching at Hunter won't get matches from Brooklyn's inventory.
  - Add a campus selector (or auto-derive from SSO claims — CUNYfirst exposes the user's home campus).
- **Estimate**: **1–2 weeks** code, plus UI work for admin scoping.

#### 2.2 Production-grade rate limiting + persistent state (Redis)
- **Why**: Two real problems with the current `middleware/chatLimit.js`:
  1. Counters live in an in-memory `Map` at module scope. Render restart wipes them — a user could exceed the daily quota by triggering a deploy.
  2. The moment you horizontally scale (CUNY-wide will demand multiple API instances), each instance has its own `Map` — the daily limit becomes `instances × 30`, not `30`.
- **Implementation**:
  - Provision Redis (managed via AWS ElastiCache, Upstash, or wherever CUNY hosts).
  - Replace the `Map` with a Redis `INCR` keyed by `chat:msg:{user_id}:{YYYY-MM-DD}` with a 48h `EXPIRE`.
  - Same pattern for `chat:tool:{user_id}:{YYYY-MM-DD}`.
- **Estimate**: **2–3 days** including testing.

#### 2.3 Security audit / penetration test
- **Why**: CUNY IT Security will require this before any cross-campus rollout. Even if internal, an explicit written audit creates accountability.
- **Scope**:
  - Standard OWASP Top 10 review (XSS, CSRF, SQL injection, IDOR, etc.).
  - Prompt-injection adversarial testing against Hawk AI.
  - Rate-limit bypass attempts.
  - Privilege-escalation attempts (student → admin).
- **Estimate**: **1–2 weeks** of testing + CUNY's internal review calendar.

#### 2.4 Performance / load testing
- **Why**: Finals week traffic spike. ~20,000+ students across CUNY could all hit the app in the same week. Need to know breakpoints before users find them.
- **What to test**:
  - DB connection pool sizing.
  - Query plans on `messages` joined with `lost_reports` at 100k+ rows.
  - WebSocket connection count limits (Socket.io has known per-instance ceilings).
  - Image upload throughput.
- **Tooling**: `k6` or `artillery`. Run against a copy of the production environment.
- **Estimate**: **1 week**.

---

### Tier 3 — Operational maturity

#### 3.1 Test infrastructure + CI
- **Why**: Zero automated tests today. Every change is a gamble on whether something silently broke. As more developers contribute (CUNY IT, future capstones), this is unsustainable.
- **Minimum coverage**:
  - Auth: register, login, role check, JWT staleness.
  - Ticket generation: format + uniqueness under contention.
  - Hawk AI guards: one-search-per-conversation, stop-word rejection, daily limits, fraud lockout.
  - Claims flow: approve, reject, fraudulent → auto-message + lockout.
  - Read receipts: `read_by_other` computation correctness.
- **Stack**: Vitest for unit (natural fit — the client is already Vite-based, so config/ESM/transform are shared); supertest for API integration on the Express side; Playwright for E2E. GitHub Actions for CI.
- **Estimate**: **1–2 weeks** for baseline coverage.

#### 3.2 Database backups + disaster recovery
- **Why**: Supabase auto-backups exist but the restore procedure, RPO (recovery point objective), and RTO (recovery time objective) haven't been documented or tested.
- **Deliverables**:
  - Written DR runbook: "How to restore from backup." Includes the actual commands.
  - Documented RPO (e.g., "we may lose up to 1 hour of data") and RTO (e.g., "we will be back online within 4 hours").
  - One drill per quarter where you actually restore into a staging environment to prove it works.
- **Estimate**: **2–3 days** for documentation + first drill.

#### 3.3 Error tracking + observability (Sentry / similar)
- **Why**: Today, errors disappear into `console.error()` on Render's stdout. Real bugs in production are invisible until a user reports them.
- **Implementation**:
  - Add Sentry SDK to both client and server.
  - Tag every event with user id, route, ticket number where applicable.
  - Set up alert channels (Slack / email) for new error types.
- **Estimate**: **1 day**.

#### 3.4 Migration framework
- **Why**: SQL migrations are currently run by hand in the Supabase SQL Editor. This works for one developer but breaks when there are multiple environments (dev / staging / prod) or multiple campuses to keep in sync.
- **Implementation**:
  - Adopt `node-pg-migrate` or Knex migrations.
  - Convert existing ad-hoc SQL into numbered migration files.
  - Run migrations automatically on deploy.
- **Estimate**: **2–3 days**.

#### 3.5 Admin RBAC granularity
- **Why**: Currently all admins have all permissions. A real campus office wants role tiers — e.g., intake clerk, supervisor, auditor. Only supervisors approve fraudulent rejections; only auditors read `chat_logs`.
- **Implementation**:
  - Replace `role IN ('student','admin')` with a richer role table or scopes column.
  - Apply scope checks on each endpoint.
- **Estimate**: **3–5 days**.

#### 3.6 Email notifications for state changes
- **Why**: Users not in the app right now don't know admin replied / claim approved. The current real-time UI is great when active; bad when away.
- **Implementation**:
  - Use Resend, Postmark, or institutional SMTP.
  - Trigger emails on: claim approved, claim rejected, message received (rate-limited so we don't spam).
  - User preference to opt out per category.
- **Estimate**: **3–5 days**.

#### 3.7 Image moderation
- **Why**: Currently admins can upload anything as a found-item photo. When admin count grows, you need a safety net for inappropriate content.
- **Implementation**:
  - Server-side check on `POST /found-items` via AWS Rekognition or Google Cloud Vision (NSFW + violence detection).
  - Reject + alert if confidence > threshold.
- **Estimate**: **1–2 days**, free tier covers low volume.

#### 3.8 AI cost monitoring
- **Why**: Anthropic API spend grows with student usage. Without monitoring, a runaway prompt-injection campaign or buggy loop could spike costs overnight.
- **Implementation**:
  - Track tokens-in / tokens-out per chat turn in `chat_logs` (we already have the table, just add columns).
  - Daily dashboard / alert at $X spend.
- **Estimate**: **2 days**.

#### 3.9 Operational runbook
- **Why**: When something breaks at 2 AM, the on-call admin needs a checklist, not a guess. Auditors love these and they take a day to write.
- **Contents**:
  - "Messages page is 500ing — here's how to triage."
  - "Hawk AI is refusing all messages — likely DB migration missed; here's how to verify."
  - "Socket connections failing — here's where to check JWT verification logs."
- **Estimate**: **1–2 days** for v1.

---

## 3. Hosting & infrastructure migration

This question came up specifically: *"If CUNY approves, how hard is it to move off Vercel / Render / Supabase?"*

**Short answer: easy, because the codebase was deliberately built portable.** All configuration is environment-variable driven (`DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `CORS_ORIGIN`, `SUPABASE_URL`, `SUPABASE_KEY`). There are no vendor-lock-in features in the application code itself.

### What each component looks like today vs. tomorrow

| Component | Today | Realistic CUNY home |
|---|---|---|
| Frontend (React build) | Vercel | Any static host — CUNY's nginx, AWS S3 + CloudFront, Azure Static Web Apps, even still Vercel if approved. Build output is just static files. |
| Backend (Express + Socket.io) | Render | CUNY-managed VM, AWS ECS, Azure App Service, on-prem container. Anywhere that runs Node. |
| Database | Supabase Postgres | CUNY-managed Postgres (most likely) or AWS RDS in their account. Postgres standard, easy `pg_dump` / `psql` migration. |
| Object storage (images) | Supabase Storage | Likely AWS S3 in their account. The codebase only uses a thin abstraction (upload buffer → get public URL). Trivial swap. |
| LLM | Anthropic API direct | Same, plus a DPA signed by CUNY's legal team. Possibly via Anthropic's enterprise tier with Zero Data Retention. |

### Migration steps if CUNY approves

1. **Receive their infrastructure spec**: hosting standards, IdP info, network requirements, security review checklist.
2. **Provision**: they stand up the Postgres instance, hosting environment, S3 bucket equivalent, and SAML IdP entry for your service.
3. **Local dev parity**: update your `.env.example` with the new variable names if any.
4. **Data migration** (if any data carries over from the pilot): `pg_dump` from Supabase, `psql` import to theirs. ~30 minutes for a small dataset.
5. **Deploy**: push the frontend build to their static host, deploy the backend container, point DNS.
6. **Smoke test**: run through the happy paths end-to-end in their environment.
7. **SSO go-live**: cut over from email/password to SSO. Optionally keep email/password as a fallback for legacy admins.

**Time estimate, end-to-end migration**: **1–2 weeks of engineering work** spread over the calendar weeks CUNY IT needs to provision their side. The blocker is always them, not you.

---

## 4. SSO integration plan (detailed)

This is the most consequential single change post-approval. Here's the concrete plan.

### Today's auth (kept as fallback during transition)
- `POST /api/auth/register` — email/password, bcrypt hash, JWT issued.
- `POST /api/auth/login` — email/password, bcrypt compare, JWT issued.
- `GET /api/auth/me` — verify JWT, return user.
- Frontend stores JWT in `localStorage`; every request adds `Authorization: Bearer <token>`.

### New flow with SSO
- User clicks "Sign in with CUNYfirst" on the login page.
- Browser is redirected to CUNY's SAML IdP.
- User authenticates with their CUNY credentials.
- IdP redirects back to `/api/auth/sso/callback` with a signed SAML assertion.
- Backend validates the assertion (signature, audience, expiry).
- Backend looks up the user by the verified email; creates a `profiles` row if first time, with `full_name` from the SSO claims and `campus_id` from the affiliated school.
- Backend issues a normal JWT (same shape as today).
- Frontend receives the JWT (via redirect or cookie), stores it, proceeds as normal.

### What stays the same
- The JWT format and verification.
- All downstream routes (`/api/reports`, `/api/messages`, `/api/chat`, etc.) — they don't care how the JWT was issued.
- The frontend session model.

### What changes
- The registration form goes away.
- The login page becomes a single "Sign in with CUNYfirst" button.
- Email/password endpoints are kept for emergency admin access but removed from the UI.
- Profile creation is JIT (just-in-time) on first SSO login, not via a registration form.

### Library choice
- `@node-saml/passport-saml` is the maintained option for Node/Express (the original `passport-saml` was deprecated and the project moved to the `@node-saml` org). `samlify` is a viable alternative if you want a non-passport API.
- Configuration: IdP entry URL, IdP certificate (from CUNY), SP certificate (you generate), entity ID.

### JWT delivery choice
The frontend currently stores the JWT in `localStorage` and attaches it to every request via `Authorization: Bearer …`. After SSO, the backend has to get the JWT back to the browser somehow. Two options, and the choice has security implications:
- **Redirect with token in URL fragment** → frontend script reads it and stashes in `localStorage`. Keeps the existing model exactly; same CSRF posture (none, because no cookies). Mildly ugly URL during the redirect step.
- **HttpOnly cookie** → server sets the cookie on callback; frontend stops touching the token. Better XSS posture (script can't read the token), but introduces CSRF concerns that the current Bearer-token model doesn't have — would need `SameSite=Lax`/`Strict` and possibly a CSRF token for state-changing routes.

Pick one explicitly. Don't ship both code paths.

### Code estimate
- ~200 lines: the callback route, the user-find-or-create helper, the redirect handling.
- ~3–5 working days, most of which is testing with CUNY's IdP, not writing code.

---

## 5. What to do **now**, before approval

Don't pre-build CUNY infrastructure they may want to spec themselves. But these prep items make the eventual transition painless and cost nothing today:

1. **Keep config env-driven** — already done. Maintain discipline; no hardcoded URLs or secrets.
2. **Write a 1-page deployment guide** (`docs/DEPLOY.md`): what every env var does, how to run a fresh migration, what the moving parts are. CUNY IT will love you.
3. **Convert ad-hoc SQL into numbered migration files** under `migrations/`. Even if you don't adopt a framework yet, having `001_initial.sql`, `002_add_chat_logs.sql`, ... is a huge step up.
4. **Document the C4 architecture** — already done in `docs/architecture/workspace.dsl`. Keep it current.
5. **Avoid Supabase-specific functions**. Stick to standard Postgres — already true.
6. **Tighten security low-hanging fruit**: both the `GET /api/found-items` admin-restriction fix (§1.5) and the JWT-role staleness fix (§1.4) are done. Code-level Tier 1 security gaps are now closed; remaining Tier 1 items are calendar-bound on CUNY (SSO, FERPA, accessibility).
7. **Add automated tests for the highest-value paths** — auth, ticket generation, Hawk AI guards. Even 50% coverage is dramatically better than zero.

---

## 6. Realistic post-approval calendar

If the dean/CUNY IT greenlights this, here is the honest sequence:

| Phase | Calendar weeks | What happens |
|---|---|---|
| Kickoff | 1 | First meeting with CUNY IT — they share hosting standards, IdP info, security checklist. |
| Tier 1 build | 4–8 | SSO integration, FERPA endpoints, accessibility audit + remediation, JWT staleness fix. Mostly waiting on CUNY for IdP credentials and security review. |
| Tier 1 UAT | 2 | Hunter pilot with real users (small group). Bugs found and fixed. |
| Tier 1 go-live | 1 | Public launch at Hunter. |
| Tier 2 build | 4–6 | Multi-tenancy, Redis migration, security audit, load test. |
| Tier 2 UAT + rollout | 4–8 | Campus-by-campus rollout. |
| Tier 3 | Ongoing | Tests, observability, runbook, migration framework, RBAC granularity, email notifications, image moderation, AI cost monitoring. Continuous improvement. |

**Total to "CUNY-wide adoption" from approval: ~4–6 months.** Most of which is calendar time, not engineering time.

---

## 7. Open risks and unknowns

These are honest gotchas worth surfacing now, not discovering mid-project:

1. **CUNYfirst SSO bureaucracy** — getting IdP credentials approved is the longest single dependency. Plan for slippage.
2. **Database hosting choice** — if CUNY insists on Oracle (their main institutional DB), the data layer needs rewriting (Postgres-specific syntax: `RETURNING`, `SERIAL`, `JSONB`). Most likely they'll provision Postgres, but not guaranteed.
3. **Anthropic DPA** — CUNY's legal team must sign a Data Processing Agreement with Anthropic. The architecture already minimizes what reaches the LLM, so the legal lift should be modest, but it takes time.
4. **CUNYfirst data freshness for `campus_id`** — students change campuses, transfer, graduate. Does SSO push role and campus changes in near-real-time, or only at login? Affects how stale a user's campus can be. **Standard mitigation**: refresh `campus_id` and `role` from SSO claims on every login, plus a nightly directory sync to catch users who haven't logged in since their record changed.
5. **Disability Services accommodations** — even after passing WCAG 2.1 AA, individual students may need specific accommodations (e.g., extended session timeouts, larger fonts, custom workflows). Plan for ad-hoc requests.
6. **Branding compliance** — CUNY has visual identity rules. The current disclaimer modal pivots from "not affiliated" to "officially licensed." Trivial code change, but legal sign-off has its own calendar.
7. **Public Safety integration depth** — if Public Safety adopts this, they may want integration with their existing case management system. That's a separate API design conversation.

---

## 8. Bottom line for the dean meeting

The capstone codebase is genuinely production-shaped: env-driven config, role-based access, verified-account-required claim flow, audit logs, security-first AI design, ticket numbers, fraud lockout. **The roadmap above is closing the institutional gap, not rebuilding the app.**

**Ask:**
- Approval for a Hunter-only pilot, gated by Tier 1.
- A named point-of-contact in CUNY IT for the SSO and infrastructure integration.
- Sponsorship to navigate Counsel + General Counsel for FERPA / DPA work.

In return, the team delivers a working Hunter pilot in 2–3 months and is ready for CUNY-wide rollout in 4–6 months after that.
