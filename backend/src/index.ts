import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { UserRole, hasPermission, ApiResponse, ApiErrorResponse, ErrorCode } from "@vrpi-hrms/shared";
import authRoutes from "./modules/auth/auth.routes";
import employeeRoutes from "./modules/employees/employee.routes";
import departmentRoutes from "./modules/departments/department.routes";
import attendanceRoutes from "./modules/attendance/attendance.routes";
import leaveRoutes from "./modules/leave/leave.routes";
import payrollRoutes from "./modules/payroll/payroll.routes";
import { authenticate, requirePermission, requireRole, AuthenticatedRequest } from "./middleware/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const API_PREFIX = process.env.API_PREFIX || "/api/v1";

// Security headers & CORS
app.use(helmet());
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.WEB_APP_URL ? [process.env.WEB_APP_URL] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many authentication requests, please try again later.",
    },
  },
});

// Liveness probe
app.get("/health", (req: Request, res: Response) => {
  const response: ApiResponse<{ status: string; uptime: number; timestamp: string }> = {
    success: true,
    data: {
      status: "healthy",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  };
  res.json(response);
});

// Readiness probe
app.get("/ready", (req: Request, res: Response) => {
  const response: ApiResponse<{ ready: boolean; service: string }> = {
    success: true,
    data: {
      ready: true,
      service: "vrpi-hrms-backend",
    },
  };
  res.json(response);
});

// Mount Modules
app.use(`${API_PREFIX}/auth`, authLimiter, authRoutes);
app.use(`${API_PREFIX}/employees`, employeeRoutes);
app.use(`${API_PREFIX}/departments`, departmentRoutes);
app.use(`${API_PREFIX}/attendance`, attendanceRoutes);
app.use(`${API_PREFIX}/leave`, leaveRoutes);
app.use(`${API_PREFIX}/payroll`, payrollRoutes);

// Status route verifying shared package integration
app.get(`${API_PREFIX}/status`, (req: Request, res: Response) => {
  const canHrAdminApproveLeave = hasPermission(UserRole.HR_ADMIN, "leave", "approve");
  const response: ApiResponse<{
    name: string;
    version: string;
    sharedVerification: {
      canHrAdminApproveLeave: boolean;
      testedRole: UserRole;
    };
  }> = {
    success: true,
    data: {
      name: "VRPI HRMS Backend API",
      version: "1.0.0",
      sharedVerification: {
        canHrAdminApproveLeave,
        testedRole: UserRole.HR_ADMIN,
      },
    },
  };
  res.json(response);
});

// Test RBAC routes (for automated verification)
app.get(
  `${API_PREFIX}/test/hr-admin-only`,
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.HR_ADMIN),
  (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: { message: "Access granted to HR Admin", user: req.user } });
  }
);

app.get(
  `${API_PREFIX}/test/payroll-access`,
  authenticate,
  requirePermission("payroll", "create"),
  (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: { message: "Access granted to payroll management", user: req.user } });
  }
);

// Centralized error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[Unhandled Error]", err);
  const status = err.status || 500;
  const errorResponse: ApiErrorResponse = {
    success: false,
    error: {
      code: err.code || ErrorCode.INTERNAL_SERVER_ERROR,
      message: err.message || "An unexpected error occurred",
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    },
  };
  res.status(status).json(errorResponse);
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[VRPI HRMS Backend] Listening on port ${PORT}`);
  });
}

export default app;
