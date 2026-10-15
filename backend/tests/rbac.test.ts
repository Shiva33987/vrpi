import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/index";

describe("Phase 2: RBAC & Permission Enforcement Tests", () => {
  let employeeToken: string;
  let hrToken: string;
  let hrAdminToken: string;

  beforeAll(async () => {
    // 1. Employee login
    const empLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "priya.patel@vrpi.com", password: "Admin123!" });
    employeeToken = empLogin.body.data.accessToken;

    // 2. HR login
    const hrLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "hr@vrpi.com", password: "Admin123!" });
    hrToken = hrLogin.body.data.accessToken;

    // 3. HR Admin login
    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "hradmin@vrpi.com", password: "Admin123!" });
    hrAdminToken = adminLogin.body.data.accessToken;
  });

  it("blocks unauthenticated requests with 401", async () => {
    const res = await request(app).get("/api/v1/test/hr-admin-only");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("blocks EMPLOYEE from accessing HR-Admin-only endpoint with 403", async () => {
    const res = await request(app)
      .get("/api/v1/test/hr-admin-only")
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("blocks HR from accessing Payroll management with 403", async () => {
    const res = await request(app)
      .get("/api/v1/test/payroll-access")
      .set("Authorization", `Bearer ${hrToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("allows HR_ADMIN to access HR-Admin-only endpoint with 200", async () => {
    const res = await request(app)
      .get("/api/v1/test/hr-admin-only")
      .set("Authorization", `Bearer ${hrAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe("HR_ADMIN");
  });

  it("allows HR_ADMIN to access Payroll management endpoint with 200", async () => {
    const res = await request(app)
      .get("/api/v1/test/payroll-access")
      .set("Authorization", `Bearer ${hrAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
