import { prisma } from "../prisma";
import { AuthenticatedRequest } from "./auth";

export async function recordAuditLog(params: {
  req: AuthenticatedRequest;
  action: string;
  resource: string;
  resourceId?: string;
  diff?: any;
}): Promise<void> {
  try {
    if (!params.req.user) return;

    await prisma.auditLog.create({
      data: {
        organizationId: params.req.user.organizationId,
        actorId: params.req.user.userId,
        actorEmail: params.req.user.email,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        diff: params.diff ? JSON.parse(JSON.stringify(params.diff)) : undefined,
        ipAddress: params.req.ip || (params.req.headers?.["x-forwarded-for"] as string) || null,
        userAgent: (params.req.headers?.["user-agent"] as string) || null,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
