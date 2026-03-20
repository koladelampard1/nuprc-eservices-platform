"use server";

import { ApplicationState, DecisionType, ReviewActionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createEmailSimulationLogs, createNotifications } from "@/lib/engagement";
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
    select: {
      id: true,
      state: true,
      referenceNo: true,
      submittedBy: {
        select: { id: true, email: true }
      }
    }
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

      await createNotifications(tx, [
        {
          userId: application.submittedBy.id,
          applicationId: application.id,
          type: "APPROVAL",
          title: decisionType === "APPROVAL" ? "Application Approved" : "Application Rejected",
          message:
            decisionType === "APPROVAL"
              ? `Your application ${application.referenceNo} has been approved.`
              : `Your application ${application.referenceNo} has been rejected.`
        },
        {
          userId: application.submittedBy.id,
          applicationId: application.id,
          type: "SYSTEM",
          title: "Decision Letter Available",
          message: `Decision letter is now available for ${application.referenceNo}.`
        }
      ]);

      await createEmailSimulationLogs(tx, [
        {
          applicationId: application.id,
          recipient: application.submittedBy.email,
          subject:
            decisionType === "APPROVAL"
              ? `Application approved: ${application.referenceNo}`
              : `Application rejected: ${application.referenceNo}`,
          bodyPreview:
            decisionType === "APPROVAL"
              ? "Your application has been approved. You can now view the approval decision letter."
              : "Your application has been rejected. You can now view the rejection decision letter.",
          eventType: decisionType === "APPROVAL" ? "FINAL_APPROVAL" : "FINAL_REJECTION"
        },
        {
          applicationId: application.id,
          recipient: application.submittedBy.email,
          subject: `Decision letter available: ${application.referenceNo}`,
          bodyPreview: "A decision letter is now available in your portal application details page.",
          eventType: "DECISION_LETTER_AVAILABLE"
        }
      ]);
    }

    if (actionType === "RECOMMENDED_APPROVAL" || actionType === "RECOMMENDED_REJECTION") {
      const directors = await tx.user.findMany({
        where: {
          isActive: true,
          role: { code: "DIRECTOR" }
        },
        select: { id: true, email: true }
      });

      await createNotifications(
        tx,
        directors.map((director) => ({
          userId: director.id,
          applicationId: application.id,
          type: "APPLICATION_UPDATE",
          title: "Application Ready for Final Decision",
          message: `${application.referenceNo} has a reviewer recommendation and is ready for director decision.`
        }))
      );

      await createEmailSimulationLogs(
        tx,
        directors.map((director) => ({
          applicationId: application.id,
          recipient: director.email,
          subject: `Final decision required: ${application.referenceNo}`,
          bodyPreview: "A reviewer recommendation has been recorded and awaits director final decision.",
          eventType: "FINAL_DECISION_READY"
        }))
      );
    }
  });

  revalidatePath("/workspace/queue");
  revalidatePath(`/workspace/queue/${applicationId}`);
  revalidatePath(`/portal/applications/${applicationId}`);
  revalidatePath("/portal", "layout");
  revalidatePath("/workspace", "layout");

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
    select: {
      id: true,
      state: true,
      referenceNo: true,
      submittedBy: {
        select: { id: true, email: true }
      }
    }
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

    await createNotifications(tx, [
      {
        userId: application.submittedBy.id,
        applicationId: application.id,
        type: "CLARIFICATION",
        title: "Clarification Requested",
        message: `A reviewer requested clarification for ${application.referenceNo}.`
      }
    ]);

    await createEmailSimulationLogs(tx, [
      {
        applicationId: application.id,
        recipient: application.submittedBy.email,
        subject: `Clarification requested: ${application.referenceNo}`,
        bodyPreview: "A reviewer requested clarification on your application. Open the portal to respond and upload updates if needed.",
        eventType: "CLARIFICATION_REQUESTED"
      }
    ]);
  });

  revalidatePath("/workspace/queue");
  revalidatePath(`/workspace/queue/${applicationId}`);
  revalidatePath(`/portal/applications/${applicationId}`);
  revalidatePath("/portal", "layout");
  revalidatePath("/workspace", "layout");

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
