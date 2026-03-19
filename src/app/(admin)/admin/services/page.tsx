import { DataTableShell } from "@/components/app/data-table-shell";
import { PageHeader } from "@/components/app/page-header";
import { prisma } from "@/lib/prisma";

export default async function AdminServicesPage() {
  const services = await prisma.serviceType.findMany({ include: { documentRequirements: true }, orderBy: { name: "asc" } });

  return (
    <section className="space-y-6">
      <PageHeader title="Services" description="Manage catalog metadata and mandatory documentation requirements." />
      <DataTableShell
        title="Service Type Controls"
        columns={["Code", "Name", "Required Documents"]}
        rows={services.map((service) => [service.code, service.name, service.documentRequirements.length])}
      />
    </section>
  );
}
