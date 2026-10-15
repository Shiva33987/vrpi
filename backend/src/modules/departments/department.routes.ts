import { Router, Response, NextFunction } from "express";
import { DepartmentService } from "./department.service";
import { authenticate, requirePermission, AuthenticatedRequest } from "../../middleware/auth";
import { recordAuditLog } from "../../middleware/audit";
import { ApiResponse } from "@vrpi-hrms/shared";

const router = Router();

// GET /api/v1/departments
router.get("/", authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const departments = await DepartmentService.list(req.user!.organizationId);
    const response: ApiResponse = {
      success: true,
      data: departments,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/departments (HR Admin / Super Admin)
router.post(
  "/",
  authenticate,
  requirePermission("employee", "create"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { name, code } = req.body;
      if (!name || !code) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Name and code are required" },
        });
        return;
      }

      const created = await DepartmentService.create(req.user!.organizationId, { name, code });
      await recordAuditLog({
        req,
        action: "CREATE_DEPARTMENT",
        resource: "department",
        resourceId: created.id,
        diff: created,
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/departments/designations
router.get(
  "/designations",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const departmentId = req.query.departmentId as string | undefined;
      const designations = await DepartmentService.listDesignations(
        req.user!.organizationId,
        departmentId
      );
      res.json({ success: true, data: designations });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/departments/designations
router.post(
  "/designations",
  authenticate,
  requirePermission("employee", "create"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { departmentId, title } = req.body;
      if (!departmentId || !title) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "departmentId and title are required" },
        });
        return;
      }

      const created = await DepartmentService.createDesignation(req.user!.organizationId, {
        departmentId,
        title,
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
