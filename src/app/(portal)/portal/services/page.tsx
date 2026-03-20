import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { DataTableShell } from "@/components/app/data-table-shell";
import { prisma } from "@/lib/prisma";

export default async function PortalServicesPage() {
  const services = await prisma.serviceType.findMany({ orderBy: { name: "asc" } });
  const serviceRows = services.map((service) => [service.code, service.name, service.baseFeeNgn.toNumber()]);

  return (
    <section className="space-y-6">
      <PageHeader title="Service Catalogue" description="Discover digital services available for operators and company admins." />
      {services.length ? (
        <DataTableShell
          title="Available Service Types"
          columns={["Code", "Name", "Fee (₦)"]}
          rows={serviceRows}
        />
      ) : (
        <EmptyState title="No services configured" description="Admin users can populate service types in the next build phase." />
      )}
    </section>
  );
}
