import { MetricCard } from "@/components/app/metric-card";
import { PageHeader } from "@/components/app/page-header";
import { DataTableShell } from "@/components/app/data-table-shell";
import { prisma } from "@/lib/prisma";

export default async function PortalDashboardPage() {
  const [total, submitted, inReview] = await Promise.all([
    prisma.application.count(),
    prisma.application.count({ where: { state: "SUBMITTED" } }),
    prisma.application.count({ where: { state: "IN_REVIEW" } })
  ]);

  const recent = await prisma.application.findMany({
    take: 4,
    orderBy: { createdAt: "desc" },
    include: { serviceType: true }
  });

  return (
    <section className="space-y-6">
      <PageHeader title="Portal Dashboard" description="Overview of active submissions and service delivery posture." />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total Applications" value={total} />
        <MetricCard title="Submitted" value={submitted} />
        <MetricCard title="In Review" value={inReview} />
      </div>
      <DataTableShell
        title="Recent Applications"
        columns={["Reference", "Service", "State"]}
        rows={recent.map((item) => [item.referenceNo, item.serviceType.name, item.state])}
      />
    </section>
  );
}
