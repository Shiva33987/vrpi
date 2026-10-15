import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/index";
import { prisma } from "../src/prisma";

describe("Phase 2: Authentication & Session Family Rotation", () => {
  const validEmail = "priya.patel@vrpi.com";
  const validPassword = "Admin123!";

  it("POST /api/v1/auth/login - succeeds with correct credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: validEmail, password: validPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe(validEmail);
    expect(res.body.data.user.role).toBe("EMPLOYEE");

    // Verify HttpOnly cookie
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain("refreshToken=");
    expect(cookies[0]).toContain("HttpOnly");
  });

  it("POST /api/v1/auth/login - rejects invalid password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: validEmail, password: "WrongPassword999!" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("GET /api/v1/auth/me - returns user profile with valid Bearer token", async () => {
    // 1. Login
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: validEmail, password: validPassword });

    const token = loginRes.body.data.accessToken;

    // 2. Fetch /me
    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.email).toBe(validEmail);
    expect(meRes.body.data.employee.firstName).toBe("Priya");
  });

  it("POST /api/v1/auth/refresh - rotates token family and detects token reuse", async () => {
    // 1. Initial login
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: validEmail, password: validPassword });

    const firstRefreshToken = loginRes.body.data.refreshToken;

    // 2. Rotate once
    const refreshRes1 = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: firstRefreshToken });

    expect(refreshRes1.status).toBe(200);
    expect(refreshRes1.body.success).toBe(true);
    expect(refreshRes1.body.data.accessToken).toBeDefined();
    expect(refreshRes1.body.data.refreshToken).toBeDefined();
    const secondRefreshToken = refreshRes1.body.data.refreshToken;
    expect(secondRefreshToken).not.toBe(firstRefreshToken);

    // 3. REUSE ATTACK SIMULATION: Re-submit the firstRefreshToken (already rotated!)
    const reuseRes = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: firstRefreshToken });

    expect(reuseRes.status).toBe(403);
    expect(reuseRes.body.success).toBe(false);
    expect(reuseRes.body.error.code).toBe("TOKEN_REUSE_DETECTED");

    // 4. Verify that the secondRefreshToken was also invalidated due to family revocation!
    const subsequentRes = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: secondRefreshToken });

    expect(subsequentRes.status).toBe(403);
    expect(subsequentRes.body.error.code).toBe("TOKEN_REUSE_DETECTED");
  });

  it("POST /api/v1/auth/mobile/refresh - supports dedicated mobile body payload", async () => {
    // 1. Login
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "hradmin@vrpi.com", password: validPassword });

    const refreshToken = loginRes.body.data.refreshToken;

    // 2. Mobile refresh
    const mobileRes = await request(app)
      .post("/api/v1/auth/mobile/refresh")
      .send({ refreshToken });

    expect(mobileRes.status).toBe(200);
    expect(mobileRes.body.success).toBe(true);
    expect(mobileRes.body.data.accessToken).toBeDefined();
    expect(mobileRes.body.data.refreshToken).toBeDefined();
  });

  it("POST /api/v1/auth/logout - revokes session family", async () => {
    // 1. Login
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: validEmail, password: validPassword });

    const refreshToken = loginRes.body.data.refreshToken;

    // 2. Logout
    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .send({ refreshToken });

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // 3. Trying to refresh after logout fails
    const refreshRes = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken });

    expect(refreshRes.status).toBe(403);
  });
});
