"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { persistApplication } from "@/lib/portal-application";

export async function saveDraftAction(
  context: { serviceCode: string; applicationId?: string },
  formData: FormData
) {
  try {
    const applicationId = await persistApplication({
      mode: "draft",
      serviceCode: context.serviceCode,
      applicationId: context.applicationId,
      formData
    });

    revalidatePath("/portal/applications");
    redirect(`/portal/applications/${applicationId}?saved=draft`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save draft right now.";
    const encodedMessage = encodeURIComponent(message);

    if (context.applicationId) {
      redirect(`/portal/applications/${context.applicationId}/edit?error=${encodedMessage}`);
    }

    redirect(`/portal/applications/new?serviceCode=${context.serviceCode}&error=${encodedMessage}`);
  }
}

export async function submitApplicationAction(
  context: { serviceCode: string; applicationId?: string },
  formData: FormData
) {
  try {
    const applicationId = await persistApplication({
      mode: "submit",
      serviceCode: context.serviceCode,
      applicationId: context.applicationId,
      formData
    });

    revalidatePath("/portal/applications");
    redirect(`/portal/applications/${applicationId}?submitted=true`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit application right now.";
    const encodedMessage = encodeURIComponent(message);

    if (context.applicationId) {
      redirect(`/portal/applications/${context.applicationId}/edit?error=${encodedMessage}`);
    }

    redirect(`/portal/applications/new?serviceCode=${context.serviceCode}&error=${encodedMessage}`);
  }
}
