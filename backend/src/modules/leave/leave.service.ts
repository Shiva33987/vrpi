import { prisma } from "../../prisma";
import { LeaveStatus } from "@prisma/client";
import { LeaveRequestInput, ErrorCode } from "@vrpi-hrms/shared";

export class LeaveService {
  static async getLeaveTypes(organizationId: string) {
    return prisma.leaveType.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: "asc" },
    });
  }

  static async getBalances(organizationId: string, employeeId: string, year?: number) {
    const queryYear = year || new Date().getFullYear();
    return prisma.leaveBalance.findMany({
      where: {
        organizationId,
        employeeId,
        year: queryYear,
      },
      include: {
        leaveType: true,
      },
      orderBy: { leaveType: { name: "asc" } },
    });
  }

  static async applyLeave(organizationId: string, employeeId: string, input: LeaveRequestInput) {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (endDate < startDate) {
      throw {
        code: ErrorCode.VALIDATION_ERROR,
        status: 400,
        message: "End date cannot be earlier than start date",
      };
    }

    // Calculate total days
    let totalDays: number;
    if (input.isHalfDay) {
      totalDays = 0.5;
    } else {
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const currentYear = startDate.getFullYear();

    return prisma.$transaction(async (tx) => {
      // 1. Balance check
      const balance = await tx.leaveBalance.findUnique({
        where: {
          organizationId_employeeId_leaveTypeId_year: {
            organizationId,
            employeeId,
            leaveTypeId: input.leaveTypeId,
            year: currentYear,
          },
        },
      });

      if (!balance) {
        throw {
          code: ErrorCode.VALIDATION_ERROR,
          status: 400,
          message: "No leave balance record found for this leave type and year",
        };
      }

      if (balance.remainingDays < totalDays) {
        throw {
          code: ErrorCode.VALIDATION_ERROR,
          status: 400,
          message: `Insufficient leave balance. Requested ${totalDays} day(s), but only ${balance.remainingDays} day(s) remaining.`,
        };
      }

      // 2. Overlap check: No overlapping PENDING or APPROVED requests
      const overlapping = await tx.leaveRequest.findFirst({
        where: {
          organizationId,
          employeeId,
          status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
          AND: [
            { startDate: { lte: endDate } },
            { endDate: { gte: startDate } },
          ],
        },
      });

      if (overlapping) {
        throw {
          code: ErrorCode.CONFLICT,
          status: 409,
          message: "You already have an active (pending or approved) leave request during the selected dates.",
        };
      }

      // 3. Create leave request
      const leaveRequest = await tx.leaveRequest.create({
        data: {
          organizationId,
          employeeId,
          leaveTypeId: input.leaveTypeId,
          startDate,
          endDate,
          isHalfDay: input.isHalfDay,
          totalDays,
          reason: input.reason,
          status: LeaveStatus.PENDING,
        },
        include: {
          leaveType: true,
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
          },
        },
      });

      // 4. Update pending days on balance
      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: {
          pendingDays: balance.pendingDays + totalDays,
          remainingDays: balance.remainingDays - totalDays,
        },
      });

      // 5. Create approval history
      await tx.leaveApprovalHistory.create({
        data: {
          organizationId,
          leaveRequestId: leaveRequest.id,
          actorId: employeeId,
          action: "SUBMITTED",
          comment: input.reason,
        },
      });

      return leaveRequest;
    });
  }

  static async reviewRequest(params: {
    organizationId: string;
    leaveRequestId: string;
    reviewerEmployeeId: string;
    decision: "APPROVED" | "REJECTED";
    comment?: string;
  }) {
    const { organizationId, leaveRequestId, reviewerEmployeeId, decision, comment } = params;

    return prisma.$transaction(async (tx) => {
      const leaveRequest = await tx.leaveRequest.findFirst({
        where: { id: leaveRequestId, organizationId },
        include: { employee: true, leaveType: true },
      });

      if (!leaveRequest) {
        throw {
          code: ErrorCode.NOT_FOUND,
          status: 404,
          message: "Leave request not found",
        };
      }

      if (leaveRequest.status !== LeaveStatus.PENDING) {
        throw {
          code: ErrorCode.CONFLICT,
          status: 409,
          message: `Leave request has already been reviewed (current status: ${leaveRequest.status})`,
        };
      }

      const year = leaveRequest.startDate.getFullYear();
      const balance = await tx.leaveBalance.findUnique({
        where: {
          organizationId_employeeId_leaveTypeId_year: {
            organizationId,
            employeeId: leaveRequest.employeeId,
            leaveTypeId: leaveRequest.leaveTypeId,
            year,
          },
        },
      });

      const nextStatus = decision === "APPROVED" ? LeaveStatus.APPROVED : LeaveStatus.REJECTED;

      // 1. Update Request
      const updatedRequest = await tx.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: nextStatus,
          reviewedById: reviewerEmployeeId,
          reviewComment: comment || null,
          reviewedAt: new Date(),
        },
        include: {
          employee: true,
          leaveType: true,
          reviewedBy: true,
        },
      });

      // 2. Transactional Balance Update
      if (balance) {
        if (decision === "APPROVED") {
          // Commit pending to used
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              usedDays: balance.usedDays + leaveRequest.totalDays,
              pendingDays: Math.max(0, balance.pendingDays - leaveRequest.totalDays),
            },
          });
        } else {
          // Release pending and restore remaining
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              pendingDays: Math.max(0, balance.pendingDays - leaveRequest.totalDays),
              remainingDays: balance.remainingDays + leaveRequest.totalDays,
            },
          });
        }
      }

      // 3. Record History
      await tx.leaveApprovalHistory.create({
        data: {
          organizationId,
          leaveRequestId,
          actorId: reviewerEmployeeId,
          action: decision,
          comment: comment || null,
        },
      });

      return updatedRequest;
    });
  }

  static async getPersonalRequests(organizationId: string, employeeId: string) {
    return prisma.leaveRequest.findMany({
      where: { organizationId, employeeId },
      include: {
        leaveType: true,
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        approvalHistory: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getAdminRequests(organizationId: string, status?: LeaveStatus) {
    return prisma.leaveRequest.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
      },
      include: {
        leaveType: true,
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            email: true,
            department: { select: { id: true, name: true } },
          },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
