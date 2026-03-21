import Link from "next/link";

import { DataTableShell } from "@/components/app/data-table-shell";
import { MetricCard } from "@/components/app/metric-card";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function PortalDashboardPage() {
  const [total, submitted, inReview] = await Promise.all([
    prisma.application.count(),
    prisma.application.count({ where: { state: "SUBMITTED" } }),
    prisma.application.count({ where: { state: "IN_REVIEW" } })
  ]);

  const recent = await prisma.application.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { serviceType: true }
  });

  return (
    <section className="space-y-6">
      <PageHeader title="Portal Dashboard" description="Overview of active submissions, readiness status, and application progress." />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total Applications" value={total} delta="All records in your operating history" />
        <MetricCard title="Submitted" value={submitted} delta="Pending processing or queued for review" />
        <MetricCard title="In Review" value={inReview} delta="Currently under regulatory assessment" />
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Submission Readiness</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Prepare complete applications to reduce review delays.</p>
          </div>
          <Link href="/portal/applications/new">
            <Button>Start New Application</Button>
          </Link>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-lg border bg-slate-50/70 p-3">
            <p className="font-medium text-slate-900">Document Quality</p>
            <p className="mt-1 text-slate-600">Upload clear, current, and correctly named files to accelerate verification.</p>
          </div>
          <div className="rounded-lg border bg-slate-50/70 p-3">
            <p className="font-medium text-slate-900">Payment Readiness</p>
            <p className="mt-1 text-slate-600">Generate and settle payment reference before final submission when required.</p>
          </div>
          <div className="rounded-lg border bg-slate-50/70 p-3">
            <p className="font-medium text-slate-900">Clarification Response</p>
            <p className="mt-1 text-slate-600">Respond promptly to reviewer requests to maintain processing momentum.</p>
          </div>
        </CardContent>
      </Card>

      <DataTableShell
        title="Recent Applications"
        columns={["Reference", "Service", "State"]}
        rows={recent.map((item) => [item.referenceNo, item.serviceType.name, item.state])}
        emptyTitle="No applications yet"
        emptyDescription="Start a new application to populate this dashboard and monitor your progress."
      />

      {recent.length > 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Latest Activity Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recent.slice(0, 3).map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-slate-50/70 px-3 py-2">
                <span className="font-medium text-slate-800">{item.referenceNo}</span>
                <span className="text-slate-600">{item.serviceType.name}</span>
                <StatusBadge label={item.state} tone="info" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
