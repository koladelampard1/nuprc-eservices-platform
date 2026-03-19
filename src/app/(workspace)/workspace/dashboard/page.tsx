import { MetricCard } from "@/components/app/metric-card";
import { PageHeader } from "@/components/app/page-header";
import { prisma } from "@/lib/prisma";

export default async function WorkspaceDashboardPage() {
  const [queueCount, clarificationCount, approvedCount] = await Promise.all([
    prisma.application.count({ where: { state: { in: ["SUBMITTED", "IN_REVIEW"] } } }),
    prisma.application.count({ where: { state: "CLARIFICATION_REQUIRED" } }),
    prisma.application.count({ where: { state: "APPROVED" } })
  ]);

  return (
    <section className="space-y-6">
      <PageHeader title="Workspace Dashboard" description="Monitor review workload, escalation triggers, and decision throughput." />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Active Queue" value={queueCount} />
        <MetricCard title="Clarifications" value={clarificationCount} />
        <MetricCard title="Approved" value={approvedCount} />
      </div>
    </section>
  );
}
