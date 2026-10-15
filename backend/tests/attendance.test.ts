import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/index";
import { prisma } from "../src/prisma";

describe("Phase 4: Attendance Tracking & Idempotency Tests", () => {
  let employeeToken: string;
  let hrAdminToken: string;
  let employeeId: string;
  let organizationId: string;

  beforeAll(async () => {
    // 1. Login as Priya Patel
    const empLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "priya.patel@vrpi.com", password: "Admin123!" });
    employeeToken = empLogin.body.data.accessToken;
    employeeId = empLogin.body.data.user.employee.id;
    organizationId = empLogin.body.data.user.organization.id;

    // 2. Login as HR Admin
    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "hradmin@vrpi.com", password: "Admin123!" });
    hrAdminToken = adminLogin.body.data.accessToken;

    // Clean up any existing attendance records for Priya today so test starts clean
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    await prisma.attendanceRecord.deleteMany({
      where: { employeeId, date: today },
    });
  });

  afterAll(async () => {
    // Clean up test records
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    await prisma.attendanceRecord.deleteMany({
      where: { employeeId, date: today },
    });
  });

  it("POST /api/v1/attendance/check-in - punches in with server timestamp and idempotency", async () => {
    const idempotencyKey = `punch-in-${Date.now()}`;

    // 1. Initial Punch In
    const res1 = await request(app)
      .post("/api/v1/attendance/check-in")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        idempotencyKey,
        notes: "Starting shift from home",
      });

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.checkInTime).toBeDefined();
    expect(res1.body.data.checkOutTime).toBeNull();
    expect(res1.body.data.employeeId).toBe(employeeId);

    // 2. Idempotent Retry: same key should return exact same record without duplicate error
    const res2 = await request(app)
      .post("/api/v1/attendance/check-in")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        idempotencyKey,
        notes: "Network retry",
      });

    expect(res2.status).toBe(201);
    expect(res2.body.data.id).toBe(res1.body.data.id);
  });

  it("POST /api/v1/attendance/check-in - rejects duplicate open check-in on the same day", async () => {
    const res = await request(app)
      .post("/api/v1/attendance/check-in")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        idempotencyKey: `another-key-${Date.now()}`,
        notes: "Trying second check-in",
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("GET /api/v1/attendance/today - shows currently checked in status", async () => {
    const res = await request(app)
      .get("/api/v1/attendance/today")
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isCheckedIn).toBe(true);
    expect(res.body.data.record.checkOutTime).toBeNull();
  });

  it("POST /api/v1/attendance/check-out - punches out and calculates minutes worked", async () => {
    const res = await request(app)
      .post("/api/v1/attendance/check-out")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        idempotencyKey: `punch-out-${Date.now()}`,
        notes: "Shift complete",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.checkOutTime).toBeDefined();
    expect(typeof res.body.data.totalMinutes).toBe("number");
  });

  it("POST /api/v1/attendance/check-out - fails if no active check-in exists", async () => {
    const res = await request(app)
      .post("/api/v1/attendance/check-out")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        idempotencyKey: `punch-out-again-${Date.now()}`,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("GET /api/v1/attendance/overview - HR Admin views daily organization roster", async () => {
    const res = await request(app)
      .get("/api/v1/attendance/overview")
      .set("Authorization", `Bearer ${hrAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("PUT /api/v1/attendance/:id/correct - HR Admin manually corrects timecard with reason", async () => {
    // Find the record we created
    const record = await prisma.attendanceRecord.findFirst({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });

    const res = await request(app)
      .put(`/api/v1/attendance/${record!.id}/correct`)
      .set("Authorization", `Bearer ${hrAdminToken}`)
      .send({
        checkInTime: "2026-10-15T09:00:00Z",
        checkOutTime: "2026-10-15T18:00:00Z",
        status: "PRESENT",
        reason: "Employee forgot to punch check-out due to network outage",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalMinutes).toBe(540); // 9 hours
    expect(res.body.data.correctionReason).toContain("forgot to punch");
  });
});
