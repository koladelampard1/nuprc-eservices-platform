import type { UserRoleCode } from "@prisma/client";

export type ProtectedArea = "portal" | "workspace" | "admin";

export const permissionMatrix: Record<ProtectedArea, UserRoleCode[]> = {
  portal: ["EXTERNAL_OPERATOR", "COMPANY_ADMIN"],
  workspace: ["REVIEW_OFFICER", "DIRECTOR"],
  admin: ["ADMIN", "SUPER_ADMIN"]
};

export const roleHomeRoute: Record<UserRoleCode, string> = {
  EXTERNAL_OPERATOR: "/portal/dashboard",
  COMPANY_ADMIN: "/portal/dashboard",
  REVIEW_OFFICER: "/workspace/dashboard",
  DIRECTOR: "/workspace/dashboard",
  ADMIN: "/admin/dashboard",
  SUPER_ADMIN: "/admin/dashboard"
};

export function canAccessArea(area: ProtectedArea, roleCode: UserRoleCode | string) {
  return permissionMatrix[area].includes(roleCode as UserRoleCode);
}

export function getHomeRouteForRole(roleCode: UserRoleCode | string) {
  return roleHomeRoute[roleCode as UserRoleCode] ?? "/";
}
