"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { persistApplication, SubmissionBlockedError } from "@/lib/portal-application";

export async function saveDraftAction(
  context: { serviceCode: string; applicationId?: string },
  formData: FormData
) {
  let applicationId: string;

  try {
    applicationId = await persistApplication({
      mode: "draft",
      serviceCode: context.serviceCode,
      applicationId: context.applicationId,
      formData
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save draft right now.";
    const encodedMessage = encodeURIComponent(message);

    if (context.applicationId) {
      redirect(`/portal/applications/${context.applicationId}/edit?error=${encodedMessage}`);
    }

    redirect(`/portal/applications/new?serviceCode=${context.serviceCode}&error=${encodedMessage}`);
  }

  revalidatePath("/portal/applications");
  redirect(`/portal/applications/${applicationId}?saved=draft`);
}

export async function submitApplicationAction(
  context: { serviceCode: string; applicationId?: string },
  formData: FormData
) {
  let applicationId: string;

  try {
    applicationId = await persistApplication({
      mode: "submit",
      serviceCode: context.serviceCode,
      applicationId: context.applicationId,
      formData
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit application right now.";
    const encodedMessage = encodeURIComponent(message);

    if (error instanceof SubmissionBlockedError) {
      redirect(`/portal/applications/${error.applicationId}/edit?error=${encodedMessage}`);
    }

    if (context.applicationId) {
      redirect(`/portal/applications/${context.applicationId}/edit?error=${encodedMessage}`);
    }

    redirect(`/portal/applications/new?serviceCode=${context.serviceCode}&error=${encodedMessage}`);
  }

  revalidatePath("/portal/applications");
  redirect(`/portal/applications/${applicationId}?submitted=true`);
}
