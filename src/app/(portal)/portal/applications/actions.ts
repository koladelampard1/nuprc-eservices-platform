"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { persistApplication } from "@/lib/portal-application";

export async function saveDraftAction(
  context: { serviceCode: string; applicationId?: string },
  formData: FormData
) {
  const applicationId = await persistApplication({
    mode: "draft",
    serviceCode: context.serviceCode,
    applicationId: context.applicationId,
    formData
  });

  revalidatePath("/portal/applications");
  redirect(`/portal/applications/${applicationId}?saved=draft`);
}

export async function submitApplicationAction(
  context: { serviceCode: string; applicationId?: string },
  formData: FormData
) {
  const applicationId = await persistApplication({
    mode: "submit",
    serviceCode: context.serviceCode,
    applicationId: context.applicationId,
    formData
  });

  revalidatePath("/portal/applications");
  redirect(`/portal/applications/${applicationId}?submitted=true`);
}
