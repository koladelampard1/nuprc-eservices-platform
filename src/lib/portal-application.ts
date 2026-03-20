import { ApplicationState, Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { getMissingRequiredDocuments } from "@/lib/application-document";
import { canAccessArea } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export type ServiceField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "date";
  required: boolean;
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

export function getServiceFields(serviceCode: string) {
  return SERVICE_FORM_CONFIG[serviceCode] ?? [];
}

export function normalizeServiceFormValues(serviceCode: string, formData: FormData) {
  const fields = getServiceFields(serviceCode);
  return fields.map((field) => ({
    ...field,
    value: String(formData.get(field.key) ?? "").trim()
  }));
}

export function validateRequiredServiceFields(serviceCode: string, formData: FormData) {
  const values = normalizeServiceFormValues(serviceCode, formData);
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
  const serviceType = await prisma.serviceType.findUnique({ where: { code: params.serviceCode } });

  if (!serviceType) {
    throw new Error("Selected service type was not found.");
  }

  const values =
    params.mode === "submit"
      ? validateRequiredServiceFields(serviceType.code, params.formData)
      : normalizeServiceFormValues(serviceType.code, params.formData);

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

    await prisma.application.update({
      where: { id: applicationId },
      data: {
        state: ApplicationState.SUBMITTED,
        submittedAt: new Date(),
        currentStep: "Submitted"
      }
    });
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
        select: { id: true }
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

  await prisma.application.update({
    where: { id: application.id },
    data: {
      state: ApplicationState.SUBMITTED,
      submittedAt: new Date(),
      currentStep: "Submitted"
    }
  });
}
