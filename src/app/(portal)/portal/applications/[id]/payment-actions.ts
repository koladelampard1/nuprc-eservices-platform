"use server";

import { PaymentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isPaymentRequired } from "@/lib/payment";
import { requirePortalUser } from "@/lib/portal-application";
import { prisma } from "@/lib/prisma";
import { isNextRedirectError } from "@/lib/server-action";

function buildPaymentReferenceNo(serial: number, at: Date) {
  const yyyy = at.getUTCFullYear();
  const mm = String(at.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(at.getUTCDate()).padStart(2, "0");
  return `NUPRC-PAY-${yyyy}${mm}${dd}-${String(serial).padStart(4, "0")}`;
}

async function getNextPaymentSerial() {
  const latest = await prisma.paymentReference.findFirst({
    orderBy: { referenceNo: "desc" },
    select: { referenceNo: true }
  });
  const current = Number(latest?.referenceNo.match(/-(\d{4})$/)?.[1] ?? 0);
  return current + 1;
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
    const application = await getOwnedApplication(applicationId);
    const requiresPayment = isPaymentRequired(application.serviceType.baseFeeNgn);

    if (!requiresPayment) {
      redirect(`/portal/applications/${applicationId}?payError=${encodeURIComponent("This service does not require payment.")}`);
    }

    const existingReference = application.paymentReferences[0] ?? null;

    if (existingReference) {
      redirect(
        `/portal/applications/${applicationId}?payError=${encodeURIComponent(
          `A payment reference already exists (${existingReference.referenceNo}).`
        )}`
      );
    }

    const serial = await getNextPaymentSerial();
    const now = new Date();

    await prisma.paymentReference.create({
      data: {
        applicationId,
        referenceNo: buildPaymentReferenceNo(serial, now),
        amountNgn: application.serviceType.baseFeeNgn,
        status: PaymentStatus.PENDING
      }
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    redirect(`/portal/applications/${applicationId}?payError=${encodeURIComponent("Unable to generate payment reference.")}`);
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
