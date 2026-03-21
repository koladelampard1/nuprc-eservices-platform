import Link from "next/link";

import { DataTableShell } from "@/components/app/data-table-shell";
import { ColumnTrendChart, DonutStat, HorizontalBarChart } from "@/components/app/dashboard-charts";
import { MetricCard } from "@/components/app/metric-card";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { buildRecentDays, compactStateLabel, formatShortDay, groupDatesByLabel } from "@/lib/dashboard-analytics";
import { prisma } from "@/lib/prisma";

const operatorStates = ["DRAFT", "SUBMITTED", "IN_REVIEW", "CLARIFICATION_REQUIRED", "APPROVED", "REJECTED"] as const;

export default async function PortalDashboardPage() {
  const session = await auth();
  const scopeWhere = session?.user?.companyId
    ? { companyId: session.user.companyId }
    : session?.user?.id
      ? { submittedById: session.user.id }
      : {};

  const [applications, recentTransitions] = await Promise.all([
    prisma.application.findMany({
      where: scopeWhere,
      include: {
        serviceType: { include: { documentRequirements: true } },
        documents: true,
        paymentReferences: true
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.workflowTransition.findMany({
      where: { application: scopeWhere },
      include: { application: { include: { serviceType: true } } },
      orderBy: { transitionedAt: "desc" },
      take: 6
    })
  ]);

  const stateCounts = Object.fromEntries(operatorStates.map((state) => [state, 0]));
  let paymentPending = 0;
  let completeReadiness = 0;
  let partialReadiness = 0;
  let missingReadiness = 0;

  applications.forEach((application) => {
    stateCounts[application.state] += 1;

    if (application.paymentReferences.some((reference) => reference.status === "PENDING")) {
      paymentPending += 1;
    }

    const requiredRequirementIds = application.serviceType.documentRequirements
      .filter((requirement) => requirement.isRequired)
      .map((requirement) => requirement.id);

    if (requiredRequirementIds.length === 0) {
      completeReadiness += 1;
      return;
    }

    const uploadedRequirementIds = new Set(
      application.documents
        .map((document) => document.requirementId)
        .filter((value): value is string => Boolean(value))
    );

    const completedCount = requiredRequirementIds.filter((id) => uploadedRequirementIds.has(id)).length;

    if (completedCount === 0) {
      missingReadiness += 1;
    } else if (completedCount === requiredRequirementIds.length) {
      completeReadiness += 1;
    } else {
      partialReadiness += 1;
    }
  });

  const trendWindow = buildRecentDays(6);
  const trendData = groupDatesByLabel(
    applications.map((application) => application.createdAt),
    trendWindow,
    formatShortDay
  );

  const statusData = operatorStates.map((state) => ({
    label: compactStateLabel(state),
    value: stateCounts[state]
  }));

  const readinessTotal = completeReadiness + partialReadiness + missingReadiness;
  const recentApplications = applications.slice(0, 5);

  return (
    <section className="space-y-6">
      <PageHeader title="Portal Dashboard" description="Executive view of portfolio health, readiness posture, and operator actions." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Applications" value={applications.length} delta="All applications in your operator scope" />
        <MetricCard title="Drafts" value={stateCounts.DRAFT} delta="Saved and not yet submitted" />
        <MetricCard title="In Review" value={stateCounts.IN_REVIEW} delta="Being assessed by reviewers" />
        <MetricCard title="Attention Needed" value={stateCounts.CLARIFICATION_REQUIRED + paymentPending} delta="Clarification or payment blockers" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 shadow-sm">
          <CardHeader>
            <CardTitle>Application Status Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">Current spread of applications by workflow state.</p>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={statusData} />
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 shadow-sm">
          <CardHeader>
            <CardTitle>Document Readiness</CardTitle>
            <p className="text-sm text-muted-foreground">Readiness summary across required document sets.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <DonutStat value={completeReadiness} total={readinessTotal} label="Complete" />
            <DonutStat value={partialReadiness} total={readinessTotal} label="Partially complete" />
            <DonutStat value={missingReadiness} total={readinessTotal} label="Missing required docs" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 shadow-sm">
          <CardHeader>
            <CardTitle>Application Trend (Last 6 Days)</CardTitle>
            <p className="text-sm text-muted-foreground">New application creation trend in your scope.</p>
          </CardHeader>
          <CardContent>
            <ColumnTrendChart data={trendData} />
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Next Actions</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">High-impact tasks to keep applications moving.</p>
            </div>
            <Link href="/portal/applications/new">
              <Button>Start New</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-3 text-slate-700">Clarification required: <strong>{stateCounts.CLARIFICATION_REQUIRED}</strong></div>
            <div className="rounded-lg border border-rose-100 bg-rose-50/70 p-3 text-slate-700">Payment pending: <strong>{paymentPending}</strong></div>
            <div className="rounded-lg border border-slate-200 bg-white/80 p-3 text-slate-700">Drafts awaiting submission: <strong>{stateCounts.DRAFT}</strong></div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3 text-slate-700">Approved portfolio: <strong>{stateCounts.APPROVED}</strong></div>
          </CardContent>
        </Card>
      </div>

      <DataTableShell
        title="Recent Applications"
        columns={["Reference", "Service", "State"]}
        rows={recentApplications.map((item) => [item.referenceNo, item.serviceType.name, item.state])}
        emptyTitle="No applications yet"
        emptyDescription="Start a new application to populate this dashboard and monitor your progress."
      />

      <Card className="border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 shadow-sm">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recentTransitions.length ? (
            recentTransitions.map((transition) => (
              <div key={transition.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white/80 px-3 py-2">
                <div>
                  <p className="font-medium text-slate-800">{transition.application.referenceNo}</p>
                  <p className="text-xs text-slate-500">{transition.application.serviceType.name}</p>
                </div>
                <StatusBadge label={compactStateLabel(transition.toState)} tone="info" />
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No recent workflow transitions in your scope.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
