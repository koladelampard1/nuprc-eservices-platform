"use server";

import type { UserRoleCode } from "@prisma/client";
import { hash } from "bcryptjs";
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

export async function createUserAction(formData: FormData) {
  const actor = await requireAdminUser();
  const fullName = asText(formData.get("fullName"));
  const email = asText(formData.get("email")).toLowerCase();
  const password = asText(formData.get("password"));
  const roleCode = asText(formData.get("roleCode")) as UserRoleCode;
  const companyId = asText(formData.get("companyId"));
  const isActive = formData.get("isActive") === "on";

  if (!fullName || !email || !password || !roleCode) {
    redirect("/admin/users?error=Name%2C+email%2C+password%2C+and+role+are+required.");
  }

  if (roleCode === "SUPER_ADMIN" && actor.roleCode !== "SUPER_ADMIN") {
    redirect("/admin/users?error=Only+Super+Admin+can+create+Super+Admin+accounts.");
  }

  const role = await prisma.role.findUnique({ where: { code: roleCode } });
  if (!role) {
    redirect("/admin/users?error=Selected+role+does+not+exist.");
  }

  const requiresCompany = roleCode === "EXTERNAL_OPERATOR" || roleCode === "COMPANY_ADMIN";
  if (requiresCompany && !companyId) {
    redirect("/admin/users?error=Selected+role+requires+a+company+assignment.");
  }

  const passwordHash = await hash(password, 10);

  try {
    const created = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        roleId: role.id,
        companyId: companyId || null,
        isActive
      }
    });

    await createAdminAuditLog({
      actorId: actor.id,
      action: "USER_CREATED",
      entityType: "USER",
      entityId: created.id,
      metadata: { roleCode, companyId: companyId || null }
    });
  } catch {
    redirect("/admin/users?error=Unable+to+create+user.+Email+must+be+unique.");
  }

  revalidatePath("/admin/users");
  redirect("/admin/users?success=User+created.");
}

export async function updateUserAssignmentAction(formData: FormData) {
  const actor = await requireAdminUser();
  const userId = asText(formData.get("userId"));
  const nextRoleCode = asText(formData.get("roleCode")) as UserRoleCode;
  const companyId = asText(formData.get("companyId"));
  const isActive = formData.get("isActive") === "on";

  if (!userId || !nextRoleCode) {
    redirect("/admin/users?error=Missing+user+assignment+fields.");
  }

  if (userId === actor.id && !isActive) {
    redirect("/admin/users?error=You+cannot+deactivate+your+own+account.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true }
  });

  if (!targetUser) {
    redirect("/admin/users?error=User+not+found.");
  }

  if ((targetUser.role.code === "SUPER_ADMIN" || nextRoleCode === "SUPER_ADMIN") && actor.roleCode !== "SUPER_ADMIN") {
    redirect("/admin/users?error=Only+Super+Admin+can+assign+or+edit+Super+Admin+roles.");
  }

  if (targetUser.id === actor.id && targetUser.role.code !== nextRoleCode) {
    redirect("/admin/users?error=You+cannot+change+your+own+role.");
  }

  const nextRole = await prisma.role.findUnique({ where: { code: nextRoleCode } });

  if (!nextRole) {
    redirect("/admin/users?error=Selected+role+does+not+exist.");
  }

  const requiresCompany = nextRoleCode === "EXTERNAL_OPERATOR" || nextRoleCode === "COMPANY_ADMIN";
  if (requiresCompany && !companyId) {
    redirect("/admin/users?error=Selected+role+requires+a+company+assignment.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      roleId: nextRole.id,
      companyId: companyId || null,
      isActive
    }
  });

  await createAdminAuditLog({
    actorId: actor.id,
    action: "USER_ASSIGNMENT_UPDATED",
    entityType: "USER",
    entityId: userId,
    metadata: {
      fromRole: targetUser.role.code,
      toRole: nextRoleCode,
      companyId: companyId || null,
      isActive
    }
  });

  revalidatePath("/admin/users");
  revalidatePath("/workspace", "layout");
  revalidatePath("/portal", "layout");
  redirect("/admin/users?success=User+assignment+updated.");
}
