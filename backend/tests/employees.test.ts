import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/index";
import { prisma } from "../src/prisma";

describe("Phase 3: Employee Management & Directory Tests", () => {
  let hrAdminToken: string;
  let employeeToken: string;
  let engineeringDeptId: string;
  let juniorDevDesigId: string;

  beforeAll(async () => {
    // 1. HR Admin login
    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "hradmin@vrpi.com", password: "Admin123!" });
    hrAdminToken = adminLogin.body.data.accessToken;

    // 2. Employee login
    const empLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "priya.patel@vrpi.com", password: "Admin123!" });
    employeeToken = empLogin.body.data.accessToken;

    // 3. Get Dept and Desig IDs
    const dept = await prisma.department.findFirst({ where: { code: "ENG" } });
    engineeringDeptId = dept!.id;

    const desig = await prisma.designation.findFirst({ where: { title: "Junior Software Developer" } });
    juniorDevDesigId = desig!.id;
  });

  it("GET /api/v1/employees - lists employees with pagination and filters", async () => {
    const res = await request(app)
      .get("/api/v1/employees?page=1&limit=5")
      .set("Authorization", `Bearer ${hrAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.total).toBeGreaterThan(0);
  });

  it("POST /api/v1/employees - allows HR Admin to create a new employee", async () => {
    const uniqueCode = `EMP-TEST-${Date.now()}`;
    const uniqueEmail = `test.emp.${Date.now()}@vrpi.com`;

    const createPayload = {
      employeeCode: uniqueCode,
      firstName: "Test",
      lastName: "User",
      email: uniqueEmail,
      phone: "+91-9999888877",
      departmentId: engineeringDeptId,
      designationId: juniorDevDesigId,
      joiningDate: "2026-03-01",
      role: "EMPLOYEE",
    };

    const res = await request(app)
      .post("/api/v1/employees")
      .set("Authorization", `Bearer ${hrAdminToken}`)
      .send(createPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.employeeCode).toBe(uniqueCode);
    expect(res.body.data.email).toBe(uniqueEmail);

    // Verify employee user account created in DB
    const user = await prisma.user.findFirst({ where: { email: uniqueEmail } });
    expect(user).toBeDefined();
    expect(user!.isActive).toBe(true);
  });

  it("PUT /api/v1/employees/:id - updates employee details", async () => {
    const targetEmp = await prisma.employee.findFirst({
      where: { employeeCode: "VRPI-006" }, // Amit Kumar
    });

    const res = await request(app)
      .put(`/api/v1/employees/${targetEmp!.id}`)
      .set("Authorization", `Bearer ${hrAdminToken}`)
      .send({ phone: "+91-9111222333" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.phone).toBe("+91-9111222333");
  });

  it("DELETE /api/v1/employees/:id - soft deactivates employee and revokes sessions", async () => {
    // 1. Create a throwaway employee
    const throwawayCode = `TEMP-${Date.now()}`;
    const throwawayEmail = `temp.${Date.now()}@vrpi.com`;

    const createRes = await request(app)
      .post("/api/v1/employees")
      .set("Authorization", `Bearer ${hrAdminToken}`)
      .send({
        employeeCode: throwawayCode,
        firstName: "Temp",
        lastName: "Deactivate",
        email: throwawayEmail,
        departmentId: engineeringDeptId,
        designationId: juniorDevDesigId,
        joiningDate: "2026-01-01",
        role: "EMPLOYEE",
      });

    const empId = createRes.body.data.id;

    // 2. Soft deactivate
    const deleteRes = await request(app)
      .delete(`/api/v1/employees/${empId}`)
      .set("Authorization", `Bearer ${hrAdminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // 3. Verify in DB that employee and user are inactive
    const updatedEmp = await prisma.employee.findUnique({ where: { id: empId } });
    expect(updatedEmp!.isActive).toBe(false);

    const updatedUser = await prisma.user.findFirst({ where: { email: throwawayEmail } });
    expect(updatedUser!.isActive).toBe(false);
  });

  it("GET /api/v1/employees/export - exports CSV data", async () => {
    const res = await request(app)
      .get("/api/v1/employees/export")
      .set("Authorization", `Bearer ${hrAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("EmployeeCode,FirstName,LastName,Email");
    expect(res.text).toContain("VRPI-001");
  });

  it("POST /api/v1/employees/import - validates and imports bulk rows", async () => {
    const batchTimestamp = Date.now();
    const rows = [
      {
        employeeCode: `IMP-${batchTimestamp}-1`,
        firstName: "BulkFirst",
        lastName: "BulkLast",
        email: `bulk1.${batchTimestamp}@vrpi.com`,
        departmentCode: "ENG",
        designationTitle: "Junior Software Developer",
        joiningDate: "2026-02-15",
      },
      {
        employeeCode: `IMP-${batchTimestamp}-2`,
        firstName: "InvalidDept",
        lastName: "Row",
        email: `invalid.${batchTimestamp}@vrpi.com`,
        departmentCode: "NON_EXISTENT_DEPT",
        designationTitle: "Junior Software Developer",
        joiningDate: "2026-02-15",
      },
    ];

    const res = await request(app)
      .post("/api/v1/employees/import")
      .set("Authorization", `Bearer ${hrAdminToken}`)
      .send({ rows });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalRows).toBe(2);
    expect(res.body.data.importedCount).toBe(1);
    expect(res.body.data.failedCount).toBe(1);
    expect(res.body.data.errors.length).toBe(1);
    expect(res.body.data.errors[0].field).toBe("departmentCode");
  });
});
