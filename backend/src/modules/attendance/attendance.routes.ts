import { Router, Response, NextFunction } from "express";
import { AttendanceService } from "./attendance.service";
import { authenticate, requirePermission, AuthenticatedRequest } from "../../middleware/auth";
import { recordAuditLog } from "../../middleware/audit";
import { CheckInInputSchema, CheckOutInputSchema, ErrorCode } from "@vrpi-hrms/shared";

const router = Router();

// POST /api/v1/attendance/check-in
router.post(
  "/check-in",
  authenticate,
  requirePermission("attendance", "create"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user!.employeeId) {
        res.status(400).json({
          success: false,
          error: { code: ErrorCode.VALIDATION_ERROR, message: "User is not linked to an employee profile" },
        });
        return;
      }

      const parsed = CheckInInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: { code: ErrorCode.VALIDATION_ERROR, message: "Invalid check-in input", details: parsed.error.errors },
        });
        return;
      }

      const record = await AttendanceService.checkIn({
        organizationId: req.user!.organizationId,
        employeeId: req.user!.employeeId,
        idempotencyKey: parsed.data.idempotencyKey,
        notes: parsed.data.notes,
        source: req.headers["x-client-platform"] === "mobile" ? "MOBILE" : "WEB",
      });

      res.status(201).json({ success: true, data: record });
    } catch (err: any) {
      if (err.status && err.code) {
        res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// POST /api/v1/attendance/check-out
router.post(
  "/check-out",
  authenticate,
  requirePermission("attendance", "create"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user!.employeeId) {
        res.status(400).json({
          success: false,
          error: { code: ErrorCode.VALIDATION_ERROR, message: "User is not linked to an employee profile" },
        });
        return;
      }

      const parsed = CheckOutInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: { code: ErrorCode.VALIDATION_ERROR, message: "Invalid check-out input", details: parsed.error.errors },
        });
        return;
      }

      const record = await AttendanceService.checkOut({
        organizationId: req.user!.organizationId,
        employeeId: req.user!.employeeId,
        idempotencyKey: parsed.data.idempotencyKey,
        notes: parsed.data.notes,
      });

      res.status(200).json({ success: true, data: record });
    } catch (err: any) {
      if (err.status && err.code) {
        res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// GET /api/v1/attendance/today
router.get(
  "/today",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user!.employeeId) {
        res.status(400).json({
          success: false,
          error: { code: ErrorCode.VALIDATION_ERROR, message: "User is not linked to an employee profile" },
        });
        return;
      }

      const today = await AttendanceService.getTodayStatus(
        req.user!.organizationId,
        req.user!.employeeId
      );
      res.json({ success: true, data: today });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/attendance/history
router.get(
  "/history",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const employeeId = (req.query.employeeId as string) || req.user!.employeeId;
      if (!employeeId) {
        res.status(400).json({
          success: false,
          error: { code: ErrorCode.VALIDATION_ERROR, message: "Employee ID is required" },
        });
        return;
      }

      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

      const history = await AttendanceService.getHistory({
        organizationId: req.user!.organizationId,
        employeeId,
        month,
        year,
      });

      res.json({ success: true, data: history });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/attendance/overview (HR Admin / HR only)
router.get(
  "/overview",
  authenticate,
  requirePermission("attendance", "read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const date = req.query.date as string | undefined;
      const overview = await AttendanceService.getOrgOverview(req.user!.organizationId, date);
      res.json({ success: true, data: overview });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/v1/attendance/:id/correct (HR Admin correction)
router.put(
  "/:id/correct",
  authenticate,
  requirePermission("attendance", "update"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { checkInTime, checkOutTime, status, reason } = req.body;
      if (!reason) {
        res.status(400).json({
          success: false,
          error: { code: ErrorCode.VALIDATION_ERROR, message: "A valid correction reason is required" },
        });
        return;
      }

      const corrected = await AttendanceService.correctAttendance({
        organizationId: req.user!.organizationId,
        recordId: req.params.id as string,
        checkInTime,
        checkOutTime,
        status,
        reason,
        correctedById: req.user!.userId,
      });

      await recordAuditLog({
        req,
        action: "CORRECT_ATTENDANCE",
        resource: "attendance",
        resourceId: corrected.id,
        diff: { reason, status, checkInTime, checkOutTime },
      });

      res.json({ success: true, data: corrected });
    } catch (err: any) {
      if (err.status && err.code) {
        res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

export default router;
