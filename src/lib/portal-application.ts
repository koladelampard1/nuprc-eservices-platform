import { ApplicationState, PaymentStatus, Prisma, ServiceFormFieldType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { getMissingRequiredDocuments } from "@/lib/application-document";
import { createEmailSimulationLogs, createNotifications, getUsersByRoleCodes } from "@/lib/engagement";
import { canAccessArea } from "@/lib/permissions";
import { isPaymentRequired } from "@/lib/payment";
import { prisma } from "@/lib/prisma";

export type ServiceField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "number" | "select";
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
};

export const SERVICE_FORM_CONFIG: Record<string, ServiceField[]> = {
  LTO: [
    { key: "operationalArea", label: "Operational Area", type: "text", required: true },
    { key: "contactPerson", label: "Contact Person", type: "text", required: true },
    { key: "contactPhone", label: "Contact Phone", type: "text", required: true },
    { key: "justification", label: "Justification", type: "textarea", required: true },
    { key: "expectedStartDate", label: "Expected Start Date", type: "date", required: true }
  ],
  EP: [
    { key: "projectSite", label: "Project Site", type: "text", required: true },
    { key: "environmentalSummary", label: "Environmental Summary", type: "textarea", required: true },
    { key: "contactPerson", label: "Contact Person", type: "text", required: true },
    { key: "complianceNotes", label: "Compliance Notes", type: "textarea", required: true }
  ],
  FAR: [
    { key: "assetName", label: "Asset Name", type: "text", required: true },
    { key: "activityType", label: "Activity Type", type: "text", required: true },
    { key: "reportingPeriod", label: "Reporting Period", type: "text", required: true },
    { key: "technicalSummary", label: "Technical Summary", type: "textarea", required: true }
  ]
};

const FIELD_TYPE_MAP: Record<ServiceFormFieldType, ServiceField["type"]> = {
  TEXT: "text",
  TEXTAREA: "textarea",
  DATE: "date",
  NUMBER: "number",
  SELECT: "select"
};

export class SubmissionBlockedError extends Error {
  applicationId: string;

  constructor(message: string, applicationId: string) {
    super(message);
    this.name = "SubmissionBlockedError";
    this.applicationId = applicationId;
  }
}

export async function requirePortalUser() {
  const session = await auth();

  if (!session?.user?.id || !session.user.roleCode || !session.user.companyId) {
    throw new Error("You must be signed in with a portal account.");
  }

  if (!canAccessArea("portal", session.user.roleCode)) {
    throw new Error("You are not allowed to use portal application routes.");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { company: true, role: true }
  });

  if (!user || !user.company) {
    throw new Error("Portal account company context is missing.");
  }

  return user;
}

function parseSelectOptions(raw?: string | null) {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function getServiceFields(serviceCode: string) {
  const service = await prisma.serviceType.findUnique({
    where: { code: serviceCode.toUpperCase() },
    select: {
      code: true,
      isActive: true,
      formFields: {
        orderBy: [{ sortOrder: "asc" }, { fieldLabel: "asc" }]
      }
    }
  });

  if (!service || !service.isActive) {
    return [];
  }

  if (service.formFields.length > 0) {
    return service.formFields.map((field) => ({
      key: field.fieldKey,
      label: field.fieldLabel,
      type: FIELD_TYPE_MAP[field.fieldType],
      required: field.isRequired,
      placeholder: field.placeholder ?? undefined,
      helpText: field.helpText ?? undefined,
      options: parseSelectOptions(field.selectOptions)
    }));
  }

  return SERVICE_FORM_CONFIG[service.code] ?? [];
}

export async function normalizeServiceFormValues(serviceCode: string, formData: FormData) {
  const fields = await getServiceFields(serviceCode);
  return fields.map((field) => ({
    ...field,
    value: String(formData.get(field.key) ?? "").trim()
  }));
}

export async function validateRequiredServiceFields(serviceCode: string, formData: FormData) {
  const values = await normalizeServiceFormValues(serviceCode, formData);
  const missing = values.filter((entry) => entry.required && !entry.value);

  if (missing.length) {
    throw new Error(`Please complete required fields: ${missing.map((entry) => entry.label).join(", ")}`);
  }

  return values;
}

async function generateReferenceNo(tx: Prisma.TransactionClient) {
  const latest = await tx.application.findFirst({
    orderBy: { createdAt: "desc" },
    select: { referenceNo: true }
  });

  const current = Number(latest?.referenceNo.match(/(\d+)$/)?.[1] ?? 1000);
  return `NUPRC-APP-${String(current + 1).padStart(4, "0")}`;
}

async function persistFormEntries(
  tx: Prisma.TransactionClient,
  applicationId: string,
  values: Array<{ key: string; label: string; value: string }>
) {
  await tx.applicationFormEntry.deleteMany({ where: { applicationId } });

  if (!values.length) {
    return;
  }

  await tx.applicationFormEntry.createMany({
    data: values.map((entry) => ({
      applicationId,
      fieldKey: entry.key,
      fieldLabel: entry.label,
      value: entry.value
    }))
  });
}

export async function persistApplication(params: {
  mode: "draft" | "submit";
  serviceCode: string;
  applicationId?: string;
  formData: FormData;
}) {
  const user = await requirePortalUser();
  const serviceType = await prisma.serviceType.findUnique({ where: { code: params.serviceCode.toUpperCase() } });

  if (!serviceType) {
    throw new Error("Selected service type was not found.");
  }

  if (!serviceType.isActive) {
    throw new Error("This service is currently unavailable for new applications.");
  }

  const values =
    params.mode === "submit"
      ? await validateRequiredServiceFields(serviceType.code, params.formData)
      : await normalizeServiceFormValues(serviceType.code, params.formData);

  const applicationId = await prisma.$transaction(async (tx) => {
    let currentApplicationId = params.applicationId;

    if (currentApplicationId) {
      const existing = await tx.application.findFirst({
        where: {
          id: currentApplicationId,
          companyId: user.companyId ?? ""
        }
      });

      if (!existing) {
        throw new Error("Application was not found for your account.");
      }

      if (existing.state !== ApplicationState.DRAFT) {
        throw new Error("Only draft applications can be edited.");
      }
    } else {
      const referenceNo = await generateReferenceNo(tx);
      const created = await tx.application.create({
        data: {
          referenceNo,
          companyId: user.companyId ?? "",
          serviceTypeId: serviceType.id,
          submittedById: user.id,
          state: ApplicationState.DRAFT,
          submittedAt: null,
          currentStep: "Draft"
        }
      });
      currentApplicationId = created.id;
    }

    await persistFormEntries(tx, currentApplicationId, values);

    if (params.mode === "draft") {
      await tx.application.update({
        where: { id: currentApplicationId },
        data: {
          state: ApplicationState.DRAFT,
          submittedAt: null,
          currentStep: "Draft"
        }
      });
    }

    return currentApplicationId;
  });

  if (params.mode === "submit") {
    const missingRequiredDocuments = await prisma.$transaction((tx) =>
      getMissingRequiredDocuments(tx, applicationId, serviceType.id)
    );

    if (missingRequiredDocuments.length) {
      throw new SubmissionBlockedError(
        `Missing required documents: ${missingRequiredDocuments.join(", ")}`,
        applicationId
      );
    }

    if (isPaymentRequired(serviceType.baseFeeNgn)) {
      const latestPaymentReference = await prisma.paymentReference.findFirst({
        where: { applicationId },
        orderBy: { referenceNo: "desc" },
        select: { status: true }
      });

      if (!latestPaymentReference || latestPaymentReference.status !== PaymentStatus.PAID) {
        throw new SubmissionBlockedError(
          "Payment is required before final submission. Generate a payment reference and complete the demo payment step.",
          applicationId
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      const submitted = await tx.application.update({
        where: { id: applicationId },
        data: {
          state: ApplicationState.SUBMITTED,
          submittedAt: new Date(),
          currentStep: "Submitted"
        },
        select: {
          id: true,
          referenceNo: true,
          submittedById: true
        }
      });

      const workspaceUsers = await getUsersByRoleCodes(tx, ["REVIEW_OFFICER", "DIRECTOR"]);

      await createNotifications(tx, [
        {
          userId: submitted.submittedById,
          applicationId: submitted.id,
          type: "APPLICATION_UPDATE",
          title: "Application Submitted",
          message: `Your application ${submitted.referenceNo} was submitted successfully.`
        },
        {
          userId: submitted.submittedById,
          applicationId: submitted.id,
          type: "SYSTEM",
          title: "Acknowledgement Available",
          message: `Acknowledgement letter is now available for ${submitted.referenceNo}.`
        },
        ...workspaceUsers.map((workspaceUser) => ({
          userId: workspaceUser.id,
          applicationId: submitted.id,
          type: "APPLICATION_UPDATE" as const,
          title: "New Application in Review Queue",
          message: `Application ${submitted.referenceNo} has been submitted for review.`
        }))
      ]);

      await createEmailSimulationLogs(tx, [
        {
          applicationId: submitted.id,
          recipient: user.email,
          subject: `Submission received: ${submitted.referenceNo}`,
          bodyPreview: "Your application submission has been received. An acknowledgement is now available in the portal.",
          eventType: "APPLICATION_SUBMITTED"
        },
        {
          applicationId: submitted.id,
          recipient: user.email,
          subject: `Acknowledgement available: ${submitted.referenceNo}`,
          bodyPreview: "You can now open the acknowledgement letter for your submitted application from the application detail page.",
          eventType: "ACKNOWLEDGEMENT_AVAILABLE"
        },
        ...workspaceUsers.map((workspaceUser) => ({
          applicationId: submitted.id,
          recipient: workspaceUser.email,
          subject: `New review item: ${submitted.referenceNo}`,
          bodyPreview: `A new application has entered the review queue and is ready for workspace assessment.`,
          eventType: "REVIEW_QUEUE_NEW_SUBMISSION"
        }))
      ]);
    });

    revalidatePath("/portal", "layout");
    revalidatePath("/workspace", "layout");
  }

  return applicationId;
}

export async function submitDraftApplication(applicationId: string) {
  const user = await requirePortalUser();

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      companyId: user.companyId ?? ""
    },
    include: {
      serviceType: {
        select: { id: true, baseFeeNgn: true }
      }
    }
  });

  if (!application) {
    throw new Error("Application was not found for your account.");
  }

  if (application.state !== ApplicationState.DRAFT) {
    throw new Error("Only draft applications can be submitted.");
  }

  const missingRequiredDocuments = await prisma.$transaction((tx) =>
    getMissingRequiredDocuments(tx, application.id, application.serviceType.id)
  );

  if (missingRequiredDocuments.length) {
    throw new SubmissionBlockedError(
      `Missing required documents: ${missingRequiredDocuments.join(", ")}`,
      application.id
    );
  }

  if (isPaymentRequired(application.serviceType.baseFeeNgn)) {
    const latestPaymentReference = await prisma.paymentReference.findFirst({
      where: { applicationId: application.id },
      orderBy: { referenceNo: "desc" },
      select: { status: true }
    });

    if (!latestPaymentReference || latestPaymentReference.status !== PaymentStatus.PAID) {
      throw new SubmissionBlockedError(
        "Payment is required before final submission. Generate a payment reference and complete the demo payment step.",
        application.id
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    const submitted = await tx.application.update({
      where: { id: application.id },
      data: {
        state: ApplicationState.SUBMITTED,
        submittedAt: new Date(),
        currentStep: "Submitted"
      },
      select: {
        id: true,
        referenceNo: true,
        submittedById: true
      }
    });

    const workspaceUsers = await getUsersByRoleCodes(tx, ["REVIEW_OFFICER", "DIRECTOR"]);

    await createNotifications(tx, [
      {
        userId: submitted.submittedById,
        applicationId: submitted.id,
        type: "APPLICATION_UPDATE",
        title: "Application Submitted",
        message: `Your application ${submitted.referenceNo} was submitted successfully.`
      },
      {
        userId: submitted.submittedById,
        applicationId: submitted.id,
        type: "SYSTEM",
        title: "Acknowledgement Available",
        message: `Acknowledgement letter is now available for ${submitted.referenceNo}.`
      },
      ...workspaceUsers.map((workspaceUser) => ({
        userId: workspaceUser.id,
        applicationId: submitted.id,
        type: "APPLICATION_UPDATE" as const,
        title: "New Application in Review Queue",
        message: `Application ${submitted.referenceNo} has been submitted for review.`
      }))
    ]);

    await createEmailSimulationLogs(tx, [
      {
        applicationId: submitted.id,
        recipient: user.email,
        subject: `Submission received: ${submitted.referenceNo}`,
        bodyPreview: "Your application submission has been received. An acknowledgement is now available in the portal.",
        eventType: "APPLICATION_SUBMITTED"
      },
      {
        applicationId: submitted.id,
        recipient: user.email,
        subject: `Acknowledgement available: ${submitted.referenceNo}`,
        bodyPreview: "You can now open the acknowledgement letter for your submitted application from the application detail page.",
        eventType: "ACKNOWLEDGEMENT_AVAILABLE"
      },
      ...workspaceUsers.map((workspaceUser) => ({
        applicationId: submitted.id,
        recipient: workspaceUser.email,
        subject: `New review item: ${submitted.referenceNo}`,
        bodyPreview: "A new application has entered the review queue and is ready for workspace assessment.",
        eventType: "REVIEW_QUEUE_NEW_SUBMISSION"
      }))
    ]);
  });

  revalidatePath("/portal", "layout");
  revalidatePath("/workspace", "layout");
}
