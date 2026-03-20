"use server";

import { Prisma, ServiceFormFieldType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminAuditLog, requireAdminUser } from "@/lib/admin-console";
import { prisma } from "@/lib/prisma";

function toNumber(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function asText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

const FIELD_TYPE_VALUES: ServiceFormFieldType[] = ["TEXT", "TEXTAREA", "DATE", "NUMBER", "SELECT"];

export async function createServiceTypeAction(formData: FormData) {
  const actor = await requireAdminUser();

  const code = asText(formData.get("code")).toUpperCase();
  const name = asText(formData.get("name"));
  const description = asText(formData.get("description"));
  const paymentRequired = formData.get("paymentRequired") === "on";
  const baseFeeValue = toNumber(formData.get("baseFeeNgn"));

  if (!code || !name || !description) {
    redirect("/admin/services?error=Please+provide+code%2C+name%2C+and+description.");
  }

  if (paymentRequired && (!Number.isFinite(baseFeeValue) || baseFeeValue <= 0)) {
    redirect("/admin/services?error=Base+fee+must+be+greater+than+0+when+payment+is+required.");
  }

  const baseFeeNgn = paymentRequired ? new Prisma.Decimal(baseFeeValue.toFixed(2)) : new Prisma.Decimal(0);

  try {
    const created = await prisma.serviceType.create({
      data: {
        code,
        name,
        description,
        baseFeeNgn,
        isActive: true
      }
    });

    await createAdminAuditLog({
      actorId: actor.id,
      action: "SERVICE_TYPE_CREATED",
      entityType: "SERVICE_TYPE",
      entityId: created.id,
      metadata: { code: created.code }
    });
  } catch {
    redirect("/admin/services?error=Unable+to+create+service+type.+Code+must+be+unique.");
  }

  revalidatePath("/admin/services");
  revalidatePath("/portal/services");
  redirect("/admin/services?success=Service+type+created.");
}

export async function updateServiceTypeAction(formData: FormData) {
  const actor = await requireAdminUser();
  const serviceTypeId = asText(formData.get("serviceTypeId"));
  const code = asText(formData.get("code")).toUpperCase();
  const name = asText(formData.get("name"));
  const description = asText(formData.get("description"));
  const paymentRequired = formData.get("paymentRequired") === "on";
  const baseFeeValue = toNumber(formData.get("baseFeeNgn"));

  if (!serviceTypeId || !code || !name || !description) {
    redirect("/admin/services?error=Missing+required+service+type+fields.");
  }

  if (paymentRequired && (!Number.isFinite(baseFeeValue) || baseFeeValue <= 0)) {
    redirect(`/admin/services?service=${serviceTypeId}&error=Base+fee+must+be+greater+than+0+when+payment+is+required.`);
  }

  const baseFeeNgn = paymentRequired ? new Prisma.Decimal(baseFeeValue.toFixed(2)) : new Prisma.Decimal(0);

  try {
    await prisma.serviceType.update({
      where: { id: serviceTypeId },
      data: { code, name, description, baseFeeNgn }
    });

    await createAdminAuditLog({
      actorId: actor.id,
      action: "SERVICE_TYPE_UPDATED",
      entityType: "SERVICE_TYPE",
      entityId: serviceTypeId,
      metadata: { code }
    });
  } catch {
    redirect(`/admin/services?service=${serviceTypeId}&error=Unable+to+update+service+type.`);
  }

  revalidatePath("/admin/services");
  revalidatePath("/portal/services");
  redirect(`/admin/services?service=${serviceTypeId}&success=Service+type+updated.`);
}

export async function toggleServiceTypeActiveAction(formData: FormData) {
  const actor = await requireAdminUser();
  const serviceTypeId = asText(formData.get("serviceTypeId"));

  if (!serviceTypeId) {
    redirect("/admin/services?error=Missing+service+type+identifier.");
  }

  const serviceType = await prisma.serviceType.findUnique({ where: { id: serviceTypeId } });

  if (!serviceType) {
    redirect("/admin/services?error=Service+type+not+found.");
  }

  await prisma.serviceType.update({
    where: { id: serviceTypeId },
    data: { isActive: !serviceType.isActive }
  });

  await createAdminAuditLog({
    actorId: actor.id,
    action: "SERVICE_TYPE_STATUS_UPDATED",
    entityType: "SERVICE_TYPE",
    entityId: serviceTypeId,
    metadata: { nextStatus: !serviceType.isActive ? "ACTIVE" : "INACTIVE" }
  });

  revalidatePath("/admin/services");
  revalidatePath("/portal/services");
  redirect(`/admin/services?service=${serviceTypeId}&success=Service+type+status+updated.`);
}

export async function createRequirementAction(formData: FormData) {
  const actor = await requireAdminUser();
  const serviceTypeId = asText(formData.get("serviceTypeId"));
  const name = asText(formData.get("name"));
  const description = asText(formData.get("description"));
  const sortOrder = Number.parseInt(asText(formData.get("sortOrder")) || "0", 10);
  const isRequired = formData.get("isRequired") === "on";

  if (!serviceTypeId || !name) {
    redirect("/admin/services?error=Requirement+name+is+required.");
  }

  const created = await prisma.serviceDocumentRequirement.create({
    data: {
      serviceTypeId,
      name,
      description,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      isRequired
    }
  });

  await createAdminAuditLog({
    actorId: actor.id,
    action: "SERVICE_REQUIREMENT_CREATED",
    entityType: "SERVICE_REQUIREMENT",
    entityId: created.id,
    metadata: { serviceTypeId }
  });

  revalidatePath("/admin/services");
  revalidatePath("/portal/services");
  redirect(`/admin/services?service=${serviceTypeId}&success=Requirement+added.`);
}

export async function updateRequirementAction(formData: FormData) {
  const actor = await requireAdminUser();
  const requirementId = asText(formData.get("requirementId"));
  const serviceTypeId = asText(formData.get("serviceTypeId"));
  const name = asText(formData.get("name"));
  const description = asText(formData.get("description"));
  const sortOrder = Number.parseInt(asText(formData.get("sortOrder")) || "0", 10);
  const isRequired = formData.get("isRequired") === "on";

  if (!requirementId || !serviceTypeId || !name) {
    redirect(`/admin/services?service=${serviceTypeId}&error=Missing+requirement+fields.`);
  }

  await prisma.serviceDocumentRequirement.update({
    where: { id: requirementId },
    data: {
      name,
      description,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      isRequired
    }
  });

  await createAdminAuditLog({
    actorId: actor.id,
    action: "SERVICE_REQUIREMENT_UPDATED",
    entityType: "SERVICE_REQUIREMENT",
    entityId: requirementId,
    metadata: { serviceTypeId }
  });

  revalidatePath("/admin/services");
  revalidatePath("/portal/services");
  redirect(`/admin/services?service=${serviceTypeId}&success=Requirement+updated.`);
}

export async function deleteRequirementAction(formData: FormData) {
  const actor = await requireAdminUser();
  const requirementId = asText(formData.get("requirementId"));
  const serviceTypeId = asText(formData.get("serviceTypeId"));

  if (!requirementId || !serviceTypeId) {
    redirect("/admin/services?error=Missing+requirement+identifier.");
  }

  const requirement = await prisma.serviceDocumentRequirement.findUnique({
    where: { id: requirementId },
    include: {
      documents: {
        select: { id: true },
        take: 1
      }
    }
  });

  if (!requirement) {
    redirect(`/admin/services?service=${serviceTypeId}&error=Requirement+not+found.`);
  }

  if (requirement.documents.length > 0) {
    redirect(`/admin/services?service=${serviceTypeId}&error=Cannot+delete+requirement+with+uploaded+documents.`);
  }

  await prisma.serviceDocumentRequirement.delete({ where: { id: requirementId } });

  await createAdminAuditLog({
    actorId: actor.id,
    action: "SERVICE_REQUIREMENT_DELETED",
    entityType: "SERVICE_REQUIREMENT",
    entityId: requirementId,
    metadata: { serviceTypeId }
  });

  revalidatePath("/admin/services");
  revalidatePath("/portal/services");
  redirect(`/admin/services?service=${serviceTypeId}&success=Requirement+deleted.`);
}

export async function createServiceFormFieldAction(formData: FormData) {
  const actor = await requireAdminUser();
  const serviceTypeId = asText(formData.get("serviceTypeId"));
  const fieldKey = asText(formData.get("fieldKey"));
  const fieldLabel = asText(formData.get("fieldLabel"));
  const fieldType = asText(formData.get("fieldType")).toUpperCase() as ServiceFormFieldType;
  const sortOrder = Number.parseInt(asText(formData.get("sortOrder")) || "0", 10);
  const isRequired = formData.get("isRequired") === "on";
  const placeholder = asText(formData.get("placeholder"));
  const helpText = asText(formData.get("helpText"));
  const selectOptions = asText(formData.get("selectOptions"));

  if (!serviceTypeId || !fieldKey || !fieldLabel) {
    redirect(`/admin/services?service=${serviceTypeId}&error=Field+key+and+label+are+required.`);
  }

  if (!FIELD_TYPE_VALUES.includes(fieldType)) {
    redirect(`/admin/services?service=${serviceTypeId}&error=Invalid+field+type+selected.`);
  }

  if (fieldType === "SELECT" && !selectOptions) {
    redirect(`/admin/services?service=${serviceTypeId}&error=Select+field+requires+at+least+one+option.`);
  }

  try {
    const created = await prisma.serviceFormField.create({
      data: {
        serviceTypeId,
        fieldKey,
        fieldLabel,
        fieldType,
        isRequired,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        placeholder: placeholder || null,
        helpText: helpText || null,
        selectOptions: fieldType === "SELECT" ? selectOptions : null
      }
    });

    await createAdminAuditLog({
      actorId: actor.id,
      action: "SERVICE_FORM_FIELD_CREATED",
      entityType: "SERVICE_FORM_FIELD",
      entityId: created.id,
      metadata: { serviceTypeId, fieldKey }
    });
  } catch {
    redirect(`/admin/services?service=${serviceTypeId}&error=Unable+to+create+field.+Field+key+must+be+unique+per+service.`);
  }

  revalidatePath("/admin/services");
  revalidatePath("/portal/services");
  redirect(`/admin/services?service=${serviceTypeId}&success=Form+field+added.`);
}

export async function updateServiceFormFieldAction(formData: FormData) {
  const actor = await requireAdminUser();
  const fieldId = asText(formData.get("fieldId"));
  const serviceTypeId = asText(formData.get("serviceTypeId"));
  const fieldKey = asText(formData.get("fieldKey"));
  const fieldLabel = asText(formData.get("fieldLabel"));
  const fieldType = asText(formData.get("fieldType")).toUpperCase() as ServiceFormFieldType;
  const sortOrder = Number.parseInt(asText(formData.get("sortOrder")) || "0", 10);
  const isRequired = formData.get("isRequired") === "on";
  const placeholder = asText(formData.get("placeholder"));
  const helpText = asText(formData.get("helpText"));
  const selectOptions = asText(formData.get("selectOptions"));

  if (!fieldId || !serviceTypeId || !fieldKey || !fieldLabel) {
    redirect(`/admin/services?service=${serviceTypeId}&error=Missing+form+field+details.`);
  }

  if (!FIELD_TYPE_VALUES.includes(fieldType)) {
    redirect(`/admin/services?service=${serviceTypeId}&error=Invalid+field+type+selected.`);
  }

  if (fieldType === "SELECT" && !selectOptions) {
    redirect(`/admin/services?service=${serviceTypeId}&error=Select+field+requires+at+least+one+option.`);
  }

  try {
    await prisma.serviceFormField.update({
      where: { id: fieldId },
      data: {
        fieldKey,
        fieldLabel,
        fieldType,
        isRequired,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        placeholder: placeholder || null,
        helpText: helpText || null,
        selectOptions: fieldType === "SELECT" ? selectOptions : null
      }
    });
  } catch {
    redirect(`/admin/services?service=${serviceTypeId}&error=Unable+to+update+field.+Check+field+key+uniqueness.`);
  }

  await createAdminAuditLog({
    actorId: actor.id,
    action: "SERVICE_FORM_FIELD_UPDATED",
    entityType: "SERVICE_FORM_FIELD",
    entityId: fieldId,
    metadata: { serviceTypeId, fieldKey }
  });

  revalidatePath("/admin/services");
  revalidatePath("/portal/services");
  redirect(`/admin/services?service=${serviceTypeId}&success=Form+field+updated.`);
}

export async function deleteServiceFormFieldAction(formData: FormData) {
  const actor = await requireAdminUser();
  const fieldId = asText(formData.get("fieldId"));
  const serviceTypeId = asText(formData.get("serviceTypeId"));

  if (!fieldId || !serviceTypeId) {
    redirect(`/admin/services?service=${serviceTypeId}&error=Missing+form+field+identifier.`);
  }

  const field = await prisma.serviceFormField.findUnique({ where: { id: fieldId } });

  if (!field) {
    redirect(`/admin/services?service=${serviceTypeId}&error=Form+field+not+found.`);
  }

  const existingEntriesCount = await prisma.applicationFormEntry.count({
    where: {
      fieldKey: field.fieldKey,
      application: { serviceTypeId }
    }
  });

  if (existingEntriesCount > 0) {
    redirect(`/admin/services?service=${serviceTypeId}&error=Cannot+delete+field+already+used+in+applications.`);
  }

  await prisma.serviceFormField.delete({ where: { id: fieldId } });

  await createAdminAuditLog({
    actorId: actor.id,
    action: "SERVICE_FORM_FIELD_DELETED",
    entityType: "SERVICE_FORM_FIELD",
    entityId: fieldId,
    metadata: { serviceTypeId, fieldKey: field.fieldKey }
  });

  revalidatePath("/admin/services");
  revalidatePath("/portal/services");
  redirect(`/admin/services?service=${serviceTypeId}&success=Form+field+deleted.`);
}

export async function moveServiceFormFieldAction(formData: FormData) {
  const actor = await requireAdminUser();
  const fieldId = asText(formData.get("fieldId"));
  const serviceTypeId = asText(formData.get("serviceTypeId"));
  const direction = asText(formData.get("direction"));

  if (!fieldId || !serviceTypeId || !["up", "down"].includes(direction)) {
    redirect(`/admin/services?service=${serviceTypeId}&error=Invalid+reorder+request.`);
  }

  const fields = await prisma.serviceFormField.findMany({
    where: { serviceTypeId },
    orderBy: [{ sortOrder: "asc" }, { fieldLabel: "asc" }]
  });

  const index = fields.findIndex((field) => field.id === fieldId);

  if (index < 0) {
    redirect(`/admin/services?service=${serviceTypeId}&error=Form+field+not+found+for+reorder.`);
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;

  if (swapIndex < 0 || swapIndex >= fields.length) {
    redirect(`/admin/services?service=${serviceTypeId}&success=Form+field+order+unchanged.`);
  }

  await prisma.$transaction([
    prisma.serviceFormField.update({
      where: { id: fields[index].id },
      data: { sortOrder: fields[swapIndex].sortOrder }
    }),
    prisma.serviceFormField.update({
      where: { id: fields[swapIndex].id },
      data: { sortOrder: fields[index].sortOrder }
    })
  ]);

  await createAdminAuditLog({
    actorId: actor.id,
    action: "SERVICE_FORM_FIELD_REORDERED",
    entityType: "SERVICE_FORM_FIELD",
    entityId: fieldId,
    metadata: { serviceTypeId, direction }
  });

  revalidatePath("/admin/services");
  revalidatePath("/portal/services");
  redirect(`/admin/services?service=${serviceTypeId}&success=Form+field+order+updated.`);
}
