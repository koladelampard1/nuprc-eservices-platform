import type { Prisma, UserRoleCode } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES: UserRoleCode[] = ["ADMIN", "SUPER_ADMIN"];

export async function requireAdminUser() {
  const session = await auth();
  const roleCode = session?.user?.roleCode as UserRoleCode | undefined;

  if (!session?.user?.id || !roleCode || !ADMIN_ROLES.includes(roleCode)) {
    redirect("/login");
  }

  return {
    id: session.user.id,
    roleCode
  };
}

export async function createAdminAuditLog(params: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata
    }
  });
}
