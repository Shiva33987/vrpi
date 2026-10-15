# VRPI HRMS (Enterprise Human Resource Management System)

A production-oriented Human Resource Management System inspired by Zoho People, built with a TypeScript monorepo architecture.

## Repository Structure
```
vrpi-hrms/
├── apps/
│   ├── mobile/         # Android Employee App (React Native + Expo SDK 52 + Expo Router)
│   └── web/            # HR / Admin Web Dashboard (React + Vite + TypeScript + Tailwind)
├── backend/            # Express REST API (/api/v1) + Prisma ORM + PostgreSQL 18
├── packages/
│   └── shared/         # Shared Zod schemas, TypeScript types, RBAC matrices, constants
├── docs/               # System architecture, database schema, design system, API docs, APK build guide
├── .agents/skills/     # Installed Antigravity AI skills (UI/UX Pro Max, Expo)
└── package.json        # Root npm workspaces
```

---

## Prerequisites (Windows 11)
- **Node.js**: v20+ or v24+ LTS (Observed: `v24.14.0`)
- **npm**: v10+ or v11+ (Observed: `11.9.0`)
- **PostgreSQL**: v16+ or v18+ (Observed: `v18.3` Windows Service running)
- **PowerShell Execution Policy**: If PowerShell blocks script execution, run:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

---

## Quick Start

### 1. Install Dependencies
```powershell
npm install
```

### 2. Configure Environment
Copy `.env.example` to `backend/.env` and update credentials:
```powershell
Copy-Item .env.example backend/.env
```

### 3. Setup Database (Prisma Migrations & Seed)
```powershell
npm run db:migrate
npm run db:seed
```

---

## Development Test Credentials
> [!WARNING]
> These credentials are synthetic and strictly for local development and testing. Never use in production.

- **Default Password**: `Admin123!`
- **Super Admin**: `superadmin@vrpi.com`
- **HR Admin**: `hradmin@vrpi.com`
- **HR User**: `hr@vrpi.com`
- **Employee 1 (Engineering Lead / Manager)**: `rahul.sharma@vrpi.com`
- **Employee 2 (Senior Fullstack)**: `priya.patel@vrpi.com`
- **Employee 3 (Junior Developer)**: `amit.kumar@vrpi.com`
- **Employee 4 (Senior Designer)**: `neha.singh@vrpi.com`

---

## Run Development Workspaces
- Start Backend API (`http://localhost:4000`):
  ```powershell
  npm run dev:backend
  ```
- Start Web Dashboard (`http://localhost:5173`):
  ```powershell
  npm run dev:web
  ```
- Start Mobile App (Metro bundler):
  ```powershell
  npm run dev:mobile
  ```

---

## Building the Android APK
Refer to [`docs/apk-build-guide.md`](docs/apk-build-guide.md) for EAS Cloud build steps.
