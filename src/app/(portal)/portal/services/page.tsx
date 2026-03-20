import Link from "next/link";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function PortalServicesPage() {
  const services = await prisma.serviceType.findMany({ orderBy: { name: "asc" } });

  return (
    <section className="space-y-6">
      <PageHeader title="Service Catalogue" description="Discover digital services available for operators and company admins." />
      {services.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <CardTitle>{service.name}</CardTitle>
                <CardDescription>{service.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Service Code: {service.code}</p>
                <p className="text-sm font-medium text-slate-900">Base Fee: ₦{service.baseFeeNgn.toNumber().toLocaleString("en-NG")}</p>
                <div className="flex gap-3">
                  <Link href={`/portal/services/${service.code}`}>
                    <Button variant="outline" size="sm">View Service</Button>
                  </Link>
                  <Link href={`/portal/applications/new?serviceCode=${service.code}`}>
                    <Button size="sm">Start Application</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No services configured" description="Admin users can populate service types in the next build phase." />
      )}
    </section>
  );
}
