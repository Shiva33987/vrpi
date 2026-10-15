# VRPI HRMS - Testing & Quality Assurance Guide

## 1. Testing Philosophy & Isolation
- **Dedicated Test Database**: Tests must NEVER run against a production or shared database. Test scripts require `DATABASE_URL` to end with `_test` or contain `test`.
- **Automated Levels**:
  1. **Unit Tests**: Schema validation, password hashing, token utilities, timezone calculations.
  2. **Integration Tests**: Supertest HTTP endpoints, RBAC permission enforcement, token rotation and reuse detection.
  3. **End-to-End Workflow Tests**: The complete leave lifecycle (Apply -> Balance Check -> Manager Approval -> Balance Deduction -> Status Reflection).

---

## 2. Running Test Suites

### 2.1 Backend Tests
```powershell
# From repository root
npm run test:backend

# Or from backend directory
cd backend; npm test
```

### 2.2 Typechecking and Linting
```powershell
# Monorepo-wide typechecking
npm run typecheck

# Monorepo linting
npm run lint
```

### 2.3 Web Dashboard Verification
```powershell
npm run test:web
```

### 2.4 Mobile Verification
```powershell
# Bundling smoke test for Android
cd apps/mobile; npx expo export --platform android
```
