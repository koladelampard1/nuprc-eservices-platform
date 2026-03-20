import { notFound, redirect } from "next/navigation";

import { ApplicationForm } from "@/components/portal/application-form";
import { PageHeader } from "@/components/app/page-header";
import { getServiceFields, requirePortalUser } from "@/lib/portal-application";
import { prisma } from "@/lib/prisma";

import { saveDraftAction, submitApplicationAction } from "../../actions";

export default async function EditApplicationDraftPage({ params }: { params: { id: string } }) {
  const user = await requirePortalUser();
  const { id } = params;

  const application = await prisma.application.findFirst({
    where: { id, companyId: user.companyId ?? "" },
    include: {
      serviceType: true,
      formEntries: true
    }
  });

  if (!application) {
    notFound();
  }

  if (application.state !== "DRAFT") {
    redirect(`/portal/applications/${application.id}`);
  }

  const fields = getServiceFields(application.serviceType.code);
  const initialValues = Object.fromEntries(application.formEntries.map((entry) => [entry.fieldKey, entry.value]));
  const saveDraft = saveDraftAction.bind(null, { serviceCode: application.serviceType.code, applicationId: application.id });
  const submit = submitApplicationAction.bind(null, { serviceCode: application.serviceType.code, applicationId: application.id });

  return (
    <section className="space-y-6">
      <PageHeader title={`Edit Draft ${application.referenceNo}`} description="Update your draft and submit when complete." />
      <ApplicationForm
        title={`${application.serviceType.name} Draft`}
        description="Update the fields below and save draft or submit."
        companyName={user.company?.name ?? "-"}
        companyRcNumber={user.company?.rcNumber ?? "-"}
        fields={fields}
        initialValues={initialValues}
        saveDraftAction={saveDraft}
        submitAction={submit}
      />
    </section>
  );
}
