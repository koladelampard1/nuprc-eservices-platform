"use server";

import { PaymentStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isPaymentRequired } from "@/lib/payment";
import { requirePortalUser } from "@/lib/portal-application";
import { prisma } from "@/lib/prisma";
import { isNextRedirectError } from "@/lib/server-action";

const PAYMENT_REFERENCE_MAX_ATTEMPTS = 5;

function buildPaymentReferenceNo(at: Date, attempt = 0) {
  const yyyy = at.getUTCFullYear();
  const mm = String(at.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(at.getUTCDate()).padStart(2, "0");
  const hh = String(at.getUTCHours()).padStart(2, "0");
  const min = String(at.getUTCMinutes()).padStart(2, "0");
  const ss = String(at.getUTCSeconds()).padStart(2, "0");
  const ms = String(at.getUTCMilliseconds()).padStart(3, "0");
  const suffix = String(attempt).padStart(2, "0");
  return `NUPRC-PAY-${yyyy}${mm}${dd}-${hh}${min}${ss}${ms}-${suffix}`;
}

function toLogPayload(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return { error };
}

function getUserFacingPaymentError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "A duplicate payment reference was detected. Please try again.";
    }

    if (error.code === "P2003") {
      return "Unable to link payment reference to this application.";
    }

    if (error.code === "P2022") {
      return "Payment reference data model is out of sync. Run Prisma generate/migrations and retry.";
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return "Invalid payment reference payload. Check required payment fields and amount format.";
  }

  return "Unable to generate payment reference.";
}

async function getOwnedApplication(applicationId: string) {
  const user = await requirePortalUser();

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      companyId: user.companyId ?? ""
    },
    include: {
      serviceType: {
        select: {
          baseFeeNgn: true
        }
      },
      paymentReferences: {
        orderBy: { referenceNo: "desc" }
      }
    }
  });

  if (!application) {
    throw new Error("Application was not found for your account.");
  }

  return application;
}

export async function generatePaymentReferenceAction(applicationId: string) {
  try {
    console.info("[payment-reference] start", { applicationId });
    const application = await getOwnedApplication(applicationId);
    console.info("[payment-reference] application-loaded", {
      applicationId,
      state: application.state,
      baseFeeNgn: application.serviceType.baseFeeNgn.toString(),
      existingReferenceCount: application.paymentReferences.length
    });
    const requiresPayment = isPaymentRequired(application.serviceType.baseFeeNgn);
    console.info("[payment-reference] payment-requirement-evaluated", { applicationId, requiresPayment });

    if (!requiresPayment) {
      redirect(`/portal/applications/${applicationId}?payError=${encodeURIComponent("This service does not require payment.")}`);
    }

    const existingReference = application.paymentReferences[0] ?? null;

    if (existingReference) {
      console.info("[payment-reference] existing-reference-blocked", {
        applicationId,
        referenceNo: existingReference.referenceNo
      });
      redirect(
        `/portal/applications/${applicationId}?payError=${encodeURIComponent(
          `A payment reference already exists (${existingReference.referenceNo}).`
        )}`
      );
    }

    let createdReferenceNo = "";

    for (let attempt = 0; attempt < PAYMENT_REFERENCE_MAX_ATTEMPTS; attempt += 1) {
      const now = new Date();
      const referenceNo = buildPaymentReferenceNo(now, attempt);

      console.info("[payment-reference] create-attempt", {
        applicationId,
        attempt,
        referenceNo,
        amountNgn: application.serviceType.baseFeeNgn.toString()
      });

      try {
        await prisma.paymentReference.create({
          data: {
            applicationId,
            referenceNo,
            amountNgn: application.serviceType.baseFeeNgn,
            status: PaymentStatus.PENDING
          }
        });

        createdReferenceNo = referenceNo;
        console.info("[payment-reference] create-success", { applicationId, referenceNo });
        break;
      } catch (createError) {
        if (createError instanceof Prisma.PrismaClientKnownRequestError && createError.code === "P2002") {
          console.warn("[payment-reference] duplicate-reference-collision", {
            applicationId,
            attempt,
            referenceNo
          });
          continue;
        }

        throw createError;
      }
    }

    if (!createdReferenceNo) {
      throw new Error("Failed to generate a unique payment reference after multiple attempts.");
    }
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    console.error("[payment-reference] generate-failed", {
      applicationId,
      ...toLogPayload(error)
    });

    redirect(`/portal/applications/${applicationId}?payError=${encodeURIComponent(getUserFacingPaymentError(error))}`);
  }

  revalidatePath(`/portal/applications/${applicationId}`);
  revalidatePath("/workspace/queue");
  redirect(`/portal/applications/${applicationId}?paymentGenerated=true`);
}

export async function markPaymentStatusAction(applicationId: string, nextStatus: "PAID" | "FAILED") {
  try {
    const application = await getOwnedApplication(applicationId);
    const requiresPayment = isPaymentRequired(application.serviceType.baseFeeNgn);

    if (!requiresPayment) {
      redirect(`/portal/applications/${applicationId}?payError=${encodeURIComponent("This service does not require payment.")}`);
    }

    const latest = application.paymentReferences[0];

    if (!latest) {
      redirect(`/portal/applications/${applicationId}?payError=${encodeURIComponent("Generate a payment reference first.")}`);
    }

    if (nextStatus === "PAID") {
      await prisma.paymentReference.update({
        where: { id: latest.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date()
        }
      });
    } else {
      await prisma.paymentReference.update({
        where: { id: latest.id },
        data: {
          status: PaymentStatus.FAILED,
          paidAt: null
        }
      });
    }
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    redirect(`/portal/applications/${applicationId}?payError=${encodeURIComponent("Unable to update payment status.")}`);
  }

  revalidatePath(`/portal/applications/${applicationId}`);
  revalidatePath("/workspace/queue");
  redirect(
    `/portal/applications/${applicationId}?${nextStatus === "PAID" ? "paymentPaid=true" : "paymentFailed=true"}`
  );
}
