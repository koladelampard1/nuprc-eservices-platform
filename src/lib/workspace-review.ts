import { ApplicationState, ReviewActionType, type UserRoleCode } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

const WORKSPACE_ROLES: UserRoleCode[] = ["REVIEW_OFFICER", "DIRECTOR"];

export const stateToneMap: Record<ApplicationState, "default" | "success" | "warning" | "danger" | "info"> = {
  DRAFT: "default",
  SUBMITTED: "info",
  IN_REVIEW: "info",
  CLARIFICATION_REQUIRED: "warning",
  APPROVED: "success",
  REJECTED: "danger"
};

export const actionLabelMap: Record<ReviewActionType, string> = {
  ASSIGNED: "Assigned",
  COMMENTED: "Comment Added",
  RETURNED_FOR_CLARIFICATION: "Clarification Requested",
  RECOMMENDED_APPROVAL: "Recommended Approval",
  RECOMMENDED_REJECTION: "Recommended Rejection",
  FINAL_APPROVAL: "Final Approval",
  FINAL_REJECTION: "Final Rejection"
};

export async function requireWorkspaceUser() {
  const session = await auth();
  const roleCode = session?.user?.roleCode as UserRoleCode | undefined;

  if (!session?.user?.id || !roleCode || !WORKSPACE_ROLES.includes(roleCode)) {
    redirect("/login");
  }

  return {
    id: session.user.id,
    roleCode
  };
}

export function ensureDirector(roleCode: UserRoleCode) {
  if (roleCode !== "DIRECTOR") {
    throw new Error("Only directors can perform final approval or rejection.");
  }
}

export function canTransitionToFinalState(roleCode: UserRoleCode) {
  return roleCode === "DIRECTOR";
}
