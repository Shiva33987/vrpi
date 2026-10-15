# VRPI HRMS - Implementation Plan

## 1. Overview & Strategy
This document outlines the step-by-step implementation plan for the VRPI Human Resource Management System (HRMS), an enterprise-grade HR platform inspired by Zoho People. The system is architected as a lightweight TypeScript monorepo with three core applications:
1. **Android Mobile App** (`apps/mobile`): React Native + Expo + Expo Router
2. **Web HR/Admin Dashboard** (`apps/web`): React + Vite + TypeScript + Tailwind CSS
3. **Backend API** (`backend`): Node.js + Express + TypeScript + Prisma ORM + PostgreSQL 18
4. **Shared Package** (`packages/shared`): Unified types, Zod schemas, permission matrices, and API contracts.

Target Environment: Windows 11 / PowerShell, 8 GB RAM, local PostgreSQL 18 running service, EAS cloud build for APK generation.

---

## 2. Phase Breakdown & Acceptance Criteria

### Phase 1: Foundations & Scaffolding (Current)
- **Scope**:
  - Environment detection and tooling verification (Node.js, npm, git, psql/PostgreSQL service).
  - Skill installations (`ui-ux-pro-max`, `expo/skills`) in `.agents/skills/`.
  - Architecture, database schema, design system, and API specification design.
  - Monorepo setup with npm workspaces (`packages/shared`, `backend`, `apps/web`, `apps/mobile`).
  - Baseline hello-world integration proving shared package resolution across backend, web, and mobile.
  - Setup `.gitignore`, `.env.example`, `README.md`, and `docs/PROGRESS.md`.
- **Acceptance Criteria**:
  - Root `npm install` completes cleanly with zero fatal errors.
  - `backend` compiles and starts with `/health` and `/ready` endpoints returning status.
  - `apps/web` builds and renders hello world importing `@vrpi-hrms/shared`.
  - `apps/mobile` TypeScript typecheck passes and imports `@vrpi-hrms/shared`.
  - Skills verified and documented.

### Phase 2: Backend Database & Core Auth
- **Scope**:
  - Complete Prisma schema: Organizations, Users, Roles, Permissions, Employees, Sessions, AuditLogs.
  - PostgreSQL migrations including raw SQL partial indexes and exclusion constraints.
  - Argon2id password hashing, rotating refresh token families with reuse detection.
  - Role-Based Access Control (RBAC) middleware verifying organization isolation and IDOR protection.
  - Deterministic synthetic database seed script with sample organization, admins, HR, and employees.
  - Unit and integration tests for auth and authorization (Vitest + Supertest).
- **Acceptance Criteria**:
  - Migrations and seed execute successfully on PostgreSQL database.
  - Auth tests pass for login, token refresh rotation, reuse revocation, and role enforcement.

### Phase 3: Web Dashboard Foundation & Employee Directory
- **Scope**:
  - Web dashboard layout with responsive sidebar, top bar, user profile, and breadcrumbs.
  - Auth flow (Login, Session restoration, Logout).
  - Employee directory with search, filtering, pagination, and detail views.
  - Employee creation, updating, and deactivation (soft delete).
  - Department and Designation management.
  - CSV import with preview, row-level validation, and error reporting; CSV export.
- **Acceptance Criteria**:
  - HR Admin can create, edit, deactivate an employee via browser; changes persist to PostgreSQL.

### Phase 4: Attendance & Leave Management
- **Scope**:
  - Attendance backend: check-in/out, server timestamps (UTC), organization timezone translation (`Asia/Kolkata`), duplicate handling, idempotency keys, late marks, hours calculation.
  - Leave backend: leave types, balances, accruals, application validation (no overlaps, balance checks, half-day).
  - Approval workflow: atomic multi-step DB transactions (approve/reject, balance deductions, audit log).
  - Web UI for attendance tracking, manual corrections with audit reasons, and leave approval inbox.
- **Acceptance Criteria**:
  - Round-trip automated test passes: employee applies for leave, manager/HR approves, balance updates atomically.

### Phase 5: Android Mobile App
- **Scope**:
  - Bottom-tab navigation (Home, Attendance, Leave, Payslips, Profile).
  - Authentication flow: SecureStore token storage, session restoration, network error handling.
  - Home dashboard: today's attendance status, check-in/out quick action, leave balance cards, announcements.
  - Attendance screen: punch in/out with idempotency key, monthly logs, working hours.
  - Leave screen: balance overview, apply for leave, status badges, cancellation.
  - Profile & Payslips: employee details, monthly payslip viewing.
  - Offline banner and graceful network error handling.
- **Acceptance Criteria**:
  - Mobile app runs in Expo development environment connecting to local/tunnel backend.

### Phase 6: Cross-Client Integration & Reports
- **Scope**:
  - Consistency verification between mobile actions and web dashboard views.
  - Document management (safe upload, validation of magic bytes, storage interface).
  - Reports module on Web: Headcount, Attendance trends, Leave utilization with Recharts.
  - In-app notification center.
- **Acceptance Criteria**:
  - Action performed on mobile (check-in, leave request) is immediately visible on the web dashboard.

### Phase 7: Security Audit & Quality Assurance
- **Scope**:
  - Full automated test suite execution (backend unit/integration tests, web tests, mobile smoke tests).
  - Security checklist verification: IDOR prevention, SQL injection checks, CORS, Helmet headers, rate limiting.
  - `npm audit` dependency review.
  - Test on local Wi-Fi / physical device using Expo Go or development build.
- **Acceptance Criteria**:
  - All critical flow tests pass; zero unhandled high-severity security vulnerabilities.

### Phase 8: Production Readiness & EAS APK Build
- **Scope**:
  - Backend HTTPS endpoint configuration (tunnel / hosting).
  - Android build configuration: `app.json`, `eas.json` preview profile (`apk`), network security config.
  - Smoke bundling test (`npx expo export --platform android`).
  - Trigger EAS build for Android APK.
  - User verification on physical Android phone (login, check-in, leave request).
  - Complete documentation delivery.
- **Acceptance Criteria**:
  - Functional Android APK generated by EAS, installed on user's phone, verified against live backend.
