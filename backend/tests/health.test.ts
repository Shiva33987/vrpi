import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/index";
import { UserRole } from "@vrpi-hrms/shared";

describe("Backend Foundation & Shared Verification", () => {
  it("GET /health responds with healthy status and uptime", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("healthy");
    expect(typeof res.body.data.uptime).toBe("number");
  });

  it("GET /ready responds with ready: true", async () => {
    const res = await request(app).get("/ready");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ready).toBe(true);
  });

  it("GET /api/v1/status resolves shared package and verifies RBAC permissions", async () => {
    const res = await request(app).get("/api/v1/status");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("VRPI HRMS Backend API");
    expect(res.body.data.sharedVerification.canHrAdminApproveLeave).toBe(true);
    expect(res.body.data.sharedVerification.testedRole).toBe(UserRole.HR_ADMIN);
  });
});
