import { DataTableShell } from "@/components/app/data-table-shell";
import { PageHeader } from "@/components/app/page-header";
import { prisma } from "@/lib/prisma";

export default async function PortalApplicationsPage() {
  const applications = await prisma.application.findMany({
    include: { serviceType: true, company: true },
    orderBy: { updatedAt: "desc" },
    take: 8
  });

  return (
    <section className="space-y-6">
      <PageHeader title="Applications" description="Track the status of all your submissions and upcoming review events." />
      <DataTableShell
        title="My Recent Applications"
        columns={["Reference", "Company", "Service", "Status"]}
        rows={applications.map((application) => [
          application.referenceNo,
          application.company.name,
          application.serviceType.name,
          application.state
        ])}
      />
    </section>
  );
}
