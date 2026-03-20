"use server";

import { ApplicationState } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { saveApplicationDocument } from "@/lib/application-document";
import { createEmailSimulationLogs, createNotifications, getUsersByRoleCodes } from "@/lib/engagement";
import { requirePortalUser } from "@/lib/portal-application";
import { prisma } from "@/lib/prisma";
import { isNextRedirectError } from "@/lib/server-action";

export async function respondToClarificationAction(applicationId: string, formData: FormData) {
  const user = await requirePortalUser();
  const response = String(formData.get("response") ?? "").trim();
  const requirementId = String(formData.get("requirementId") ?? "").trim();
  const uploadedDocument = formData.get("document");

  if (!response) {
    redirect(`/portal/applications/${applicationId}?submitError=${encodeURIComponent("Clarification response is required.")}`);
  }

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      companyId: user.companyId ?? "",
      submittedById: user.id
    },
    include: {
      serviceType: {
        include: {
          documentRequirements: {
            where: { isRequired: true },
            select: { id: true }
          }
        }
      },
      clarificationRequests: {
        where: { respondedAt: null },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!application) {
    redirect(`/portal/applications/${applicationId}?submitError=${encodeURIComponent("Application was not found for your account.")}`);
  }

  if (application.state !== "CLARIFICATION_REQUIRED") {
    redirect(`/portal/applications/${applicationId}?submitError=${encodeURIComponent("Application is not awaiting clarification.")}`);
  }

  const pendingRequest = application.clarificationRequests[0];
  if (!pendingRequest) {
    redirect(`/portal/applications/${applicationId}?submitError=${encodeURIComponent("No open clarification request found.")}`);
  }

  if (uploadedDocument instanceof File && uploadedDocument.size > 0) {
    if (!requirementId) {
      redirect(`/portal/applications/${applicationId}?submitError=${encodeURIComponent("Select a document requirement for the uploaded file.")}`);
    }

    const isAllowedRequirement = application.serviceType.documentRequirements.some(
      (requirement) => requirement.id === requirementId
    );

    if (!isAllowedRequirement) {
      redirect(`/portal/applications/${applicationId}?submitError=${encodeURIComponent("Invalid document requirement selected.")}`);
    }

    try {
      await saveApplicationDocument({
        applicationId: application.id,
        requirementId,
        uploadedByUserId: user.id,
        file: uploadedDocument
      });
    } catch (error) {
      if (isNextRedirectError(error)) {
        throw error;
      }

      const message = error instanceof Error ? error.message : "Unable to upload document right now.";
      redirect(`/portal/applications/${applicationId}?submitError=${encodeURIComponent(message)}`);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.clarificationRequest.update({
      where: { id: pendingRequest.id },
      data: {
        response,
        respondedAt: new Date()
      }
    });

    const nextState: ApplicationState = application.assignedToId ? "IN_REVIEW" : "SUBMITTED";
    await tx.application.update({
      where: { id: application.id },
      data: { state: nextState }
    });

    await tx.workflowTransition.create({
      data: {
        applicationId: application.id,
        actorId: user.id,
        fromState: "CLARIFICATION_REQUIRED",
        toState: nextState,
        comment: response
      }
    });

    const workspaceUsers = await getUsersByRoleCodes(tx, ["REVIEW_OFFICER", "DIRECTOR"]);
    const directorUsers = await getUsersByRoleCodes(tx, ["DIRECTOR"]);

    await createNotifications(tx, [
      {
        userId: user.id,
        applicationId: application.id,
        type: "CLARIFICATION",
        title: "Clarification Response Received",
        message: `Your clarification response has been received for ${application.referenceNo}. Review has resumed.`
      },
      ...workspaceUsers.map((workspaceUser) => ({
        userId: workspaceUser.id,
        applicationId: application.id,
        type: "CLARIFICATION" as const,
        title: "Clarification Response Submitted",
        message: `Operator response has been submitted for ${application.referenceNo}.`
      })),
      ...directorUsers.map((directorUser) => ({
        userId: directorUser.id,
        applicationId: application.id,
        type: "APPLICATION_UPDATE" as const,
        title: "Application Ready for Further Review",
        message: `${application.referenceNo} is ready for additional review progression.`
      }))
    ]);

    await createEmailSimulationLogs(tx, [
      {
        applicationId: application.id,
        recipient: user.email,
        subject: `Clarification received: ${application.referenceNo}`,
        bodyPreview: "Your clarification response has been logged and the application has resumed review.",
        eventType: "CLARIFICATION_RESPONSE_RECEIVED"
      },
      ...workspaceUsers.map((workspaceUser) => ({
        applicationId: application.id,
        recipient: workspaceUser.email,
        subject: `Clarification response submitted: ${application.referenceNo}`,
        bodyPreview: "An operator has responded to a clarification request. Please continue the review process.",
        eventType: "CLARIFICATION_RESPONSE_SUBMITTED"
      }))
    ]);
  });

  revalidatePath(`/portal/applications/${applicationId}`);
  revalidatePath(`/workspace/queue/${applicationId}`);
  revalidatePath("/workspace/queue");
  revalidatePath("/portal", "layout");
  revalidatePath("/workspace", "layout");

  redirect(`/portal/applications/${applicationId}?clarificationResponded=true`);
}
