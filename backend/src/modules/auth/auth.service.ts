import { prisma } from "../../prisma";
import crypto from "crypto";
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../../utils/security";
import { AuthUserPayload, UserRole, ErrorCode } from "@vrpi-hrms/shared";

const REFRESH_TOKEN_DAYS = 7;

export class AuthService {
  static async login(params: {
    email: string;
    password: string;
    organizationCode?: string;
    ipAddress?: string;
    deviceInfo?: string;
  }) {
    const { email, password, organizationCode } = params;

    // Find user by email (optionally within an organization code if specified, otherwise unique)
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        ...(organizationCode ? { organization: { code: organizationCode } } : {}),
      },
      include: {
        organization: true,
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            department: { select: { id: true, name: true, code: true } },
            designation: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw {
        code: ErrorCode.UNAUTHENTICATED,
        status: 401,
        message: "Invalid email or password",
      };
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw {
        code: ErrorCode.UNAUTHENTICATED,
        status: 401,
        message: "Invalid email or password",
      };
    }

    // Auth payload
    const authPayload: AuthUserPayload = {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role as UserRole,
      employeeId: user.employee?.id,
    };

    const accessToken = generateAccessToken(authPayload);
    const rawRefreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(rawRefreshToken);
    const familyId = crypto.randomUUID();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

    // Save session family in DB
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        familyId,
        expiresAt,
        ipAddress: params.ipAddress,
        deviceInfo: params.deviceInfo,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          code: user.organization.code,
          timezone: user.organization.timezone,
          currency: user.organization.currency,
        },
        employee: user.employee,
      },
    };
  }

  static async rotateRefreshToken(rawRefreshToken: string, ipAddress?: string, deviceInfo?: string) {
    if (!rawRefreshToken) {
      throw {
        code: ErrorCode.UNAUTHENTICATED,
        status: 401,
        message: "Refresh token is missing",
      };
    }

    const tokenHash = hashRefreshToken(rawRefreshToken);

    const session = await prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: {
        user: {
          include: {
            employee: { select: { id: true } },
          },
        },
      },
    });

    // Reuse detection: If token exists but is marked revoked, invalidate entire family!
    if (session && session.isRevoked) {
      console.warn(`[SECURITY ALERT] Refresh token reuse detected for user ${session.userId}, family ${session.familyId}! Revoking family.`);
      await prisma.session.updateMany({
        where: { familyId: session.familyId },
        data: { isRevoked: true },
      });
      throw {
        code: ErrorCode.TOKEN_REUSE_DETECTED,
        status: 403,
        message: "Token reuse detected. All sessions in this family have been revoked. Please log in again.",
      };
    }

    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      throw {
        code: ErrorCode.UNAUTHENTICATED,
        status: 401,
        message: "Invalid or expired session. Please log in again.",
      };
    }

    // Revoke old token
    await prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    // Create new token in the same family
    const newRawRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashRefreshToken(newRawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

    await prisma.session.create({
      data: {
        userId: session.userId,
        refreshTokenHash: newRefreshTokenHash,
        familyId: session.familyId,
        expiresAt,
        ipAddress,
        deviceInfo: deviceInfo || session.deviceInfo,
      },
    });

    const authPayload: AuthUserPayload = {
      userId: session.user.id,
      email: session.user.email,
      organizationId: session.user.organizationId,
      role: session.user.role as UserRole,
      employeeId: session.user.employee?.id,
    };

    const newAccessToken = generateAccessToken(authPayload);

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  static async logout(rawRefreshToken?: string, userId?: string) {
    if (rawRefreshToken) {
      const tokenHash = hashRefreshToken(rawRefreshToken);
      const session = await prisma.session.findUnique({
        where: { refreshTokenHash: tokenHash },
      });
      if (session) {
        await prisma.session.updateMany({
          where: { familyId: session.familyId },
          data: { isRevoked: true },
        });
      }
    } else if (userId) {
      await prisma.session.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    }
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        employee: {
          include: {
            department: true,
            designation: true,
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw {
        code: ErrorCode.NOT_FOUND,
        status: 404,
        message: "User account not found",
      };
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        code: user.organization.code,
        timezone: user.organization.timezone,
        currency: user.organization.currency,
      },
      employee: user.employee,
    };
  }
}
