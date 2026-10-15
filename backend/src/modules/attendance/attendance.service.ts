import { prisma } from "../../prisma";
import { getOrgDateString, isPunchLate } from "../../utils/timezone";
import { AttendanceStatus } from "@prisma/client";
import { ErrorCode } from "@vrpi-hrms/shared";

export class AttendanceService {
  static async checkIn(params: {
    organizationId: string;
    employeeId: string;
    idempotencyKey?: string;
    notes?: string;
    source?: "WEB" | "MOBILE";
  }) {
    const { organizationId, employeeId, idempotencyKey, notes, source = "WEB" } = params;

    // 1. Idempotency Check: if key already used, return that exact record
    if (idempotencyKey) {
      const existing = await prisma.attendanceRecord.findFirst({
        where: { idempotencyKey, organizationId },
      });
      if (existing) {
        return existing;
      }
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        shifts: { where: { name: "General Shift" } },
      },
    });

    const timezone = org?.timezone || "Asia/Kolkata";
    const serverNow = new Date();
    const todayDateString = getOrgDateString(serverNow, timezone);
    const todayDate = new Date(todayDateString);

    // 2. Duplicate Check: Ensure no open punch for this employee today
    const openPunch = await prisma.attendanceRecord.findFirst({
      where: {
        organizationId,
        employeeId,
        date: todayDate,
        checkOutTime: null,
      },
    });

    if (openPunch) {
      throw {
        code: ErrorCode.CONFLICT,
        status: 409,
        message: "You already have an active check-in for today. Please check out first.",
      };
    }

    // 3. Shift and Late Mark Calculation
    const shift = org?.shifts[0];
    const shiftStart = shift?.startTime || "09:00";
    const graceMinutes = shift?.gracePeriodMinutes ?? 15;

    const isLate = isPunchLate(serverNow, shiftStart, graceMinutes, timezone);
    const initialStatus = isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

    return prisma.attendanceRecord.create({
      data: {
        organizationId,
        employeeId,
        date: todayDate,
        checkInTime: serverNow,
        status: initialStatus,
        checkInSource: source,
        idempotencyKey: idempotencyKey || null,
        notes: notes || null,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  static async checkOut(params: {
    organizationId: string;
    employeeId: string;
    idempotencyKey?: string;
    notes?: string;
  }) {
    const { organizationId, employeeId, notes } = params;

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    const timezone = org?.timezone || "Asia/Kolkata";
    const serverNow = new Date();
    const todayDateString = getOrgDateString(serverNow, timezone);
    const todayDate = new Date(todayDateString);

    // Find the latest open punch for today
    const openPunch = await prisma.attendanceRecord.findFirst({
      where: {
        organizationId,
        employeeId,
        date: todayDate,
        checkOutTime: null,
      },
    });

    if (!openPunch) {
      throw {
        code: ErrorCode.VALIDATION_ERROR,
        status: 400,
        message: "No active check-in found for today to check out from.",
      };
    }

    // Calculate total minutes worked
    const totalMinutes = Math.max(
      0,
      Math.round((serverNow.getTime() - new Date(openPunch.checkInTime).getTime()) / 60000)
    );

    // If total minutes < 240 (4 hours) and status was not already LATE, could be marked HALF_DAY
    let status = openPunch.status;
    if (totalMinutes < 240 && status !== AttendanceStatus.LATE) {
      status = AttendanceStatus.HALF_DAY;
    }

    return prisma.attendanceRecord.update({
      where: { id: openPunch.id },
      data: {
        checkOutTime: serverNow,
        totalMinutes,
        status,
        notes: notes ? (openPunch.notes ? `${openPunch.notes} | ${notes}` : notes) : openPunch.notes,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  static async getTodayStatus(organizationId: string, employeeId: string) {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    const timezone = org?.timezone || "Asia/Kolkata";
    const todayDateString = getOrgDateString(new Date(), timezone);
    const todayDate = new Date(todayDateString);

    const record = await prisma.attendanceRecord.findFirst({
      where: {
        organizationId,
        employeeId,
        date: todayDate,
      },
      orderBy: { checkInTime: "desc" },
    });

    return {
      todayDate: todayDateString,
      record,
      isCheckedIn: Boolean(record && !record.checkOutTime),
    };
  }

  static async getHistory(params: {
    organizationId: string;
    employeeId: string;
    month?: number;
    year?: number;
  }) {
    const now = new Date();
    const year = params.year || now.getFullYear();
    const month = params.month || now.getMonth() + 1;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return prisma.attendanceRecord.findMany({
      where: {
        organizationId: params.organizationId,
        employeeId: params.employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "desc" },
    });
  }

  static async getOrgOverview(organizationId: string, targetDateString?: string) {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    const timezone = org?.timezone || "Asia/Kolkata";
    const dateStr = targetDateString || getOrgDateString(new Date(), timezone);
    const queryDate = new Date(dateStr);

    const employees = await prisma.employee.findMany({
      where: { organizationId, isActive: true },
      include: {
        department: { select: { id: true, name: true, code: true } },
        designation: { select: { id: true, title: true } },
        attendanceRecords: {
          where: { date: queryDate },
        },
      },
      orderBy: { employeeCode: "asc" },
    });

    return employees.map((emp) => {
      const punch = emp.attendanceRecords[0] || null;
      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department?.name,
        designation: emp.designation?.title,
        status: punch ? punch.status : AttendanceStatus.ABSENT,
        checkInTime: punch?.checkInTime || null,
        checkOutTime: punch?.checkOutTime || null,
        totalMinutes: punch?.totalMinutes || null,
        recordId: punch?.id || null,
      };
    });
  }

  static async correctAttendance(params: {
    organizationId: string;
    recordId: string;
    checkInTime?: string;
    checkOutTime?: string;
    status?: AttendanceStatus;
    reason: string;
    correctedById: string;
  }) {
    const existing = await prisma.attendanceRecord.findFirst({
      where: { id: params.recordId, organizationId: params.organizationId },
    });

    if (!existing) {
      throw {
        code: ErrorCode.NOT_FOUND,
        status: 404,
        message: "Attendance record not found",
      };
    }

    const checkIn = params.checkInTime ? new Date(params.checkInTime) : existing.checkInTime;
    const checkOut = params.checkOutTime ? new Date(params.checkOutTime) : existing.checkOutTime;

    let totalMinutes = existing.totalMinutes;
    if (checkIn && checkOut) {
      totalMinutes = Math.max(0, Math.round((checkOut.getTime() - checkIn.getTime()) / 60000));
    }

    return prisma.attendanceRecord.update({
      where: { id: params.recordId },
      data: {
        checkInTime: checkIn,
        checkOutTime: checkOut,
        totalMinutes,
        status: params.status || existing.status,
        correctionReason: params.reason,
        correctedById: params.correctedById,
      },
    });
  }
}
