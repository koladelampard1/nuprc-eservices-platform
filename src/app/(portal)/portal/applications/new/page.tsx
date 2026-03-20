import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplicationForm } from "@/components/portal/application-form";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { getServiceFields, requirePortalUser } from "@/lib/portal-application";
import { prisma } from "@/lib/prisma";

import { saveDraftAction, submitApplicationAction } from "../actions";

export default async function NewApplicationPage({
  searchParams
}: {
  searchParams: { serviceCode?: string; error?: string };
}) {
  const user = await requirePortalUser();
  const { serviceCode, error } = searchParams;

  if (!serviceCode) {
    return (
      <section className="space-y-6">
        <PageHeader title="Start Application" description="Select a service type to continue." />
        <Link href="/portal/services">
          <Button>Go to Services</Button>
        </Link>
      </section>
    );
  }

  const service = await prisma.serviceType.findUnique({ where: { code: serviceCode.toUpperCase() } });

  if (!service) {
    notFound();
  }

  if (!service.isActive) {
    return (
      <section className="space-y-6">
        <PageHeader title="Service not available" description="This service is currently inactive or unavailable for new applications." />
        <Link href="/portal/services">
          <Button variant="outline">Back to Services</Button>
        </Link>
      </section>
    );
  }

  const fields = await getServiceFields(service.code);
  const saveDraft = saveDraftAction.bind(null, { serviceCode: service.code });
  const submit = submitApplicationAction.bind(null, { serviceCode: service.code });

  return (
    <section className="space-y-6">
      <PageHeader
        title={`Start ${service.name}`}
        description="Enter your application details. You can save as draft and return later."
      />
      <ApplicationForm
        title="Application Form"
        description={error ? decodeURIComponent(error) : "Complete the service-specific fields below."}
        companyName={user.company?.name ?? "-"}
        companyRcNumber={user.company?.rcNumber ?? "-"}
        fields={fields}
        saveDraftAction={saveDraft}
        submitAction={submit}
      />
    </section>
  );
}
