"use server";

import { ApplicationState, DecisionType, ReviewActionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { generateDecisionLetterReference } from "@/lib/letters";
import { ensureDirector, requireWorkspaceUser } from "@/lib/workspace-review";

const actionableStates: ApplicationState[] = ["SUBMITTED", "IN_REVIEW", "CLARIFICATION_REQUIRED"];



function resolveDecisionType(actionType: Exclude<ReviewActionType, "ASSIGNED">): DecisionType | null {
  if (actionType === "FINAL_APPROVAL") return "APPROVAL";
  if (actionType === "FINAL_REJECTION") return "REJECTION";
  return null;
}

const reviewerActionConfig = {
  COMMENTED: { toState: null, successMessage: "Comment added successfully." },
  RETURNED_FOR_CLARIFICATION: {
    toState: "CLARIFICATION_REQUIRED",
    successMessage: "Clarification has been requested from the applicant."
  },
  RECOMMENDED_APPROVAL: { toState: "IN_REVIEW", successMessage: "Application marked as recommended for approval." },
  RECOMMENDED_REJECTION: { toState: "IN_REVIEW", successMessage: "Application marked as recommended for rejection." },
  FINAL_APPROVAL: { toState: "APPROVED", successMessage: "Application approved." },
  FINAL_REJECTION: { toState: "REJECTED", successMessage: "Application rejected." }
} satisfies Record<
  Exclude<ReviewActionType, "ASSIGNED">,
  { toState: ApplicationState | null; successMessage: string }
>;

async function executeReviewAction(applicationId: string, actionType: Exclude<ReviewActionType, "ASSIGNED">, note: string | null) {
  const user = await requireWorkspaceUser();

  if (actionType === "FINAL_APPROVAL" || actionType === "FINAL_REJECTION") {
    ensureDirector(user.roleCode);
  }

  const config = reviewerActionConfig[actionType];

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, state: true }
  });

  if (!application || !actionableStates.includes(application.state)) {
    redirect(`/workspace/queue/${applicationId}?error=${encodeURIComponent("Application is not available for review action.")}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.reviewAction.create({
      data: {
        applicationId,
        reviewerId: user.id,
        actionType,
        note
      }
    });

    if (config.toState && config.toState !== application.state) {
      await tx.application.update({
        where: { id: applicationId },
        data: { state: config.toState }
      });

      await tx.workflowTransition.create({
        data: {
          applicationId,
          actorId: user.id,
          fromState: application.state,
          toState: config.toState,
          comment: note
        }
      });
    }

    const decisionType = resolveDecisionType(actionType);

    if (decisionType) {
      const now = new Date();
      const existingLetter = await tx.decisionLetter.findFirst({
        where: {
          applicationId,
          decisionType
        },
        select: { id: true }
      });

      const summary = note ||
        (decisionType === "APPROVAL"
          ? "Application has met applicable requirements and is hereby approved."
          : "Application is rejected based on final review outcome.");

      if (existingLetter) {
        await tx.decisionLetter.update({
          where: { id: existingLetter.id },
          data: {
            summary,
            issuedAt: now,
            issuedById: user.id
          }
        });
      } else {
        const letterRef = await generateDecisionLetterReference(tx, now);
        await tx.decisionLetter.create({
          data: {
            applicationId,
            issuedById: user.id,
            decisionType,
            letterRef,
            summary,
            issuedAt: now
          }
        });
      }
    }
  });

  revalidatePath("/workspace/queue");
  revalidatePath(`/workspace/queue/${applicationId}`);
  revalidatePath(`/portal/applications/${applicationId}`);

  redirect(`/workspace/queue/${applicationId}?success=${encodeURIComponent(config.successMessage)}`);
}

export async function addCommentAction(applicationId: string, formData: FormData) {
  const note = String(formData.get("note") || "").trim();

  if (!note) {
    redirect(`/workspace/queue/${applicationId}?error=${encodeURIComponent("Comment cannot be empty.")}`);
  }

  await executeReviewAction(applicationId, "COMMENTED", note);
}

export async function requestClarificationAction(applicationId: string, formData: FormData) {
  const note = String(formData.get("note") || "").trim();

  if (!note) {
    redirect(`/workspace/queue/${applicationId}?error=${encodeURIComponent("Clarification message is required.")}`);
  }

  const user = await requireWorkspaceUser();
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, state: true }
  });

  if (!application || !actionableStates.includes(application.state)) {
    redirect(`/workspace/queue/${applicationId}?error=${encodeURIComponent("Application is not available for review action.")}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.reviewAction.create({
      data: {
        applicationId,
        reviewerId: user.id,
        actionType: "RETURNED_FOR_CLARIFICATION",
        note
      }
    });

    await tx.clarificationRequest.create({
      data: {
        applicationId,
        requestedById: user.id,
        message: note
      }
    });

    if (application.state !== "CLARIFICATION_REQUIRED") {
      await tx.application.update({
        where: { id: applicationId },
        data: { state: "CLARIFICATION_REQUIRED" }
      });

      await tx.workflowTransition.create({
        data: {
          applicationId,
          actorId: user.id,
          fromState: application.state,
          toState: "CLARIFICATION_REQUIRED",
          comment: note
        }
      });
    }
  });

  revalidatePath("/workspace/queue");
  revalidatePath(`/workspace/queue/${applicationId}`);
  revalidatePath(`/portal/applications/${applicationId}`);

  redirect(`/workspace/queue/${applicationId}?success=${encodeURIComponent("Clarification has been requested from the applicant.")}`);
}

export async function recommendApprovalAction(applicationId: string, formData: FormData) {
  const note = String(formData.get("note") || "").trim();
  await executeReviewAction(applicationId, "RECOMMENDED_APPROVAL", note || null);
}

export async function recommendRejectionAction(applicationId: string, formData: FormData) {
  const note = String(formData.get("note") || "").trim();

  if (!note) {
    redirect(`/workspace/queue/${applicationId}?error=${encodeURIComponent("Rejection recommendation must include a comment.")}`);
  }

  await executeReviewAction(applicationId, "RECOMMENDED_REJECTION", note);
}

export async function finalApprovalAction(applicationId: string, formData: FormData) {
  const note = String(formData.get("note") || "").trim();
  await executeReviewAction(applicationId, "FINAL_APPROVAL", note || null);
}

export async function finalRejectionAction(applicationId: string, formData: FormData) {
  const note = String(formData.get("note") || "").trim();

  if (!note) {
    redirect(`/workspace/queue/${applicationId}?error=${encodeURIComponent("Final rejection must include a comment.")}`);
  }

  await executeReviewAction(applicationId, "FINAL_REJECTION", note);
}
