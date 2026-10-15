import { z } from "zod";

// ==========================================
// 1. Roles & Permissions Matrix
// ==========================================
export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  HR_ADMIN = "HR_ADMIN",
  HR = "HR",
  EMPLOYEE = "EMPLOYEE",
}

export type ResourceName =
  | "organization"
  | "employee"
  | "attendance"
  | "leave"
  | "payroll"
  | "report"
  | "audit_log";

export type ActionType = "create" | "read" | "update" | "delete" | "approve";

export const ROLE_PERMISSIONS: Record<UserRole, Record<ResourceName, ActionType[]>> = {
  [UserRole.SUPER_ADMIN]: {
    organization: ["create", "read", "update", "delete"],
    employee: ["create", "read", "update", "delete"],
    attendance: ["create", "read", "update", "delete", "approve"],
    leave: ["create", "read", "update", "delete", "approve"],
    payroll: ["create", "read", "update", "delete"],
    report: ["read"],
    audit_log: ["read"],
  },
  [UserRole.HR_ADMIN]: {
    organization: ["read"],
    employee: ["create", "read", "update", "delete"],
    attendance: ["create", "read", "update", "delete", "approve"],
    leave: ["create", "read", "update", "delete", "approve"],
    payroll: ["create", "read", "update", "delete"],
    report: ["read"],
    audit_log: ["read"],
  },
  [UserRole.HR]: {
    organization: ["read"],
    employee: ["create", "read", "update"],
    attendance: ["create", "read", "update", "approve"],
    leave: ["create", "read", "update", "approve"],
    payroll: [], // HR has no salary access by default
    report: ["read"],
    audit_log: [],
  },
  [UserRole.EMPLOYEE]: {
    organization: ["read"],
    employee: ["read"], // Own profile + limited colleague view
    attendance: ["create", "read"], // Self check-in/out
    leave: ["create", "read"], // Self leave requests
    payroll: ["read"], // Self payslips only
    report: [],
    audit_log: [],
  },
};

export function hasPermission(
  role: UserRole,
  resource: ResourceName,
  action: ActionType
): boolean {
  const permissions = ROLE_PERMISSIONS[role]?.[resource];
  return permissions ? permissions.includes(action) : false;
}

// ==========================================
// 2. Enums
// ==========================================
export enum AttendanceStatus {
  PRESENT = "PRESENT",
  ABSENT = "ABSENT",
  HALF_DAY = "HALF_DAY",
  LATE = "LATE",
  ON_LEAVE = "ON_LEAVE",
}

export enum LeaveStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export enum ErrorCode {
  UNAUTHENTICATED = "UNAUTHENTICATED",
  UNAUTHORIZED = "UNAUTHORIZED",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  FORBIDDEN = "FORBIDDEN",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  TOKEN_REUSE_DETECTED = "TOKEN_REUSE_DETECTED",
}

// ==========================================
// 3. Zod Schemas
// ==========================================
export const LoginInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const CheckInInputSchema = z.object({
  idempotencyKey: z.string().min(10, "Idempotency key required"),
  notes: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
export type CheckInInput = z.infer<typeof CheckInInputSchema>;

export const CheckOutInputSchema = z.object({
  idempotencyKey: z.string().min(10, "Idempotency key required"),
  notes: z.string().optional(),
});
export type CheckOutInput = z.infer<typeof CheckOutInputSchema>;

export const LeaveRequestInputSchema = z.object({
  leaveTypeId: z.string().min(1, "Leave type is required"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  isHalfDay: z.boolean().default(false),
  reason: z.string().min(3, "Reason must be at least 3 characters"),
});
export type LeaveRequestInput = z.infer<typeof LeaveRequestInputSchema>;

export const CreateEmployeeInputSchema = z.object({
  employeeCode: z.string().min(2, "Employee code is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  departmentId: z.string().min(1, "Department is required"),
  designationId: z.string().min(1, "Designation is required"),
  managerId: z.string().optional(),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  role: z.nativeEnum(UserRole).default(UserRole.EMPLOYEE),
});
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeInputSchema>;

// ==========================================
// 4. API Standard Contract Types
// ==========================================
export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode | string;
    message: string;
    details?: unknown;
  };
}

export interface AuthUserPayload {
  userId: string;
  email: string;
  organizationId: string;
  role: UserRole;
  employeeId?: string;
}
