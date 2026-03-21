import Link from "next/link";

import { DataTableShell } from "@/components/app/data-table-shell";
import { ColumnTrendChart, HorizontalBarChart } from "@/components/app/dashboard-charts";
import { MetricCard } from "@/components/app/metric-card";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildRecentMonths, compactStateLabel, formatShortMonth, groupDatesByLabel } from "@/lib/dashboard-analytics";
import { prisma } from "@/lib/prisma";

const queueStates = ["SUBMITTED", "IN_REVIEW", "CLARIFICATION_REQUIRED"] as const;

export default async function WorkspaceDashboardPage() {
  const [queueApplications, recentActions, finalisedApps] = await Promise.all([
    prisma.application.findMany({
      where: { state: { in: [...queueStates] } },
      include: { company: true, serviceType: true, assignedTo: true, reviewActions: true },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.reviewAction.findMany({
      include: {
        reviewer: true,
        application: { include: { company: true, serviceType: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.application.findMany({
      where: { state: { in: ["APPROVED", "REJECTED"] }, submittedAt: { not: null } },
      select: { state: true, submittedAt: true, updatedAt: true }
    })
  ]);

  const queueSize = queueApplications.length;
  const newSubmissions = queueApplications.filter((application) => application.state === "SUBMITTED").length;
  const inReview = queueApplications.filter((application) => application.state === "IN_REVIEW").length;
  const clarificationRequired = queueApplications.filter((application) => application.state === "CLARIFICATION_REQUIRED").length;

  const awaitingFinalDecision = queueApplications.filter(
    (application) =>
      application.state === "IN_REVIEW" &&
      application.reviewActions.some((action) => action.actionType === "RECOMMENDED_APPROVAL" || action.actionType === "RECOMMENDED_REJECTION")
  ).length;

  const approvedCount = finalisedApps.filter((application) => application.state === "APPROVED").length;
  const rejectedCount = finalisedApps.filter((application) => application.state === "REJECTED").length;

  const now = Date.now();
  const dayMs = 1000 * 60 * 60 * 24;
  const overdueCount = queueApplications.filter((application) => now - application.updatedAt.getTime() > 7 * dayMs).length;
  const dueSoonCount = queueApplications.filter((application) => {
    const ageDays = (now - application.updatedAt.getTime()) / dayMs;
    return ageDays > 3 && ageDays <= 7;
  }).length;
  const newCount = queueApplications.filter((application) => now - application.createdAt.getTime() <= 2 * dayMs).length;

  const serviceMap = new Map<string, { label: string; value: number }>();
  queueApplications.forEach((application) => {
    const existing = serviceMap.get(application.serviceTypeId);
    if (existing) {
      existing.value += 1;
    } else {
      serviceMap.set(application.serviceTypeId, { label: application.serviceType.name, value: 1 });
    }
  });
  const serviceDistribution = Array.from(serviceMap.values()).sort((a, b) => b.value - a.value).slice(0, 6);

  const workloadMap = new Map<string, { label: string; value: number; hint: string }>();
  queueApplications.forEach((application) => {
    const key = application.assignedToId ?? "unassigned";
    const label = application.assignedTo?.fullName ?? "Unassigned";
    const existing = workloadMap.get(key);
    if (existing) {
      existing.value += 1;
    } else {
      workloadMap.set(key, {
        label,
        value: 1,
        hint: application.assignedTo ? "Assigned reviewer workload" : "Requires assignment"
      });
    }
  });
  const workloadData = Array.from(workloadMap.values()).sort((a, b) => b.value - a.value).slice(0, 5);

  const trendMonths = buildRecentMonths(6);
  const approvalTrend = groupDatesByLabel(
    finalisedApps.filter((application) => application.state === "APPROVED").map((application) => application.updatedAt),
    trendMonths,
    formatShortMonth
  );
  const rejectionTrend = groupDatesByLabel(
    finalisedApps.filter((application) => application.state === "REJECTED").map((application) => application.updatedAt),
    trendMonths,
    formatShortMonth
  );

  const avgTurnaroundDays = finalisedApps.length
    ? (
        finalisedApps.reduce((total, application) => {
          const submittedAt = application.submittedAt as Date;
          return total + (application.updatedAt.getTime() - submittedAt.getTime()) / dayMs;
        }, 0) / finalisedApps.length
      ).toFixed(1)
    : "0.0";

  const stateDistribution = queueStates.map((state) => ({ label: compactStateLabel(state), value: queueApplications.filter((item) => item.state === state).length }));

  return (
    <section className="space-y-6">
      <PageHeader title="Workspace Dashboard" description="Operational cockpit for queue health, review throughput, and SLA urgency." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Queue Size" value={queueSize} delta="All active applications in workspace" />
        <MetricCard title="New Submissions" value={newSubmissions} delta="Freshly submitted and pending first touch" />
        <MetricCard title="Awaiting Final Decision" value={awaitingFinalDecision} delta="Recommendations awaiting final disposition" />
        <MetricCard title="Approved / Rejected" value={`${approvedCount}/${rejectedCount}`} delta="Finalized outcomes to date" />
        <MetricCard title="Avg Turnaround (days)" value={avgTurnaroundDays} delta="Submitted to final decision" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 shadow-sm">
          <CardHeader>
            <CardTitle>Queue Status Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">Current mix of submission, active review, and clarification states.</p>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={stateDistribution} />
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Urgency / SLA Signals</CardTitle>
              <p className="text-sm text-muted-foreground">Prioritization indicators for queue triage.</p>
            </div>
            <Link href="/workspace/queue">
              <Button>Open Queue</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="rounded-lg border border-rose-100 bg-rose-50/70 p-3">Overdue &gt; 7 days: <strong>{overdueCount}</strong></div>
            <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-3">Due soon (3-7 days): <strong>{dueSoonCount}</strong></div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3">New in last 48h: <strong>{newCount}</strong></div>
            <div className="rounded-lg border border-slate-200 bg-white/80 p-3">Clarification required: <strong>{clarificationRequired}</strong></div>
            <div className="rounded-lg border border-slate-200 bg-white/80 p-3">In review: <strong>{inReview}</strong></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 shadow-sm">
          <CardHeader>
            <CardTitle>Applications by Service Type</CardTitle>
            <p className="text-sm text-muted-foreground">Most active service lines in the current queue.</p>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={serviceDistribution} />
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 shadow-sm">
          <CardHeader>
            <CardTitle>Reviewer Workload Visibility</CardTitle>
            <p className="text-sm text-muted-foreground">Assigned volumes by reviewer, including unassigned applications.</p>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={workloadData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 shadow-sm">
          <CardHeader>
            <CardTitle>Approvals Trend (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ColumnTrendChart data={approvalTrend} />
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 shadow-sm">
          <CardHeader>
            <CardTitle>Rejections Trend (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ColumnTrendChart data={rejectionTrend} />
          </CardContent>
        </Card>
      </div>

      <DataTableShell
        title="Recent Workflow Events"
        columns={["When", "Reference", "Reviewer", "Action"]}
        rows={recentActions.map((action) => [
          new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(action.createdAt),
          action.application.referenceNo,
          action.reviewer.fullName,
          compactStateLabel(action.actionType)
        ])}
        emptyTitle="No review actions logged"
        emptyDescription="Reviewer actions will appear here as the queue is processed."
      />
    </section>
  );
}
