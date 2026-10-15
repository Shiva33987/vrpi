# VRPI HRMS - REST API Specification

## 1. Conventions & Standards
- **Base URL**: `/api/v1`
- **Transport**: JSON (`Content-Type: application/json; charset=utf-8`)
- **Authentication**: `Authorization: Bearer <accessToken>` or Session Cookie for Web refresh.
- **Envelope Response Structure**:
```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```
- **Error Response Structure**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid check-in attempt",
    "details": []
  }
}
```

---

## 2. Core Endpoint Index

### 2.1 System & Health
- `GET /health` - Liveness probe (checks process running, uptime, memory)
- `GET /ready` - Readiness probe (checks database connection)

### 2.2 Authentication & Sessions (`/api/v1/auth`)
- `POST /api/v1/auth/login` - Authenticate with email/password (returns access token, sets web cookie)
- `POST /api/v1/auth/refresh` - Web cookie-based access token refresh with rotation
- `POST /api/v1/auth/mobile/refresh` - Mobile body-based refresh token exchange
- `POST /api/v1/auth/logout` - Revoke current session and refresh token family
- `GET /api/v1/auth/me` - Fetch authenticated user profile, permissions, and organization details

### 2.3 Employee Directory (`/api/v1/employees`)
- `GET /api/v1/employees` - List employees with pagination, search, department filter
- `POST /api/v1/employees` - Create employee record (HR Admin / Super Admin)
- `GET /api/v1/employees/:id` - Fetch single employee profile
- `PUT /api/v1/employees/:id` - Update employee details (permission checked)
- `DELETE /api/v1/employees/:id` - Soft deactivate employee
- `POST /api/v1/employees/import` - Bulk CSV import with validation report
- `GET /api/v1/employees/export` - Export employees to CSV

### 2.4 Attendance (`/api/v1/attendance`)
- `POST /api/v1/attendance/check-in` - Record check-in punch (with idempotency key)
- `POST /api/v1/attendance/check-out` - Record check-out punch
- `GET /api/v1/attendance/today` - Fetch current user's attendance status today
- `GET /api/v1/attendance/history` - Monthly attendance logs for employee
- `GET /api/v1/attendance/overview` - Org-wide daily attendance dashboard (HR only)
- `PUT /api/v1/attendance/:id/correct` - Manual time correction with mandatory reason

### 2.5 Leave Management (`/api/v1/leave`)
- `GET /api/v1/leave/types` - List active leave types
- `GET /api/v1/leave/balances` - Fetch current user's leave balances
- `POST /api/v1/leave/requests` - Submit new leave request
- `GET /api/v1/leave/requests` - List personal leave requests
- `GET /api/v1/leave/admin/requests` - Admin leave inbox (filtered by status)
- `POST /api/v1/leave/requests/:id/review` - Approve or reject leave request (atomic transaction)

### 2.6 Payroll & Payslips (`/api/v1/payroll`)
- `GET /api/v1/payroll/payslips` - List employee payslips
- `GET /api/v1/payroll/payslips/:id/download` - Stream PDF payslip or return short-lived signed download token
- `POST /api/v1/payroll/payslips/upload` - Upload payslip PDF (HR Admin only)
