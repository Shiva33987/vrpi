import { Router, Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { authenticate, AuthenticatedRequest } from "../../middleware/auth";
import { recordAuditLog } from "../../middleware/audit";
import { LoginInputSchema, ApiResponse, ApiErrorResponse, ErrorCode } from "@vrpi-hrms/shared";

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// POST /api/v1/auth/login
router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = LoginInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: "Invalid login payload",
          details: parseResult.error.errors,
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    const { email, password } = parseResult.data;
    const organizationCode = req.body.organizationCode as string | undefined;

    const result = await AuthService.login({
      email,
      password,
      organizationCode,
      ipAddress: req.ip || (req.headers["x-forwarded-for"] as string),
      deviceInfo: req.headers["user-agent"],
    });

    // Set HttpOnly refresh token cookie for web browsers
    res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);

    // Audit log
    await recordAuditLog({
      req: {
        ...req,
        user: {
          userId: result.user.id,
          email: result.user.email,
          organizationId: result.user.organization.id,
          role: result.user.role as any,
        },
      } as AuthenticatedRequest,
      action: "USER_LOGIN",
      resource: "auth",
      resourceId: result.user.id,
    });

    const response: ApiResponse = {
      success: true,
      data: result,
    };
    res.status(200).json(response);
  } catch (err: any) {
    if (err.status && err.code) {
      res.status(err.status).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
      return;
    }
    next(err);
  }
});

// POST /api/v1/auth/refresh (Web - cookie or body)
router.post("/refresh", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rawRefreshToken) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHENTICATED,
          message: "Refresh token missing",
        },
      });
      return;
    }

    const rotated = await AuthService.rotateRefreshToken(
      rawRefreshToken,
      req.ip,
      req.headers["user-agent"]
    );

    res.cookie("refreshToken", rotated.refreshToken, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      data: rotated,
    });
  } catch (err: any) {
    if (err.status && err.code) {
      // Clear cookie on reuse or expiry
      res.clearCookie("refreshToken");
      res.status(err.status).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
      return;
    }
    next(err);
  }
});

// POST /api/v1/auth/mobile/refresh (Dedicated Mobile endpoint)
router.post("/mobile/refresh", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawRefreshToken = req.body?.refreshToken;

    if (!rawRefreshToken) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHENTICATED,
          message: "Refresh token is required in body for mobile clients",
        },
      });
      return;
    }

    const rotated = await AuthService.rotateRefreshToken(
      rawRefreshToken,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json({
      success: true,
      data: rotated,
    });
  } catch (err: any) {
    if (err.status && err.code) {
      res.status(err.status).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
      return;
    }
    next(err);
  }
});

// POST /api/v1/auth/logout
router.post("/logout", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    await AuthService.logout(rawRefreshToken);

    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      data: { message: "Successfully logged out" },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/me
router.get("/me", authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userProfile = await AuthService.getMe(req.user!.userId);
    res.status(200).json({
      success: true,
      data: userProfile,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
