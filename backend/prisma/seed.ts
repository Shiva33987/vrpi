import { PrismaClient, Role, AttendanceStatus, LeaveStatus, PayslipStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting VRPI HRMS database seed with synthetic data...");

  // Default seed password
  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || "Admin123!";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { code: "VRPI" },
    update: {},
    create: {
      name: "VRPI Technologies Inc.",
      code: "VRPI",
      timezone: "Asia/Kolkata",
      currency: "INR",
      settings: {
        create: {
          leaveYearStartMonth: 1,
          workDaysPerWeek: 5,
          dailyStandardHours: 8.0,
        },
      },
    },
  });

  console.log(`✅ Organization created: ${org.name} (${org.code})`);

  // 2. Departments
  const departmentsData = [
    { name: "Engineering", code: "ENG" },
    { name: "Human Resources", code: "HR" },
    { name: "Product & Design", code: "PROD" },
    { name: "Sales & Marketing", code: "SALES" },
  ];

  const deptMap = new Map<string, string>();
  for (const d of departmentsData) {
    const dept = await prisma.department.upsert({
      where: { organizationId_code: { organizationId: org.id, code: d.code } },
      update: {},
      create: {
        organizationId: org.id,
        name: d.name,
        code: d.code,
      },
    });
    deptMap.set(d.code, dept.id);
  }

  // 3. Designations
  const designationsData = [
    { title: "VP of Engineering", deptCode: "ENG" },
    { title: "Lead Software Architect", deptCode: "ENG" },
    { title: "Senior Fullstack Engineer", deptCode: "ENG" },
    { title: "Junior Software Developer", deptCode: "ENG" },
    { title: "DevOps Engineer", deptCode: "ENG" },
    { title: "QA Engineer", deptCode: "ENG" },
    { title: "HR Director", deptCode: "HR" },
    { title: "HR Generalist", deptCode: "HR" },
    { title: "Talent Specialist", deptCode: "HR" },
    { title: "Product Manager", deptCode: "PROD" },
    { title: "Senior UI/UX Designer", deptCode: "PROD" },
    { title: "Head of Sales", deptCode: "SALES" },
    { title: "Account Executive", deptCode: "SALES" },
  ];

  const desigMap = new Map<string, string>();
  for (const desig of designationsData) {
    const deptId = deptMap.get(desig.deptCode)!;
    const created = await prisma.designation.upsert({
      where: {
        organizationId_departmentId_title: {
          organizationId: org.id,
          departmentId: deptId,
          title: desig.title,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        departmentId: deptId,
        title: desig.title,
      },
    });
    desigMap.set(desig.title, created.id);
  }

  // 4. Shifts & Holidays
  await prisma.shift.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "General Shift" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "General Shift",
      startTime: "09:00",
      endTime: "18:00",
      gracePeriodMinutes: 15,
    },
  });

  const holidays = [
    { name: "New Year's Day", date: new Date("2026-01-01") },
    { name: "Republic Day", date: new Date("2026-01-26") },
    { name: "Independence Day", date: new Date("2026-08-15") },
    { name: "Diwali Festival", date: new Date("2026-11-08") },
    { name: "Christmas Day", date: new Date("2026-12-25") },
  ];

  for (const h of holidays) {
    await prisma.holiday.upsert({
      where: { organizationId_date: { organizationId: org.id, date: h.date } },
      update: {},
      create: {
        organizationId: org.id,
        name: h.name,
        date: h.date,
      },
    });
  }

  // 5. Leave Types
  const leaveTypesData = [
    { name: "Casual Leave", code: "CL", daysPerYear: 12 },
    { name: "Sick Leave", code: "SL", daysPerYear: 10 },
    { name: "Earned Leave", code: "EL", daysPerYear: 15 },
  ];

  const leaveTypeMap = new Map<string, string>();
  for (const lt of leaveTypesData) {
    const created = await prisma.leaveType.upsert({
      where: { organizationId_code: { organizationId: org.id, code: lt.code } },
      update: {},
      create: {
        organizationId: org.id,
        name: lt.name,
        code: lt.code,
        daysPerYear: lt.daysPerYear,
      },
    });
    leaveTypeMap.set(lt.code, created.id);
  }

  // 6. Users and Employees
  const usersToCreate: Array<{
    email: string;
    role: Role;
    code: string;
    firstName: string;
    lastName: string;
    phone: string;
    deptCode: string;
    desigTitle: string;
    salary: number;
    managerCode?: string;
  }> = [
    {
      email: "superadmin@vrpi.com",
      role: Role.SUPER_ADMIN,
      code: "VRPI-001",
      firstName: "Vikram",
      lastName: "Rao",
      phone: "+91-9876543210",
      deptCode: "ENG",
      desigTitle: "VP of Engineering",
      salary: 250000,
    },
    {
      email: "hradmin@vrpi.com",
      role: Role.HR_ADMIN,
      code: "VRPI-002",
      firstName: "Sunita",
      lastName: "Kapoor",
      phone: "+91-9876543211",
      deptCode: "HR",
      desigTitle: "HR Director",
      salary: 180000,
    },
    {
      email: "hr@vrpi.com",
      role: Role.HR,
      code: "VRPI-003",
      firstName: "Aditi",
      lastName: "Joshi",
      phone: "+91-9876543212",
      deptCode: "HR",
      desigTitle: "HR Generalist",
      salary: 75000,
      managerCode: "VRPI-002",
    },
    {
      email: "rahul.sharma@vrpi.com",
      role: Role.EMPLOYEE,
      code: "VRPI-004",
      firstName: "Rahul",
      lastName: "Sharma",
      phone: "+91-9876543213",
      deptCode: "ENG",
      desigTitle: "Lead Software Architect",
      salary: 195000,
      managerCode: "VRPI-001",
    },
    {
      email: "priya.patel@vrpi.com",
      role: Role.EMPLOYEE,
      code: "VRPI-005",
      firstName: "Priya",
      lastName: "Patel",
      phone: "+91-9876543214",
      deptCode: "ENG",
      desigTitle: "Senior Fullstack Engineer",
      salary: 140000,
      managerCode: "VRPI-004",
    },
    {
      email: "amit.kumar@vrpi.com",
      role: Role.EMPLOYEE,
      code: "VRPI-006",
      firstName: "Amit",
      lastName: "Kumar",
      phone: "+91-9876543215",
      deptCode: "ENG",
      desigTitle: "Junior Software Developer",
      salary: 60000,
      managerCode: "VRPI-005",
    },
    {
      email: "neha.singh@vrpi.com",
      role: Role.EMPLOYEE,
      code: "VRPI-007",
      firstName: "Neha",
      lastName: "Singh",
      phone: "+91-9876543216",
      deptCode: "PROD",
      desigTitle: "Senior UI/UX Designer",
      salary: 125000,
    },
    {
      email: "vikram.mehta@vrpi.com",
      role: Role.EMPLOYEE,
      code: "VRPI-008",
      firstName: "Vikram",
      lastName: "Mehta",
      phone: "+91-9876543217",
      deptCode: "PROD",
      desigTitle: "Product Manager",
      salary: 160000,
    },
    {
      email: "karan.verma@vrpi.com",
      role: Role.EMPLOYEE,
      code: "VRPI-009",
      firstName: "Karan",
      lastName: "Verma",
      phone: "+91-9876543218",
      deptCode: "SALES",
      desigTitle: "Head of Sales",
      salary: 170000,
    },
    {
      email: "ananya.deshmukh@vrpi.com",
      role: Role.EMPLOYEE,
      code: "VRPI-010",
      firstName: "Ananya",
      lastName: "Deshmukh",
      phone: "+91-9876543219",
      deptCode: "SALES",
      desigTitle: "Account Executive",
      salary: 80000,
      managerCode: "VRPI-009",
    },
  ];

  const employeeCodeToId = new Map<string, string>();

  // Pass 1: Create users and employees without managerId
  for (const u of usersToCreate) {
    const user = await prisma.user.upsert({
      where: { organizationId_email: { organizationId: org.id, email: u.email } },
      update: { role: u.role, passwordHash },
      create: {
        organizationId: org.id,
        email: u.email,
        passwordHash,
        role: u.role,
        isActive: true,
      },
    });

    const employee = await prisma.employee.upsert({
      where: { organizationId_employeeCode: { organizationId: org.id, employeeCode: u.code } },
      update: { userId: user.id },
      create: {
        organizationId: org.id,
        userId: user.id,
        employeeCode: u.code,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        joiningDate: new Date("2024-01-15"),
        departmentId: deptMap.get(u.deptCode)!,
        designationId: desigMap.get(u.desigTitle)!,
        isActive: true,
      },
    });

    employeeCodeToId.set(u.code, employee.id);

    // Initial Leave Balances for 2026
    for (const [code, ltId] of leaveTypeMap.entries()) {
      const allocated = code === "CL" ? 12 : code === "SL" ? 10 : 15;
      await prisma.leaveBalance.upsert({
        where: {
          organizationId_employeeId_leaveTypeId_year: {
            organizationId: org.id,
            employeeId: employee.id,
            leaveTypeId: ltId,
            year: 2026,
          },
        },
        update: {},
        create: {
          organizationId: org.id,
          employeeId: employee.id,
          leaveTypeId: ltId,
          year: 2026,
          allocatedDays: allocated,
          usedDays: 0,
          pendingDays: 0,
          remainingDays: allocated,
        },
      });
    }

    // Salary Record
    await prisma.salaryRecord.create({
      data: {
        organizationId: org.id,
        employeeId: employee.id,
        effectiveFrom: new Date("2026-01-01"),
        baseSalary: u.salary,
        allowances: u.salary * 0.2,
        deductions: u.salary * 0.1,
        currency: "INR",
      },
    });

    // Sample Payslip for Last Month (e.g. Month 9, 2026)
    await prisma.payslip.upsert({
      where: {
        organizationId_employeeId_month_year: {
          organizationId: org.id,
          employeeId: employee.id,
          month: 9,
          year: 2026,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        employeeId: employee.id,
        month: 9,
        year: 2026,
        grossPay: u.salary * 1.2,
        netPay: u.salary * 1.1,
        status: PayslipStatus.PUBLISHED,
        publishedAt: new Date("2026-10-01"),
      },
    });
  }

  // Pass 2: Update manager relationships
  for (const u of usersToCreate) {
    if (u.managerCode) {
      const empId = employeeCodeToId.get(u.code)!;
      const mgrId = employeeCodeToId.get(u.managerCode);
      if (mgrId) {
        await prisma.employee.update({
          where: { id: empId },
          data: { managerId: mgrId },
        });
      }
    }
  }

  // 7. Sample Attendance Records for past 3 days for Employee VRPI-005 (Priya)
  const priyaId = employeeCodeToId.get("VRPI-005")!;
  const attendanceDates = [
    { date: "2026-10-12", inHour: 9, outHour: 18, mins: 540 },
    { date: "2026-10-13", inHour: 9, outHour: 18, mins: 540 },
    { date: "2026-10-14", inHour: 9, outHour: 18, mins: 540 },
  ];

  for (const a of attendanceDates) {
    const checkIn = new Date(`${a.date}T09:05:00Z`);
    const checkOut = new Date(`${a.date}T18:05:00Z`);
    await prisma.attendanceRecord.create({
      data: {
        organizationId: org.id,
        employeeId: priyaId,
        date: new Date(a.date),
        checkInTime: checkIn,
        checkOutTime: checkOut,
        totalMinutes: a.mins,
        status: AttendanceStatus.PRESENT,
        checkInSource: "MOBILE",
      },
    });
  }

  // 8. Sample Leave Requests in various states
  const clTypeId = leaveTypeMap.get("CL")!;
  const rahulId = employeeCodeToId.get("VRPI-004")!;

  // Approved leave
  const approvedReq = await prisma.leaveRequest.create({
    data: {
      organizationId: org.id,
      employeeId: priyaId,
      leaveTypeId: clTypeId,
      startDate: new Date("2026-09-10"),
      endDate: new Date("2026-09-11"),
      totalDays: 2,
      isHalfDay: false,
      reason: "Family event",
      status: LeaveStatus.APPROVED,
      reviewedById: rahulId,
      reviewComment: "Approved, have a great time.",
      reviewedAt: new Date("2026-09-08"),
    },
  });

  await prisma.leaveApprovalHistory.create({
    data: {
      organizationId: org.id,
      leaveRequestId: approvedReq.id,
      actorId: rahulId,
      action: "APPROVED",
      comment: "Approved, have a great time.",
    },
  });

  // Pending leave
  await prisma.leaveRequest.create({
    data: {
      organizationId: org.id,
      employeeId: priyaId,
      leaveTypeId: clTypeId,
      startDate: new Date("2026-10-25"),
      endDate: new Date("2026-10-26"),
      totalDays: 2,
      isHalfDay: false,
      reason: "Personal travel",
      status: LeaveStatus.PENDING,
    },
  });

  console.log("=================================================");
  console.log("🎉 SEED COMPLETED SUCCESSFULLY!");
  console.log("Default Password for all seeded users:", defaultPassword);
  console.log("Sample Users created:");
  console.log("  Super Admin : superadmin@vrpi.com");
  console.log("  HR Admin    : hradmin@vrpi.com");
  console.log("  HR User     : hr@vrpi.com");
  console.log("  Employee    : priya.patel@vrpi.com (Senior Fullstack)");
  console.log("  Employee    : rahul.sharma@vrpi.com (Lead Architect)");
  console.log("=================================================");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
