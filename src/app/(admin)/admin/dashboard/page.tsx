import { MetricCard } from "@/components/app/metric-card";
import { PageHeader } from "@/components/app/page-header";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [users, services, logs] = await Promise.all([
    prisma.user.count(),
    prisma.serviceType.count(),
    prisma.auditLog.count()
  ]);

  return (
    <section className="space-y-6">
      <PageHeader title="Admin Dashboard" description="Govern access, service settings, and compliance visibility." />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Registered Users" value={users} />
        <MetricCard title="Service Types" value={services} />
        <MetricCard title="Audit Events" value={logs} />
      </div>
    </section>
  );
}
