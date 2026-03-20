import { ApplicationState, Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
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

  return prisma.$transaction(async (tx) => {
    let applicationId = params.applicationId;

    if (applicationId) {
      const existing = await tx.application.findFirst({
        where: {
          id: applicationId,
          companyId: user.companyId ?? "",
          submittedById: user.id
        }
      });

      if (!existing) {
        throw new Error("Application was not found for your account.");
      }

      if (existing.state !== ApplicationState.DRAFT) {
        throw new Error("Only draft applications can be edited.");
      }

      await tx.application.update({
        where: { id: existing.id },
        data: {
          state: params.mode === "submit" ? ApplicationState.SUBMITTED : ApplicationState.DRAFT,
          submittedAt: params.mode === "submit" ? new Date() : null,
          currentStep: params.mode === "submit" ? "Submitted" : "Draft"
        }
      });
    } else {
      const referenceNo = await generateReferenceNo(tx);
      const created = await tx.application.create({
        data: {
          referenceNo,
          companyId: user.companyId ?? "",
          serviceTypeId: serviceType.id,
          submittedById: user.id,
          state: params.mode === "submit" ? ApplicationState.SUBMITTED : ApplicationState.DRAFT,
          submittedAt: params.mode === "submit" ? new Date() : null,
          currentStep: params.mode === "submit" ? "Submitted" : "Draft"
        }
      });
      applicationId = created.id;
    }

    await tx.applicationFormEntry.deleteMany({ where: { applicationId } });

    if (values.length) {
      await tx.applicationFormEntry.createMany({
        data: values.map((entry) => ({
          applicationId: applicationId!,
          fieldKey: entry.key,
          fieldLabel: entry.label,
          value: entry.value
        }))
      });
    }

    return applicationId!;
  });
}
