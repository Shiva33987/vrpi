import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/security";
import { prisma } from "../prisma";
import {
  AuthUserPayload,
  ResourceName,
  ActionType,
  hasPermission,
  ErrorCode,
  ApiErrorResponse,
} from "@vrpi-hrms/shared";

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.UNAUTHENTICATED,
        message: "Authentication token missing or invalid",
      },
    };
    res.status(401).json(errorResponse);
    return;
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyAccessToken(token);

  if (!payload) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.TOKEN_EXPIRED,
        message: "Access token is invalid or expired",
      },
    };
    res.status(401).json(errorResponse);
    return;
  }

  // Verify that user exists, belongs to the same organization, and is active
  const user = await prisma.user.findFirst({
    where: {
      id: payload.userId,
      organizationId: payload.organizationId,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      organizationId: true,
      role: true,
      employee: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!user) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: "User account deactivated or not found",
      },
    };
    res.status(401).json(errorResponse);
    return;
  }

  req.user = {
    userId: user.id,
    email: user.email,
    organizationId: user.organizationId,
    role: user.role as any,
    employeeId: user.employee?.id,
  };

  next();
}

export function requirePermission(resource: ResourceName, action: ActionType) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: ErrorCode.UNAUTHENTICATED,
          message: "Authentication required",
        },
      };
      res.status(401).json(errorResponse);
      return;
    }

    const permitted = hasPermission(req.user.role, resource, action);
    if (!permitted) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: `Forbidden: role ${req.user.role} lacks '${action}' permission on '${resource}'`,
        },
      };
      res.status(403).json(errorResponse);
      return;
    }

    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCode.UNAUTHENTICATED, message: "Authentication required" },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: `Access denied. Required one of roles: [${roles.join(", ")}]`,
        },
      });
      return;
    }

    next();
  };
}
