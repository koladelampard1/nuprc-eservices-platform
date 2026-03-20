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

type PendingFieldConfig = {
  fieldKey: string;
  fieldLabel: string;
  fieldType: ServiceFormFieldType;
  isRequired: boolean;
  sortOrder: number;
  placeholder: string | null;
  helpText: string | null;
  selectOptions: string | null;
};

function parsePendingFieldConfigs(formData: FormData): PendingFieldConfig[] {
  const fieldKeys = formData.getAll("fieldKey[]").map((entry) => asText(entry));
  const fieldLabels = formData.getAll("fieldLabel[]").map((entry) => asText(entry));
  const fieldTypes = formData.getAll("fieldType[]").map((entry) => asText(entry).toUpperCase());
  const requiredFlags = formData.getAll("required[]").map((entry) => asText(entry).toLowerCase());
  const sortOrders = formData.getAll("sortOrder[]").map((entry) => Number.parseInt(asText(entry) || "0", 10));
  const placeholders = formData.getAll("placeholder[]").map((entry) => asText(entry));
  const helpTexts = formData.getAll("helpText[]").map((entry) => asText(entry));
  const selectOptions = formData.getAll("selectOptions[]").map((entry) => asText(entry));

  const maxRows = Math.max(
    fieldKeys.length,
    fieldLabels.length,
    fieldTypes.length,
    requiredFlags.length,
    sortOrders.length,
    placeholders.length,
    helpTexts.length,
    selectOptions.length
  );

  const configs: PendingFieldConfig[] = [];
  const seenKeys = new Set<string>();

  for (let index = 0; index < maxRows; index += 1) {
    const fieldKey = fieldKeys[index] ?? "";
    const fieldLabel = fieldLabels[index] ?? "";
    const fieldType = (fieldTypes[index] ?? "TEXT") as ServiceFormFieldType;
    const required = requiredFlags[index] ?? "false";
    const sortOrder = Number.isFinite(sortOrders[index]) ? sortOrders[index] : 0;
    const placeholder = placeholders[index] ?? "";
    const helpText = helpTexts[index] ?? "";
    const options = selectOptions[index] ?? "";

    const hasAnyValue = [fieldKey, fieldLabel, fieldType, placeholder, helpText, options].some((value) => value.length > 0);
    if (!hasAnyValue) continue;

    if (!fieldKey || !fieldLabel) {
      redirect(`/admin/services?error=Each+configured+field+must+include+both+field+key+and+field+label.+Check+row+${index + 1}.`);
    }

    if (!FIELD_TYPE_VALUES.includes(fieldType)) {
      redirect(`/admin/services?error=Invalid+field+type+provided+in+row+${index + 1}.`);
    }

    if (fieldType === "SELECT" && !options) {
      redirect(`/admin/services?error=Select+field+in+row+${index + 1}+requires+at+least+one+option.`);
    }

    if (seenKeys.has(fieldKey.toLowerCase())) {
      redirect("/admin/services?error=Field+keys+must+be+unique+within+the+same+service+creation+request.");
    }

    seenKeys.add(fieldKey.toLowerCase());

    configs.push({
      fieldKey,
      fieldLabel,
      fieldType,
      isRequired: required === "true",
      sortOrder,
      placeholder: placeholder || null,
      helpText: helpText || null,
      selectOptions: fieldType === "SELECT" ? options : null
    });
  }

  return configs;
}

export async function createServiceTypeAction(formData: FormData) {
  const actor = await requireAdminUser();

  const code = asText(formData.get("code")).toUpperCase();
  const name = asText(formData.get("name"));
  const description = asText(formData.get("description"));
  const paymentRequired = formData.get("paymentRequired") === "on";
  const baseFeeValue = toNumber(formData.get("baseFeeNgn"));
  const pendingFieldConfigs = parsePendingFieldConfigs(formData);

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
        isActive: true,
        formFields: pendingFieldConfigs.length
          ? {
              create: pendingFieldConfigs
            }
          : undefined
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

export async function deleteServiceTypeAction(formData: FormData) {
  const actor = await requireAdminUser();
  const serviceTypeId = asText(formData.get("serviceTypeId"));

  if (!serviceTypeId) {
    redirect("/admin/services?error=Missing+service+type+identifier.");
  }

  const serviceType = await prisma.serviceType.findUnique({
    where: { id: serviceTypeId },
    include: {
      _count: {
        select: {
          applications: true
        }
      }
    }
  });

  if (!serviceType) {
    redirect("/admin/services?error=Service+type+not+found.");
  }

  if (serviceType._count.applications > 0) {
    redirect(
      `/admin/services?service=${serviceTypeId}&error=Cannot+delete+service+with+existing+applications.+Deactivate+it+instead.`
    );
  }

  await prisma.$transaction([
    prisma.serviceDocumentRequirement.deleteMany({ where: { serviceTypeId } }),
    prisma.serviceFormField.deleteMany({ where: { serviceTypeId } }),
    prisma.serviceType.delete({ where: { id: serviceTypeId } })
  ]);

  await createAdminAuditLog({
    actorId: actor.id,
    action: "SERVICE_TYPE_DELETED",
    entityType: "SERVICE_TYPE",
    entityId: serviceTypeId,
    metadata: { code: serviceType.code }
  });

  revalidatePath("/admin/services");
  revalidatePath("/portal/services");
  redirect("/admin/services?success=Service+type+deleted.");
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
