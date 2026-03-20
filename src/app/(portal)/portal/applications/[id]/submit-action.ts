"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { SubmissionBlockedError, submitDraftApplication } from "@/lib/portal-application";

export async function submitDraftFromDetailAction(applicationId: string) {
  try {
    await submitDraftApplication(applicationId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit application right now.";
    const encodedMessage = encodeURIComponent(message);

    if (error instanceof SubmissionBlockedError) {
      redirect(`/portal/applications/${error.applicationId}?submitError=${encodedMessage}`);
    }

    redirect(`/portal/applications/${applicationId}?submitError=${encodedMessage}`);
  }

  revalidatePath("/portal/applications");
  revalidatePath(`/portal/applications/${applicationId}`);
  redirect(`/portal/applications/${applicationId}?submitted=true`);
}
