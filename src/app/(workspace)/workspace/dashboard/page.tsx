import Link from "next/link";

import { DataTableShell } from "@/components/app/data-table-shell";
import { MetricCard } from "@/components/app/metric-card";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function WorkspaceDashboardPage() {
  const [queueCount, clarificationCount, approvedCount] = await Promise.all([
    prisma.application.count({ where: { state: { in: ["SUBMITTED", "IN_REVIEW"] } } }),
    prisma.application.count({ where: { state: "CLARIFICATION_REQUIRED" } }),
    prisma.application.count({ where: { state: "APPROVED" } })
  ]);

  const queuePreview = await prisma.application.findMany({
    take: 5,
    where: { state: { in: ["SUBMITTED", "IN_REVIEW", "CLARIFICATION_REQUIRED"] } },
    orderBy: { updatedAt: "desc" },
    include: { company: true, serviceType: true }
  });

  return (
    <section className="space-y-6">
      <PageHeader title="Workspace Dashboard" description="Monitor review workload, escalation triggers, and decision throughput." />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Active Queue" value={queueCount} delta="Applications requiring active reviewer attention" />
        <MetricCard title="Clarifications" value={clarificationCount} delta="Operator responses currently outstanding" />
        <MetricCard title="Approved" value={approvedCount} delta="Completed decisions ready for formal documentation" />
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Review Operations</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Drive consistent outcomes using structured review actions and notes.</p>
          </div>
          <Link href="/workspace/queue">
            <Button>Open Review Queue</Button>
          </Link>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <p className="rounded-lg border bg-slate-50/70 p-3 text-slate-700">Verify required documents and payment state before making recommendations.</p>
          <p className="rounded-lg border bg-slate-50/70 p-3 text-slate-700">Issue clear clarification requests that reference specific compliance concerns.</p>
          <p className="rounded-lg border bg-slate-50/70 p-3 text-slate-700">Capture review comments for transparency, continuity, and audit confidence.</p>
        </CardContent>
      </Card>

      <DataTableShell
        title="Queue Preview"
        columns={["Reference", "Company", "Service", "State"]}
        rows={queuePreview.map((item) => [item.referenceNo, item.company.name, item.serviceType.name, item.state])}
        emptyTitle="Queue is currently clear"
        emptyDescription="New submissions will appear here for review and processing."
      />
    </section>
  );
}
