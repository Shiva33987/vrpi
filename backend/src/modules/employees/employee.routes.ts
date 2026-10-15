import { Router, Response, NextFunction } from "express";
import { EmployeeService } from "./employee.service";
import { authenticate, requirePermission, AuthenticatedRequest } from "../../middleware/auth";
import { recordAuditLog } from "../../middleware/audit";
import { CreateEmployeeInputSchema, ApiResponse, ApiErrorResponse, ErrorCode } from "@vrpi-hrms/shared";

const router = Router();

// GET /api/v1/employees
router.get("/", authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const search = req.query.search as string | undefined;
    const departmentId = req.query.departmentId as string | undefined;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;

    const result = await EmployeeService.list({
      organizationId: req.user!.organizationId,
      page,
      limit,
      search,
      departmentId,
      isActive,
    });

    const response: ApiResponse = {
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/employees/export (CSV export)
router.get(
  "/export",
  authenticate,
  requirePermission("employee", "read"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const csv = await EmployeeService.exportCsv(req.user!.organizationId);
      await recordAuditLog({
        req,
        action: "EXPORT_EMPLOYEES_CSV",
        resource: "employee",
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=employees.csv");
      res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/employees/import (Bulk CSV import)
router.post(
  "/import",
  authenticate,
  requirePermission("employee", "create"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const rows = req.body.rows;
      if (!Array.isArray(rows)) {
        res.status(400).json({
          success: false,
          error: { code: ErrorCode.VALIDATION_ERROR, message: "Expected array of rows" },
        });
        return;
      }

      const report = await EmployeeService.importCsv(req.user!.organizationId, rows);
      await recordAuditLog({
        req,
        action: "IMPORT_EMPLOYEES_CSV",
        resource: "employee",
        diff: { total: report.totalRows, imported: report.importedCount },
      });

      res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/employees/:id
router.get("/:id", authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const employee = await EmployeeService.getById(req.user!.organizationId, req.params.id as string);
    res.json({ success: true, data: employee });
  } catch (err: any) {
    if (err.status && err.code) {
      res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
      return;
    }
    next(err);
  }
});

// POST /api/v1/employees (Create Employee - HR Admin / Super Admin)
router.post(
  "/",
  authenticate,
  requirePermission("employee", "create"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = CreateEmployeeInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: "Invalid employee data",
            details: parsed.error.errors,
          },
        });
        return;
      }

      const created = await EmployeeService.create(req.user!.organizationId, parsed.data);
      await recordAuditLog({
        req,
        action: "CREATE_EMPLOYEE",
        resource: "employee",
        resourceId: created.id,
        diff: created,
      });

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

// PUT /api/v1/employees/:id (Update Employee)
router.put(
  "/:id",
  authenticate,
  requirePermission("employee", "update"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const updated = await EmployeeService.update(
        req.user!.organizationId,
        req.params.id as string,
        req.body
      );

      await recordAuditLog({
        req,
        action: "UPDATE_EMPLOYEE",
        resource: "employee",
        resourceId: updated.id,
        diff: req.body,
      });

      res.json({ success: true, data: updated });
    } catch (err: any) {
      if (err.status && err.code) {
        res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// DELETE /api/v1/employees/:id (Soft Deactivate)
router.delete(
  "/:id",
  authenticate,
  requirePermission("employee", "delete"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const deactivated = await EmployeeService.deactivate(
        req.user!.organizationId,
        req.params.id as string
      );

      await recordAuditLog({
        req,
        action: "DEACTIVATE_EMPLOYEE",
        resource: "employee",
        resourceId: deactivated.id,
      });

      res.json({
        success: true,
        data: { message: "Employee deactivated successfully", employee: deactivated },
      });
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
