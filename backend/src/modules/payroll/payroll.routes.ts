import { Router, Response, NextFunction } from "express";
import { prisma } from "../../prisma";
import { authenticate, AuthenticatedRequest } from "../../middleware/auth";
import { UserRole, ErrorCode, ApiResponse } from "@vrpi-hrms/shared";

const router = Router();

// GET /api/v1/payroll/payslips
router.get("/payslips", authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const isEmployee = req.user!.role === UserRole.EMPLOYEE;
    const employeeId = isEmployee ? req.user!.employeeId : (req.query.employeeId as string) || req.user!.employeeId;

    if (!employeeId && isEmployee) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCode.VALIDATION_ERROR, message: "User is not linked to an employee profile" },
      });
      return;
    }

    const where: any = {
      organizationId: req.user!.organizationId,
    };
    if (employeeId) {
      where.employeeId = employeeId;
    }

    const payslips = await prisma.payslip.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
            designation: { select: { title: true } },
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    const response: ApiResponse = {
      success: true,
      data: payslips,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/payroll/payslips/:id/download
router.get("/payslips/:id/download", authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const payslip = await prisma.payslip.findFirst({
      where: {
        id: req.params.id as string,
        organizationId: req.user!.organizationId,
        ...(req.user!.role === UserRole.EMPLOYEE ? { employeeId: req.user!.employeeId } : {}),
      },
      include: {
        employee: {
          include: { department: true, designation: true },
        },
        organization: true,
      },
    });

    if (!payslip) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCode.NOT_FOUND, message: "Payslip not found or access denied" },
      });
      return;
    }

    // Return payslip summary details
    res.json({
      success: true,
      data: {
        payslipId: payslip.id,
        organization: payslip.organization.name,
        employeeName: `${payslip.employee.firstName} ${payslip.employee.lastName}`,
        employeeCode: payslip.employee.employeeCode,
        month: payslip.month,
        year: payslip.year,
        grossPay: payslip.grossPay,
        netPay: payslip.netPay,
        currency: "INR",
        issuedDate: payslip.publishedAt || payslip.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
