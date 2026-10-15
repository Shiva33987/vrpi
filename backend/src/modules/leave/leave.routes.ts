import { Router, Response, NextFunction } from "express";
import { LeaveService } from "./leave.service";
import { authenticate, requirePermission, AuthenticatedRequest } from "../../middleware/auth";
import { recordAuditLog } from "../../middleware/audit";
import { LeaveRequestInputSchema, ErrorCode } from "@vrpi-hrms/shared";

const router = Router();

// GET /api/v1/leave/types
router.get("/types", authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const types = await LeaveService.getLeaveTypes(req.user!.organizationId);
    res.json({ success: true, data: types });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/leave/balances
router.get("/balances", authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const employeeId = (req.query.employeeId as string) || req.user!.employeeId;
    if (!employeeId) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCode.VALIDATION_ERROR, message: "Employee ID is required" },
      });
      return;
    }

    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const balances = await LeaveService.getBalances(req.user!.organizationId, employeeId, year);
    res.json({ success: true, data: balances });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/leave/requests (Apply for leave)
router.post(
  "/requests",
  authenticate,
  requirePermission("leave", "create"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user!.employeeId) {
        res.status(400).json({
          success: false,
          error: { code: ErrorCode.VALIDATION_ERROR, message: "User is not linked to an employee profile" },
        });
        return;
      }

      const parsed = LeaveRequestInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: { code: ErrorCode.VALIDATION_ERROR, message: "Invalid leave request", details: parsed.error.errors },
        });
        return;
      }

      const created = await LeaveService.applyLeave(
        req.user!.organizationId,
        req.user!.employeeId,
        parsed.data
      );

      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      if (err.status && err.code) {
        res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// GET /api/v1/leave/requests (My requests)
router.get(
  "/requests",
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

      const requests = await LeaveService.getPersonalRequests(
        req.user!.organizationId,
        req.user!.employeeId
      );
      res.json({ success: true, data: requests });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/leave/admin/requests (HR Admin / HR Inbox)
router.get(
  "/admin/requests",
  authenticate,
  requirePermission("leave", "read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as any;
      const requests = await LeaveService.getAdminRequests(req.user!.organizationId, status);
      res.json({ success: true, data: requests });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/leave/requests/:id/review (Approve or Reject leave request)
router.post(
  "/requests/:id/review",
  authenticate,
  requirePermission("leave", "approve"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { decision, comment } = req.body;
      if (decision !== "APPROVED" && decision !== "REJECTED") {
        res.status(400).json({
          success: false,
          error: { code: ErrorCode.VALIDATION_ERROR, message: "Decision must be 'APPROVED' or 'REJECTED'" },
        });
        return;
      }

      const reviewerId = req.user!.employeeId || req.user!.userId;

      const reviewed = await LeaveService.reviewRequest({
        organizationId: req.user!.organizationId,
        leaveRequestId: req.params.id as string,
        reviewerEmployeeId: reviewerId,
        decision,
        comment,
      });

      await recordAuditLog({
        req,
        action: `LEAVE_REQUEST_${decision}`,
        resource: "leave",
        resourceId: reviewed.id,
        diff: { decision, comment, days: reviewed.totalDays },
      });

      res.json({ success: true, data: reviewed });
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
