import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../src/prisma";

describe("Phase 2: Database Constraints & Raw SQL Verification", () => {
  let orgId: string;
  let employeeId: string;
  let leaveTypeId: string;

  beforeAll(async () => {
    const org = await prisma.organization.findUnique({ where: { code: "VRPI" } });
    if (!org) throw new Error("Seed organization not found");
    orgId = org.id;

    const emp = await prisma.employee.findFirst({ where: { organizationId: orgId } });
    if (!emp) throw new Error("Seed employee not found");
    employeeId = emp.id;

    const lt = await prisma.leaveType.findFirst({ where: { organizationId: orgId } });
    if (!lt) throw new Error("Seed leave type not found");
    leaveTypeId = lt.id;
  });

  it("enforces partial unique index: rejects duplicate open attendance records on the same day", async () => {
    const testDate = new Date("2026-12-01");

    // Clean up any test records for this day
    await prisma.attendanceRecord.deleteMany({
      where: { employeeId, date: testDate },
    });

    // 1. Create first open record (checkOutTime is null)
    const firstPunch = await prisma.attendanceRecord.create({
      data: {
        organizationId: orgId,
        employeeId,
        date: testDate,
        checkInTime: new Date("2026-12-01T09:00:00Z"),
        checkOutTime: null,
        checkInSource: "MOBILE",
      },
    });
    expect(firstPunch.id).toBeDefined();

    // 2. Attempt to create second open record on same date -> MUST fail due to partial unique index
    await expect(
      prisma.attendanceRecord.create({
        data: {
          organizationId: orgId,
          employeeId,
          date: testDate,
          checkInTime: new Date("2026-12-01T10:00:00Z"),
          checkOutTime: null,
          checkInSource: "MOBILE",
        },
      })
    ).rejects.toThrow();

    // Clean up
    await prisma.attendanceRecord.deleteMany({
      where: { employeeId, date: testDate },
    });
  });

  it("enforces date constraint: rejects leave request where endDate < startDate", async () => {
    // Attempt to insert invalid date range: startDate = 2026-11-20, endDate = 2026-11-15
    await expect(
      prisma.leaveRequest.create({
        data: {
          organizationId: orgId,
          employeeId,
          leaveTypeId,
          startDate: new Date("2026-11-20"),
          endDate: new Date("2026-11-15"),
          totalDays: 5,
          reason: "Invalid dates test",
        },
      })
    ).rejects.toThrow();
  });
});
