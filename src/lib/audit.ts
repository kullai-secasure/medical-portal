import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@prisma/client";

export async function logAccess(
  actorUserId: string,
  action: AuditAction,
  resourceType: string,
  description: string,
  options?: { patientId?: string; resourceId?: string }
) {
  return prisma.auditLog.create({
    data: {
      actorUserId,
      action,
      resourceType,
      description,
      patientId: options?.patientId,
      resourceId: options?.resourceId,
    },
  });
}

export async function getAuditLogs(filters?: {
  patientId?: string;
  actorUserId?: string;
  resourceType?: string;
  limit?: number;
}) {
  return prisma.auditLog.findMany({
    where: {
      patientId: filters?.patientId,
      actorUserId: filters?.actorUserId,
      resourceType: filters?.resourceType,
    },
    include: {
      actorUser: { select: { firstName: true, lastName: true, role: true, email: true } },
      patient: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: filters?.limit ?? 100,
  });
}
