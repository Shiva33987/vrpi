import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/index";
import { prisma } from "../src/prisma";

describe("Phase 4: Leave Round-Trip & Approval Workflow Tests", () => {
  let employeeToken: string;
  let hrAdminToken: string;
  let employeeId: string;
  let leaveTypeId: string;
  let createdRequestId: string;

  beforeAll(async () => {
    // 1. Login as Rahul Sharma (Lead Architect)
    const empLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "rahul.sharma@vrpi.com", password: "Admin123!" });
    employeeToken = empLogin.body.data.accessToken;
    employeeId = empLogin.body.data.user.employee.id;

    // 2. Login as HR Admin
    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "hradmin@vrpi.com", password: "Admin123!" });
    hrAdminToken = adminLogin.body.data.accessToken;

    // 3. Get Casual Leave Type ID
    const lt = await prisma.leaveType.findFirst({ where: { code: "CL" } });
    leaveTypeId = lt!.id;

    // Clean up any previous test requests and reset balance
    await prisma.leaveRequest.deleteMany({
      where: { employeeId },
    });
    await prisma.leaveBalance.updateMany({
      where: { employeeId, leaveTypeId, year: 2026 },
      data: { allocatedDays: 12, usedDays: 0, pendingDays: 0, remainingDays: 12 },
    });
  });

  it("GET /api/v1/leave/types - returns active company leave types", async () => {
    const res = await request(app)
      .get("/api/v1/leave/types")
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.some((t: any) => t.code === "CL")).toBe(true);
  });

  it("ROUND TRIP STEP 1: Employee checks initial balance and applies for 2 days leave", async () => {
    // 1. Get initial balance
    const initBalanceRes = await request(app)
      .get("/api/v1/leave/balances")
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(initBalanceRes.status).toBe(200);
    const clBalance = initBalanceRes.body.data.find((b: any) => b.leaveTypeId === leaveTypeId);
    expect(clBalance).toBeDefined();
    const initialRemaining = clBalance.remainingDays;

    // 2. Apply for leave (2026-11-02 to 2026-11-03 = 2 days)
    const applyRes = await request(app)
      .post("/api/v1/leave/requests")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        leaveTypeId,
        startDate: "2026-11-02",
        endDate: "2026-11-03",
        isHalfDay: false,
        reason: "Attending technical conference",
      });

    expect(applyRes.status).toBe(201);
    expect(applyRes.body.success).toBe(true);
    expect(applyRes.body.data.status).toBe("PENDING");
    expect(applyRes.body.data.totalDays).toBe(2);
    createdRequestId = applyRes.body.data.id;

    // 3. Verify balance reflects pending deduction
    const updatedBalanceRes = await request(app)
      .get("/api/v1/leave/balances")
      .set("Authorization", `Bearer ${employeeToken}`);

    const newClBalance = updatedBalanceRes.body.data.find((b: any) => b.leaveTypeId === leaveTypeId);
    expect(newClBalance.pendingDays).toBe(clBalance.pendingDays + 2);
    expect(newClBalance.remainingDays).toBe(initialRemaining - 2);
  });

  it("VALIDATION: rejects overlapping leave request during pending dates", async () => {
    const overlapRes = await request(app)
      .post("/api/v1/leave/requests")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        leaveTypeId,
        startDate: "2026-11-03",
        endDate: "2026-11-04",
        isHalfDay: false,
        reason: "Overlapping attempt",
      });

    expect(overlapRes.status).toBe(409);
    expect(overlapRes.body.success).toBe(false);
    expect(overlapRes.body.error.code).toBe("CONFLICT");
  });

  it("VALIDATION: rejects request with insufficient balance", async () => {
    const res = await request(app)
      .post("/api/v1/leave/requests")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({
        leaveTypeId,
        startDate: "2026-12-01",
        endDate: "2026-12-31", // 31 days > 12 days allocation
        isHalfDay: false,
        reason: "Excessive duration",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("ROUND TRIP STEP 2: HR Admin approves request in atomic transaction", async () => {
    const reviewRes = await request(app)
      .post(`/api/v1/leave/requests/${createdRequestId}/review`)
      .set("Authorization", `Bearer ${hrAdminToken}`)
      .send({
        decision: "APPROVED",
        comment: "Approved. Enjoy the conference!",
      });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.success).toBe(true);
    expect(reviewRes.body.data.status).toBe("APPROVED");
    expect(reviewRes.body.data.reviewComment).toContain("Enjoy the conference");

    // Check balance update: usedDays incremented, pendingDays decremented
    const balance = await prisma.leaveBalance.findFirst({
      where: { employeeId, leaveTypeId, year: 2026 },
    });
    expect(balance!.usedDays).toBe(2);
    expect(balance!.pendingDays).toBe(0);

    // Check approval history
    const history = await prisma.leaveApprovalHistory.findFirst({
      where: { leaveRequestId: createdRequestId, action: "APPROVED" },
    });
    expect(history).toBeDefined();
    expect(history!.comment).toContain("Enjoy the conference");
  });

  it("ROUND TRIP STEP 3: Employee verifies updated approved status in personal requests list", async () => {
    const res = await request(app)
      .get("/api/v1/leave/requests")
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const approvedReq = res.body.data.find((r: any) => r.id === createdRequestId);
    expect(approvedReq).toBeDefined();
    expect(approvedReq.status).toBe("APPROVED");
    expect(approvedReq.reviewedBy).toBeDefined();
    expect(approvedReq.approvalHistory.length).toBeGreaterThanOrEqual(2); // SUBMITTED + APPROVED
  });
});
