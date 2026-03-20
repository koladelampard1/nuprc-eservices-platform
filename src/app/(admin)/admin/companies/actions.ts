"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminAuditLog, requireAdminUser } from "@/lib/admin-console";
import { prisma } from "@/lib/prisma";

function asText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function createCompanyAction(formData: FormData) {
  const actor = await requireAdminUser();
  const name = asText(formData.get("name"));
  const rcNumber = asText(formData.get("rcNumber")).toUpperCase();
  const contactEmail = asText(formData.get("contactEmail")).toLowerCase();

  if (!name || !rcNumber || !contactEmail) {
    redirect("/admin/companies?error=Name%2C+RC+number%2C+and+contact+email+are+required.");
  }

  if (!isValidEmail(contactEmail)) {
    redirect("/admin/companies?error=Please+provide+a+valid+contact+email+address.");
  }

  try {
    const created = await prisma.company.create({
      data: {
        name,
        rcNumber,
        contactEmail
      }
    });

    await createAdminAuditLog({
      actorId: actor.id,
      action: "COMPANY_CREATED",
      entityType: "COMPANY",
      entityId: created.id,
      metadata: { rcNumber: created.rcNumber }
    });
  } catch {
    redirect("/admin/companies?error=Unable+to+create+company.+RC+number+must+be+unique.");
  }

  revalidatePath("/admin/companies");
  revalidatePath("/admin/users");
  redirect("/admin/companies?success=Company+created.");
}

export async function updateCompanyAction(formData: FormData) {
  const actor = await requireAdminUser();
  const companyId = asText(formData.get("companyId"));
  const name = asText(formData.get("name"));
  const rcNumber = asText(formData.get("rcNumber")).toUpperCase();
  const contactEmail = asText(formData.get("contactEmail")).toLowerCase();

  if (!companyId || !name || !rcNumber || !contactEmail) {
    redirect("/admin/companies?error=Missing+company+details+for+update.");
  }

  if (!isValidEmail(contactEmail)) {
    redirect(`/admin/companies?company=${companyId}&error=Please+provide+a+valid+contact+email+address.`);
  }

  try {
    await prisma.company.update({
      where: { id: companyId },
      data: { name, rcNumber, contactEmail }
    });
  } catch {
    redirect(`/admin/companies?company=${companyId}&error=Unable+to+update+company.+RC+number+must+be+unique.`);
  }

  await createAdminAuditLog({
    actorId: actor.id,
    action: "COMPANY_UPDATED",
    entityType: "COMPANY",
    entityId: companyId,
    metadata: { rcNumber }
  });

  revalidatePath("/admin/companies");
  revalidatePath("/admin/users");
  redirect(`/admin/companies?company=${companyId}&success=Company+updated.`);
}
