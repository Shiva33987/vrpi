import { prisma } from "../../prisma";
import { hashPassword } from "../../utils/security";
import { Role } from "@prisma/client";
import { CreateEmployeeInput, ErrorCode } from "@vrpi-hrms/shared";

export class EmployeeService {
  static async list(params: {
    organizationId: string;
    page?: number;
    limit?: number;
    search?: string;
    departmentId?: string;
    isActive?: boolean;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: params.organizationId,
    };

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params.departmentId) {
      where.departmentId = params.departmentId;
    }

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { employeeCode: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        include: {
          department: { select: { id: true, name: true, code: true } },
          designation: { select: { id: true, title: true } },
          manager: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
          },
          user: {
            select: { id: true, role: true, isActive: true },
          },
        },
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getById(organizationId: string, id: string) {
    const employee = await prisma.employee.findFirst({
      where: { id, organizationId },
      include: {
        department: true,
        designation: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true },
        },
        user: {
          select: { id: true, role: true, isActive: true, createdAt: true },
        },
        leaveBalances: {
          include: { leaveType: true },
        },
      },
    });

    if (!employee) {
      throw {
        code: ErrorCode.NOT_FOUND,
        status: 404,
        message: "Employee not found",
      };
    }

    return employee;
  }

  static async create(organizationId: string, input: CreateEmployeeInput) {
    // 1. Check duplicate code
    const existingCode = await prisma.employee.findFirst({
      where: { organizationId, employeeCode: input.employeeCode.trim() },
    });
    if (existingCode) {
      throw {
        code: ErrorCode.CONFLICT,
        status: 409,
        message: `Employee code '${input.employeeCode}' already exists`,
      };
    }

    // 2. Check duplicate email
    const existingEmail = await prisma.employee.findFirst({
      where: { organizationId, email: input.email.toLowerCase().trim() },
    });
    if (existingEmail) {
      throw {
        code: ErrorCode.CONFLICT,
        status: 409,
        message: `Email '${input.email}' is already registered`,
      };
    }

    const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || "Admin123!";
    const passwordHash = await hashPassword(defaultPassword);

    return prisma.$transaction(async (tx) => {
      // Create user account
      const user = await tx.user.create({
        data: {
          organizationId,
          email: input.email.toLowerCase().trim(),
          passwordHash,
          role: input.role as Role,
          isActive: true,
        },
      });

      // Create employee record
      const employee = await tx.employee.create({
        data: {
          organizationId,
          userId: user.id,
          employeeCode: input.employeeCode.trim(),
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          email: input.email.toLowerCase().trim(),
          phone: input.phone?.trim() || null,
          joiningDate: new Date(input.joiningDate),
          departmentId: input.departmentId,
          designationId: input.designationId,
          managerId: input.managerId || null,
          isActive: true,
        },
        include: {
          department: true,
          designation: true,
          manager: {
            select: { id: true, firstName: true, lastName: true },
          },
          user: {
            select: { id: true, role: true },
          },
        },
      });

      // Initialize default leave balances for current year
      const currentYear = new Date().getFullYear();
      const leaveTypes = await tx.leaveType.findMany({
        where: { organizationId, isActive: true },
      });

      for (const lt of leaveTypes) {
        await tx.leaveBalance.create({
          data: {
            organizationId,
            employeeId: employee.id,
            leaveTypeId: lt.id,
            year: currentYear,
            allocatedDays: lt.daysPerYear,
            usedDays: 0,
            pendingDays: 0,
            remainingDays: lt.daysPerYear,
          },
        });
      }

      return employee;
    });
  }

  static async update(
    organizationId: string,
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      departmentId?: string;
      designationId?: string;
      managerId?: string | null;
      isActive?: boolean;
    }
  ) {
    const employee = await prisma.employee.findFirst({
      where: { id, organizationId },
    });

    if (!employee) {
      throw {
        code: ErrorCode.NOT_FOUND,
        status: 404,
        message: "Employee not found",
      };
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...(data.firstName ? { firstName: data.firstName.trim() } : {}),
        ...(data.lastName ? { lastName: data.lastName.trim() } : {}),
        ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
        ...(data.departmentId ? { departmentId: data.departmentId } : {}),
        ...(data.designationId ? { designationId: data.designationId } : {}),
        ...(data.managerId !== undefined ? { managerId: data.managerId } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: {
        department: true,
        designation: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return updated;
  }

  static async deactivate(organizationId: string, id: string) {
    const employee = await prisma.employee.findFirst({
      where: { id, organizationId },
      include: { user: true },
    });

    if (!employee) {
      throw {
        code: ErrorCode.NOT_FOUND,
        status: 404,
        message: "Employee not found",
      };
    }

    return prisma.$transaction(async (tx) => {
      // 1. Deactivate employee record
      const deactivatedEmp = await tx.employee.update({
        where: { id },
        data: { isActive: false },
      });

      // 2. Deactivate associated user and revoke active sessions
      if (employee.userId) {
        await tx.user.update({
          where: { id: employee.userId },
          data: { isActive: false },
        });

        await tx.session.updateMany({
          where: { userId: employee.userId },
          data: { isRevoked: true },
        });
      }

      return deactivatedEmp;
    });
  }

  static async importCsv(
    organizationId: string,
    rows: Array<{
      employeeCode: string;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      departmentCode: string;
      designationTitle: string;
      joiningDate: string;
      role?: string;
    }>
  ) {
    const departments = await prisma.department.findMany({ where: { organizationId } });
    const designations = await prisma.designation.findMany({ where: { organizationId } });

    const deptMap = new Map(departments.map((d) => [d.code.toUpperCase(), d.id]));
    const desigMap = new Map(designations.map((d) => [d.title.toLowerCase(), d.id]));

    const errors: Array<{ row: number; field: string; message: string }> = [];
    const validRows: Array<{
      input: CreateEmployeeInput;
      rowNum: number;
    }> = [];

    // Pre-check all rows
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 1;

      if (!r.employeeCode) errors.push({ row: rowNum, field: "employeeCode", message: "Employee code required" });
      if (!r.firstName) errors.push({ row: rowNum, field: "firstName", message: "First name required" });
      if (!r.lastName) errors.push({ row: rowNum, field: "lastName", message: "Last name required" });
      if (!r.email || !r.email.includes("@")) errors.push({ row: rowNum, field: "email", message: "Valid email required" });

      const deptId = deptMap.get(r.departmentCode?.trim().toUpperCase());
      if (!deptId) {
        errors.push({
          row: rowNum,
          field: "departmentCode",
          message: `Department '${r.departmentCode}' does not exist`,
        });
      }

      const desigId = desigMap.get(r.designationTitle?.trim().toLowerCase());
      if (!desigId) {
        errors.push({
          row: rowNum,
          field: "designationTitle",
          message: `Designation '${r.designationTitle}' does not exist`,
        });
      }

      if (deptId && desigId && r.employeeCode && r.email) {
        validRows.push({
          rowNum,
          input: {
            employeeCode: r.employeeCode,
            firstName: r.firstName,
            lastName: r.lastName,
            email: r.email,
            phone: r.phone,
            departmentId: deptId,
            designationId: desigId,
            joiningDate: r.joiningDate || new Date().toISOString().split("T")[0],
            role: (r.role as any) || Role.EMPLOYEE,
          },
        });
      }
    }

    let importedCount = 0;
    for (const item of validRows) {
      try {
        await this.create(organizationId, item.input);
        importedCount++;
      } catch (err: any) {
        errors.push({
          row: item.rowNum,
          field: "database",
          message: err.message || "Failed to create employee",
        });
      }
    }

    return {
      totalRows: rows.length,
      importedCount,
      failedCount: errors.length,
      errors,
    };
  }

  static async exportCsv(organizationId: string): Promise<string> {
    const employees = await prisma.employee.findMany({
      where: { organizationId },
      include: {
        department: true,
        designation: true,
        manager: true,
      },
      orderBy: { employeeCode: "asc" },
    });

    const headers = [
      "EmployeeCode",
      "FirstName",
      "LastName",
      "Email",
      "Phone",
      "Department",
      "Designation",
      "Manager",
      "JoiningDate",
      "Status",
    ];

    const lines = employees.map((e) => {
      const escape = (val: string | null | undefined) =>
        `"${(val || "").replace(/"/g, '""')}"`;

      return [
        escape(e.employeeCode),
        escape(e.firstName),
        escape(e.lastName),
        escape(e.email),
        escape(e.phone),
        escape(e.department?.name),
        escape(e.designation?.title),
        escape(e.manager ? `${e.manager.firstName} ${e.manager.lastName}` : ""),
        escape(e.joiningDate.toISOString().split("T")[0]),
        escape(e.isActive ? "ACTIVE" : "INACTIVE"),
      ].join(",");
    });

    return [headers.join(","), ...lines].join("\n");
  }
}
