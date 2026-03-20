import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function PortalServiceDetailPage({ params }: { params: { serviceCode: string } }) {
  const { serviceCode } = params;

  const service = await prisma.serviceType.findUnique({
    where: { code: serviceCode.toUpperCase() },
    include: { documentRequirements: { orderBy: { sortOrder: "asc" } } }
  });

  if (!service) {
    notFound();
  }

  if (!service.isActive) {
    return (
      <section className="space-y-6">
        <PageHeader title="Service not available" description="This service is currently inactive or unavailable for new applications." />
        <Card>
          <CardHeader>
            <CardTitle>Service unavailable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>The selected service is not available at the moment. Please return to the service catalogue for active services.</p>
            <Link href="/portal/services">
              <Button variant="outline" size="sm">Back to Services</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader title={service.name} description={service.description} />

      <Card>
        <CardHeader>
          <CardTitle>Service Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>
            <span className="font-medium text-slate-900">Service Code:</span> {service.code}
          </p>
          <p>
            <span className="font-medium text-slate-900">Base Fee:</span> ₦{service.baseFeeNgn.toNumber().toLocaleString("en-NG")}
          </p>
          <p className="pt-2 font-medium text-slate-900">Required supporting documents (upload step coming soon):</p>
          <ul className="list-disc space-y-1 pl-5">
            {service.documentRequirements.length ? (
              service.documentRequirements.map((doc) => <li key={doc.id}>{doc.name}</li>)
            ) : (
              <li>No document requirement configured yet.</li>
            )}
          </ul>
          <div className="pt-4">
            <Link href={`/portal/applications/new?serviceCode=${service.code}`}>
              <Button>Start Application</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
