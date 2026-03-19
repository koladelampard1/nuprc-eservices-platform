import type { UserRoleCode } from "@prisma/client";

export const permissionMatrix: Record<
  "portal" | "workspace" | "admin",
  UserRoleCode[]
> = {
  portal: ["EXTERNAL_OPERATOR", "COMPANY_ADMIN"],
  workspace: ["REVIEW_OFFICER", "DIRECTOR", "ADMIN", "SUPER_ADMIN"],
  admin: ["ADMIN", "SUPER_ADMIN"]
};

export function canAccessArea(area: keyof typeof permissionMatrix, roleCode: UserRoleCode) {
  return permissionMatrix[area].includes(roleCode);
}
