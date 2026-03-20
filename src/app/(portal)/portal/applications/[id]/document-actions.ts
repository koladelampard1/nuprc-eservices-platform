"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { saveApplicationDocument } from "@/lib/application-document";
import { requirePortalUser } from "@/lib/portal-application";
import { prisma } from "@/lib/prisma";

export async function uploadApplicationDocumentAction(
  context: { applicationId: string; requirementId: string },
  formData: FormData
) {
  const user = await requirePortalUser();

  const application = await prisma.application.findFirst({
    where: {
      id: context.applicationId,
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
      }
    }
  });

  if (!application) {
    redirect(`/portal/applications/${context.applicationId}?uploadError=${encodeURIComponent("Application was not found for your account.")}`);
  }

  if (application.state !== "DRAFT") {
    redirect(`/portal/applications/${context.applicationId}?uploadError=${encodeURIComponent("Documents can only be uploaded while application is in draft state.")}`);
  }

  const isAllowedRequirement = application.serviceType.documentRequirements.some(
    (requirement) => requirement.id === context.requirementId
  );

  if (!isAllowedRequirement) {
    redirect(`/portal/applications/${context.applicationId}?uploadError=${encodeURIComponent("Invalid document requirement selected.")}`);
  }

  const file = formData.get("document");

  if (!(file instanceof File)) {
    redirect(`/portal/applications/${context.applicationId}?uploadError=${encodeURIComponent("Please select a file to upload.")}`);
  }

  try {
    await saveApplicationDocument({
      applicationId: context.applicationId,
      requirementId: context.requirementId,
      uploadedByUserId: user.id,
      file
    });

    revalidatePath(`/portal/applications/${context.applicationId}`);
    revalidatePath(`/portal/applications/${context.applicationId}/edit`);
    redirect(`/portal/applications/${context.applicationId}?uploaded=true`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload document right now.";
    redirect(`/portal/applications/${context.applicationId}?uploadError=${encodeURIComponent(message)}`);
  }
}
