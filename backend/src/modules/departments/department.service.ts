import { prisma } from "../../prisma";

export class DepartmentService {
  static async list(organizationId: string) {
    return prisma.department.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { employees: true },
        },
        designations: true,
      },
      orderBy: { name: "asc" },
    });
  }

  static async create(organizationId: string, data: { name: string; code: string }) {
    return prisma.department.create({
      data: {
        organizationId,
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
      },
    });
  }

  static async listDesignations(organizationId: string, departmentId?: string) {
    return prisma.designation.findMany({
      where: {
        organizationId,
        ...(departmentId ? { departmentId } : {}),
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
      orderBy: { title: "asc" },
    });
  }

  static async createDesignation(
    organizationId: string,
    data: { departmentId: string; title: string }
  ) {
    return prisma.designation.create({
      data: {
        organizationId,
        departmentId: data.departmentId,
        title: data.title.trim(),
      },
    });
  }
}
