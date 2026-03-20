"use server";

import { ApplicationState } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { saveApplicationDocument } from "@/lib/application-document";
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
  });

  revalidatePath(`/portal/applications/${applicationId}`);
  revalidatePath(`/workspace/queue/${applicationId}`);
  revalidatePath("/workspace/queue");

  redirect(`/portal/applications/${applicationId}?clarificationResponded=true`);
}
