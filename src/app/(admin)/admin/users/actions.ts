"use server";

import type { UserRoleCode } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminAuditLog, requireAdminUser } from "@/lib/admin-console";
import { prisma } from "@/lib/prisma";

function asText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function toggleUserActiveAction(formData: FormData) {
  const actor = await requireAdminUser();
  const userId = asText(formData.get("userId"));

  if (!userId) {
    redirect("/admin/users?error=Missing+user+identifier.");
  }

  if (userId === actor.id) {
    redirect("/admin/users?error=You+cannot+deactivate+your+own+account.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true }
  });

  if (!targetUser) {
    redirect("/admin/users?error=User+not+found.");
  }

  if (targetUser.role.code === "SUPER_ADMIN" && actor.roleCode !== "SUPER_ADMIN") {
    redirect("/admin/users?error=Only+Super+Admin+can+manage+Super+Admin+accounts.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: !targetUser.isActive }
  });

  await createAdminAuditLog({
    actorId: actor.id,
    action: "USER_STATUS_UPDATED",
    entityType: "USER",
    entityId: userId,
    metadata: { nextStatus: !targetUser.isActive ? "ACTIVE" : "INACTIVE" }
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?success=User+status+updated.");
}

export async function updateUserRoleAction(formData: FormData) {
  const actor = await requireAdminUser();
  const userId = asText(formData.get("userId"));
  const nextRoleCode = asText(formData.get("roleCode")) as UserRoleCode;

  if (!userId || !nextRoleCode) {
    redirect("/admin/users?error=Missing+role+update+fields.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true }
  });

  if (!targetUser) {
    redirect("/admin/users?error=User+not+found.");
  }

  if (targetUser.id === actor.id) {
    redirect("/admin/users?error=You+cannot+change+your+own+role.");
  }

  if ((targetUser.role.code === "SUPER_ADMIN" || nextRoleCode === "SUPER_ADMIN") && actor.roleCode !== "SUPER_ADMIN") {
    redirect("/admin/users?error=Only+Super+Admin+can+assign+or+edit+Super+Admin+roles.");
  }

  const nextRole = await prisma.role.findUnique({ where: { code: nextRoleCode } });

  if (!nextRole) {
    redirect("/admin/users?error=Selected+role+does+not+exist.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { roleId: nextRole.id }
  });

  await createAdminAuditLog({
    actorId: actor.id,
    action: "USER_ROLE_UPDATED",
    entityType: "USER",
    entityId: userId,
    metadata: { from: targetUser.role.code, to: nextRoleCode }
  });

  revalidatePath("/admin/users");
  revalidatePath("/workspace", "layout");
  revalidatePath("/portal", "layout");
  redirect("/admin/users?success=User+role+updated.");
}
