# MASTER PROMPT v2: BUILD VRPI HRMS (ZOHO PEOPLE-INSPIRED) IN ANTIGRAVITY

Act as a senior software architect, React Native engineer, React engineer, Node.js backend engineer, database architect, UI/UX designer, and QA engineer.

Build a production-oriented Human Resource Management System (HRMS) inspired by Zoho People, with three connected components:

1. An Android employee mobile app.
2. A web HR/admin dashboard.
3. A secure backend API with a PostgreSQL database.

Immediate delivery goal: a working, installable Android APK for a physical phone, backed by real APIs and persistent storage (no static screens or mock-only features).

Use original VRPI HRMS branding and assets. Do not copy Zoho logos, assets, or protected branding.

---

# 0. OPERATING RULES (READ FIRST)

These rules override everything else in this prompt.

1. **Honesty.** Never claim a command succeeded, a skill installed, a test passed, an APK built, or a feature works on a device unless you actually observed it. Paste real command output summaries. If something cannot be done from this environment, say so plainly.
2. **Things only the human can do.** You cannot hold a physical phone, complete an interactive `eas login`, or accept Expo/Google account prompts. When you reach such a step, stop, give the user the exact instructions, and wait for their report. Treat their report as the evidence for the test.
3. **Phase gates.** Complete one phase, verify it, report, and then continue. Do not generate the whole project in one pass. At the end of each phase, stop and wait for "continue" only if acceptance criteria failed or a human action is needed; otherwise proceed to the next phase.
4. **Progress file.** Maintain `docs/PROGRESS.md` (current phase, completed items, open blockers, decisions made, exact commands to resume). Update it at the end of every phase so work survives a session restart.
5. **Non-destructive.** Inspect before changing. Never overwrite existing config blindly, never run destructive DB commands against anything but a dedicated dev/test database, never commit `.env` files.
6. **Pin and verify versions.** Choose current stable versions of Expo SDK, React Native, Prisma, Node LTS, and Express. Record them in `docs/architecture.md`. Run `npx expo-doctor` and fix dependency mismatches before building.
7. **Minimal permissions, minimal dependencies.** Prefer fewer libraries. Justify each major dependency in one line in the architecture doc.
8. **Scope discipline.** Features marked *(Post-MVP)* are designed for but not built in the first MVP.

---

# 1. FIRST: INSPECT THE PROJECT AND INSTALL SKILLS

Before modifying any files:

- Inspect the repository, directory structure, package files, Node/npm versions, Git status, existing code, environment configuration, and available Antigravity skills.
- Detect whether this is a new project or an extension of an existing one.
- Check tooling: Node.js (LTS), npm, Git, PostgreSQL (`psql --version`), and whether the PostgreSQL service is running.
- Write a short implementation plan in `docs/implementation-plan.md` before coding.

Install and use these skills. **Read each repository's README first and use the command it currently documents**, because CLI names and flags change. The commands below are the expected ones, not guaranteed.

**Skill 1: UI/UX Pro Max** — https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
Expected: `npx ui-ux-pro-max-cli init --ai antigravity` (verify the package name and flag against the README).
Use it for the design system: typography, palette, components, responsive layouts, dashboard patterns.

**Skill 2: Expo Skills** — https://github.com/expo/skills
Expected: `npx skills@latest add expo/skills --skill '*'`, then select Antigravity as the target agent.

After installing each skill:
- List the actual installed skill files and names (for example under `.agents/skills/`).
- Read their instructions and state which ones you will follow.
- Refresh/restart the agent session if required.
- If installation fails, troubleshoot using the repository docs. If it still fails, report the failure and continue with the design system documented manually in `docs/design-system.md`. Never pretend it installed.

---

# 2. TECHNOLOGY STACK

Lightweight TypeScript monorepo using npm workspaces.

## Android employee app
- React Native + Expo (pinned stable SDK), TypeScript, Expo Router
- Zustand (client state), React Hook Form + Zod
- TanStack Query for server state and caching
- Expo SecureStore for tokens
- `expo-build-properties` for Android network config
- `expo-file-system` + `expo-sharing` for payslip PDF download/open
- `expo-notifications` *(Post-MVP; in-app notifications first)*
- EAS Build (cloud) for the APK

## Web HR/admin dashboard
- React + Vite + TypeScript, Tailwind CSS, shadcn/ui (or equivalent accessible primitives)
- Zustand, React Hook Form + Zod, TanStack Query, Recharts, Lucide icons

## Backend
- Node.js (LTS), Express, TypeScript, REST, Prisma ORM, PostgreSQL
- Zod validation, Argon2id (preferred) or bcrypt with a strong cost for password hashing
- Short-lived JWT access tokens + rotating refresh tokens
- Pino structured logging with redaction, `helmet`, `cors`, `express-rate-limit`
- Vitest (or Jest) + Supertest for tests
- OpenAPI/Swagger spec generated or hand-maintained for `/api/v1`

## Shared package
`packages/shared`: types, Zod schemas, role/permission enums, API contracts. Configure it so both Metro (mobile) and Vite (web) resolve it correctly; verify that the mobile bundler actually builds with it.

## Constraints
- Windows development machine, about 8 GB RAM. No Docker, Kubernetes, Elasticsearch, or other heavy services.
- Use local PostgreSQL or a free managed PostgreSQL (for example Neon or Supabase). Document both options.
- Run only the processes you need at a time (backend + one client) to save memory.
- All commands must work in Windows PowerShell. Do not use `&&` chaining or Unix-only commands in documented steps; use separate lines or `;`. Mention the PowerShell execution-policy fix if scripts are blocked, and the Windows long-path setting if installs fail.

---

# 3. PROJECT STRUCTURE

```
vrpi-hrms/
  apps/
    mobile/   (app/, components/, features/, services/, hooks/, stores/, assets/, app.json, eas.json, package.json)
    web/      (src/components, layouts, pages, features, services, hooks, stores, routes; package.json)
  backend/
    src/      (config, middleware, modules, routes, services, utils, app.ts, server.ts)
    prisma/   (schema.prisma, migrations/, seed.ts)
    tests/
    package.json
  packages/shared/  (src/, package.json)
  docs/
    architecture.md, database-schema.md, api-reference.md, implementation-plan.md,
    testing-guide.md, apk-build-guide.md, design-system.md, PROGRESS.md
  .agents/skills/
  .env.example
  .gitignore
  package.json
  README.md
```

Adapt to an existing repo where needed. Avoid duplicate files and unnecessary abstractions. Put root scripts in `package.json` (for example `dev:backend`, `dev:web`, `dev:mobile`, `db:migrate`, `db:seed`, `test`, `lint`, `typecheck`).

---

# 4. ROLES AND ACCESS CONTROL

Roles: Super Admin, HR Admin, HR, Employee.

Implement a **permission matrix** (resource x action x role) in `packages/shared` and document it in `docs/architecture.md`. Enforce it in backend middleware on every protected route. Do not rely on hiding UI as security.

Baseline:
- **Super Admin:** organization configuration, manage HR Admins and roles, org-wide settings and reports.
- **HR Admin:** employee records, attendance and leave policies, leave approvals/delegation, salary records and payslips, authorized reports.
- **HR:** view/update permitted employee fields, review attendance, process assigned leave requests, onboarding documents, authorized HR reports. HR does **not** see salary data unless explicitly granted.
- **Employee:** own profile (permitted fields), check in/out, own attendance, apply for leave, own balances and decisions, own payslips/salary, own documents and notifications. Managers (employees with direct reports) may optionally approve leave for their reports.

Requirements: least privilege, organization isolation (every query scoped by `organizationId`), ownership checks (IDOR protection), audit logs for sensitive actions, protection against privilege escalation (a user cannot grant a role above their own).

---

# 5. ANDROID EMPLOYEE APP

Polished, mobile-first, bottom-tab navigation for primary sections and stack navigation for details.

**Authentication:** login, logout, session restoration, expired-session handling, secure token storage, clear validation and error messages. Forgot-password: implement only when SMTP is configured (document dev setup with a mail catcher or SMTP provider); otherwise provide "contact HR to reset" and an HR/Admin-initiated temporary-password reset with forced password change on next login.

**Home dashboard:** name/photo, employee ID, department, today's attendance status, check-in/out, today's hours, leave balance summary, upcoming holidays, recent attendance, pending leave requests, announcements/notifications.

**Attendance:** check in/out with server timestamps; history by date; daily status; working hours; permitted breaks. Handle duplicate check-ins, invalid check-outs, flaky networks (idempotency key per action so a retry never creates a duplicate), and device clock tampering (server time is authoritative; never trust a client timestamp). Location/geofencing is *(optional, off by default)*: if enabled, request permission transparently, enforce on the backend, never track silently.

**Leave:** balances, configurable leave types, apply with start/end date (half-day support), reason, validation of duration and overlaps, status list (pending/approved/rejected/cancelled), approval comments, cancellation where policy permits, notification on status change.

**Profile:** personal details, employee ID, department, designation, reporting manager, joining date, contacts, emergency contact, photo, editable fields per permission.

**Payslips/salary:** list by month/year, view/download authorized PDFs via authenticated endpoint or short-lived signed URL, salary history only where permitted. Never expose via public URLs.

**Also:** shift schedule, holiday calendar, documents, announcements, notifications, settings, light/dark themes, loading/empty/offline/error states. Show a clear offline banner and block write actions while offline instead of silently failing.

---

# 6. WEB HR/ADMIN DASHBOARD

Responsive enterprise dashboard (desktop/tablet first, usable on mobile): collapsible sidebar, top bar, search, notifications, user menu, breadcrumbs, consistent cards/tables/forms/dialogs, keyboard accessibility, light/dark modes, skeletons and empty states, design tokens.

**Overview:** total/active employees, new hires, present/absent today, pending leave requests, headcount by department, attendance trends, attrition/retention (only with sufficient data), upcoming birthdays/anniversaries/holidays, recent HR activity. Compute from the database; show "Not enough data" rather than zero when a metric is unavailable.

**Employees:** directory with search/filter/pagination, detail pages, add/edit/deactivate (soft delete), departments, designations, manager assignment, status, unique employee-ID generation, CSV import/export with row-level validation, a preview step, and per-row error report, gated by permission.

**Attendance:** daily overview, per-employee history, late/absent per policy, hours calculation, filters, authorized corrections with a required reason and audit trail, export.

**Leave admin:** types and policies (accrual, carry-forward, max consecutive days), balances, request inbox, approve/reject with comments, approval history, holiday calendars, approval rules, conflict/duplicate prevention.

**Payroll records (MVP scope):** salary records, history, pay-period metadata, payslip upload/management, private storage, per-employee access. Do **not** claim statutory payroll, tax computation, bank transfers, or disbursement. *(India-specific PF/ESI/TDS calculations are Post-MVP.)*

**Reports:** headcount, attendance/absenteeism, leave utilization, new hires, attrition/retention, salary distribution (authorized roles), date filters, CSV export. Recharts visualizations driven by real queries.

---

# 7. BACKEND API

Modular Express API, versioned under `/api/v1/*`. Modules: auth, users/sessions, organizations, employees, departments, designations, attendance, leave types, leave balances, leave requests, holidays, shifts, payslips, salary records, documents, notifications, reports, audit logs, settings.

Implement: consistent response and error envelope (with machine-readable error codes), request validation, centralized error handling, pagination/sorting/filtering, DB transactions for multi-step operations (for example leave approval that updates the balance and writes history), correct status codes, auth and authorization middleware, rate limiting on auth and sensitive endpoints, log redaction, `/health` and `/ready` endpoints, OpenAPI docs, automated tests.

**Time handling:** store all timestamps in UTC. Each organization has a configured IANA timezone (default `Asia/Kolkata`). Compute "attendance date", late marks, and shift boundaries in the organization timezone. Test cases must include midnight and day-boundary behavior.

**Files:** local disk storage outside the web root for development, behind a storage interface so an S3-compatible provider can be swapped in. Validate file type by content (magic bytes), enforce size limits, generate random filenames, and serve only through authorized endpoints or short-lived signed URLs. Optionally virus-scan *(Post-MVP)*.

Never return passwords, hashes, refresh tokens, or unnecessary sensitive data.

---

# 8. DATABASE DESIGN

Prisma + PostgreSQL. Entities: Organization, User, Role/permission assignments, Employee, Department, Designation, manager relationships, Session (refresh token family), AttendanceRecord, Shift, Holiday, LeaveType, LeaveBalance, LeaveRequest, LeaveApprovalHistory, SalaryRecord, Payslip, EmployeeDocument, Notification, AuditLog, OrganizationSettings, IdempotencyKey.

Include: primary and foreign keys, indexes on common filters (`organizationId`, `employeeId`, date columns), `(organizationId, employeeCode)` uniqueness, timestamps, soft-delete fields where history matters, referential integrity, and date-range checks (`endDate >= startDate`).

Use raw SQL migrations where Prisma cannot express a constraint, for example:
- one open attendance record per employee per day (partial unique index),
- no overlapping approved/pending leave per employee (exclusion constraint using `daterange` and `btree_gist`).

Store money as `Decimal` (never float) with currency code.

Seed with **synthetic data only**: one sample organization, Super Admin, HR Admin, HR user, about 10-20 employees across departments, attendance history, leave requests in several states, salary records, holidays. Generate seed passwords from env variables or print them once at seed time; document dev credentials in the README as development-only, never reuse in production.

---

# 9. SECURITY AND PRIVACY

- Password hashing (Argon2id preferred); password policy; account lockout/backoff after repeated failures.
- Access tokens ~15 minutes. Refresh tokens: rotating, stored hashed server-side, with **reuse detection** (reuse of a rotated token revokes the whole token family), per-device sessions, and revocation on logout/password change/deactivation.
- Web: refresh token in an HttpOnly, Secure (in HTTPS), SameSite cookie with CSRF protection (double-submit token or custom header check) for cookie-authenticated state-changing requests; access token kept in memory only.
- Mobile: tokens in SecureStore; refresh token sent in the request body to a dedicated mobile-safe endpoint (no cookies).
- Explicit CORS allowlist; `helmet` headers; strict input validation; schema-level allowlists to prevent mass assignment; rate limits (stricter on login, password reset, uploads).
- Private storage for sensitive documents; audit logs for sensitive reads and writes (salary, role changes, attendance corrections, exports); log redaction.
- Deactivated users lose access immediately (session check on each refresh and on sensitive routes).
- Dependency audit: run `npm audit` and review high/critical findings. Never put secrets in frontend or mobile code (anything bundled in the APK is public).
- Data protection: data-access and retention notes in `docs/architecture.md`; export and deletion/anonymization procedure for former employees (align with applicable law, for example India's DPDP Act, as a documented consideration, not legal advice).

---

# 10. UI/UX DESIGN REQUIREMENTS

Produce `docs/design-system.md` (tokens, typography, colors, spacing, component inventory) before building screens, using the UI/UX Pro Max skill if installed.

Direction: premium enterprise SaaS, clean hierarchy, restrained accent palette, clear status colors, subtle shadows/borders, modern cards and tables, consistent icons, accessible contrast (WCAG AA), reusable tokens, original VRPI HRMS branding (create an original logo and app icon). Avoid heavy gradients, glassmorphism, or animation that hurts readability or performance on low-end Android phones.

Mobile layouts are mobile-first, not shrunken desktop. Build reusable components: buttons, form fields, cards, dialogs/bottom sheets, badges, tables/lists, date pickers, navigation, error and empty states. Support dynamic text sizes and 48dp minimum touch targets.

---

# 11. TESTING AND QA

Run tests as each module is built, with a **dedicated test database** (separate `DATABASE_URL`; refuse to run if the URL does not contain a test marker).

Backend: login success/failure, hashing, refresh rotation and reuse detection, session revocation, role/permission matrix, cross-organization isolation, ownership (IDOR) checks, employee CRUD, attendance rules (duplicate in, invalid out, idempotent retry, timezone boundaries), leave validation (overlap, half-day, balance), approve/reject transaction, salary/payslip authorization, validation and error handling.

Web: auth screens, form validation, navigation guards, loading/empty/error states, role-specific access, responsive layout checks.

Mobile: auth flow, session restore, form validation, offline/error states (jest-expo + React Native Testing Library).

Integration: web to backend, mobile to backend, backend to PostgreSQL, consistency of employee/attendance/leave data across clients. Include at least one end-to-end script: employee applies for leave, HR approves, balance updates, employee sees the new status.

Always run typecheck, lint, unit tests, and integration tests. Fix failures before closing a phase.

---

# 12. WINDOWS SETUP (README AND TESTING GUIDE)

Beginner-friendly PowerShell steps to: verify Node.js/npm; open the project in Antigravity; install dependencies; configure PostgreSQL (local install or managed); create `.env` files from `.env.example`; generate the Prisma client; run migrations; seed; start the backend; start the web app; start Expo; test login and CRUD; test on a physical phone. Provide root npm scripts. `.env.example` contains placeholders only.

---

# 13. ANDROID API CONNECTIVITY

The API base URL is configurable through Expo config (`extra` / `EXPO_PUBLIC_*`), per build profile, and is **never** hardcoded.

Important Android facts to handle:
- `localhost` on a phone points to the phone itself. Use the laptop's LAN IPv4 address for local Wi-Fi tests.
- **Release/APK builds block cleartext HTTP by default.** For LAN testing over `http://`, enable cleartext traffic only in the `preview` profile via `expo-build-properties` (`android.usesCleartextTraffic: true`). The `production` profile must use HTTPS only.
- Backend must listen on `0.0.0.0`. Add a Windows Firewall inbound rule for the backend port (Private network profile) and document the command and how to remove it.
- Laptop and phone must be on the same network. Some Wi-Fi networks isolate clients; if so, use a tunnel.

Recommended options, in order of convenience for testing a built APK:
1. **HTTPS tunnel** (Cloudflare Tunnel or ngrok) pointing at the local backend. No cleartext, no firewall changes, works on mobile data.
2. **Deployed backend** on a free HTTPS host (Render, Railway, Fly.io) with managed PostgreSQL (Neon/Supabase). Required for testing away from the laptop.
3. **LAN IP over HTTP** (preview profile only).

Never expose PostgreSQL directly to the internet or the mobile app. Add CORS only for web origins; the native app does not need CORS.

---

# 14. ANDROID APP CONFIGURATION

Configure `app.json`/`app.config.ts`: app name "VRPI HRMS", unique Android package id owned by the project owner (placeholder `com.<owner>.vrpihrms`; ask the user to confirm it before the first build because it cannot easily change after publishing), version and `versionCode`, icon (including adaptive icon), splash, minimum necessary permissions only (internet by default; location/camera/notifications only if the feature is enabled), per-profile API URL, EAS project ID.

---

# 15. GENERATE AN INSTALLABLE APK

Use **EAS cloud build**. Local Android builds on Windows with 8 GB RAM are not recommended (they require the Android SDK, JDK, and substantial memory).

Human steps (the agent cannot do these interactively; give exact instructions and wait):
1. Create a free Expo account.
2. `npm install --global eas-cli`, then `eas login` (or provide an `EXPO_TOKEN` environment variable for non-interactive use).
3. From `apps/mobile`: `eas build:configure`.

`apps/mobile/eas.json` (merge with any existing config):

```json
{
  "cli": { "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": { "EXPO_PUBLIC_API_URL": "https://REPLACE-WITH-YOUR-API-URL" }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

Build: `eas build --platform android --profile preview`.

Before building: run `npx expo-doctor`, a TypeScript check, and `npx expo export --platform android` (or equivalent) as a cheap bundling smoke test. Free EAS builds can queue for a while; tell the user to expect that.

Signing: let EAS generate and manage the Android keystore on the first build. Tell the user to run `eas credentials` and download a backup of the keystore, because losing it prevents updating a published app. "Signed APK" in this project means signed with the EAS-managed keystore.

When the build finishes: report the real build URL, how to download the APK, how to transfer it to the phone (direct download, QR code, USB, or cloud drive), how to allow "install unknown apps" for the chosen source, and how to set or verify the backend URL. Resolve build failures by reading the build log; do not just re-run.

Verification on the installed APK (the user performs these on the phone and reports back; the agent records the result): login, check-in/out, leave request, data persistence after app restart, data visible in the web dashboard.

---

# 16. DOCUMENTATION

Create and keep current: `docs/architecture.md` (system, communication, auth, permission matrix, versions), `docs/database-schema.md` (entities, relations, constraints, indexes), `docs/api-reference.md` (routes, examples, authorization), `docs/implementation-plan.md` (phases, dependencies, acceptance criteria), `docs/testing-guide.md`, `docs/apk-build-guide.md` (EAS config, build, install, troubleshooting), `docs/design-system.md`, `docs/PROGRESS.md`, and `README.md` (prerequisites, Windows setup, env config, DB setup, dev commands, testing, APK generation, known limitations, backup and restore of the database).

---

# 17. DEVELOPMENT PHASES

**PHASE 1** — Inspection, skill installation and verification, environment check, architecture, design system, monorepo scaffolding, documentation skeleton, `PROGRESS.md`.
*Acceptance:* `npm install` succeeds at the root; backend, web, and mobile each start a hello-world; shared package imports work in all three; skills listed or the manual fallback documented.

**PHASE 2** — Prisma schema, migrations (including raw SQL constraints), seed, backend foundation, auth, sessions, RBAC, audit log, tests.
*Acceptance:* migrations and seed run on a clean database; auth and permission tests pass.

**PHASE 3** — Web dashboard shell, auth, employee directory, departments, designations, employee management, CSV import/export.
*Acceptance:* HR can add, edit, and deactivate an employee in the browser; changes persist.

**PHASE 4** — Attendance APIs and UI, leave policies, balances, requests, approval workflows, holidays, shifts.
*Acceptance:* the leave round trip (apply, approve, balance update) passes an automated test.

**PHASE 5** — Mobile login, home, attendance, leave, profile, payslips, navigation, themes, offline states.
*Acceptance:* runs in Expo (development) against the backend; all listed screens functional.

**PHASE 6** — Cross-client integration, documents, in-app notifications, reports, exports.
*Acceptance:* a change made in one client appears in the other.

**PHASE 7** — Security review (checklist in section 9), `npm audit`, full test suite, integration tests, physical-device test in Expo.
*Acceptance:* all critical-flow tests pass; no unresolved high-severity findings.

**PHASE 8** — Backend reachable over HTTPS (tunnel or deployment), EAS configuration, preview APK, install and verify on the phone, final documentation.
*Acceptance:* section 18 checklist complete with evidence.

At the end of each phase report: completed functionality, files created/changed, commands run, actual test results, blockers, remaining tasks, and whether acceptance criteria passed.

---

# 18. DEFINITION OF DONE (MVP)

Each item needs evidence (command output, test name, or user confirmation). Mark unverified items as "NOT VERIFIED".

1. Backend starts and `/health` responds.
2. Migrations and seed work on a clean database.
3. Authentication works (login, refresh rotation, logout, revocation).
4. Role-based access is enforced on the server (tests prove 403s).
5. HR manages employees through the web dashboard.
6. Employees log in on the Android app.
7. Check-in/out persist in PostgreSQL, including duplicate and retry handling.
8. Employees submit leave requests; overlaps are rejected.
9. HR approves or rejects; balances update transactionally.
10. Changes appear in both apps.
11. Users cannot read other employees' private records or other organizations' data (tests prove it).
12. Automated tests pass for critical flows; typecheck and lint are clean.
13. A signed preview APK is built on EAS (build URL recorded).
14. The APK installs on a physical phone and works against the configured HTTPS backend (user-confirmed).
15. Setup, testing, and APK documentation is complete and was followed once from scratch without hidden steps.

---

# KNOWN POST-MVP ITEMS

Push notifications (FCM credentials), statutory payroll (PF/ESI/TDS), biometric or face attendance, geofencing enforcement, virus scanning of uploads, SSO/MFA, Play Store release (app bundle, store listing, privacy policy), CI/CD, backups and monitoring in production.

---

# START NOW

Begin with **Phase 1 only**. Inspect the workspace, check the environment, install and verify the skills, write the architecture and implementation plan, scaffold the monorepo, run the Phase 1 checks, update `docs/PROGRESS.md`, and report real results.

Do not stop after planning if file creation and terminal execution are available. Do not fabricate files, outputs, test results, installed skills, or successful commands. Keep everything lightweight, maintainable, secure, and runnable by a beginner on Windows.
