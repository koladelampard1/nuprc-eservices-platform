import Link from "next/link";

import { DataTableShell } from "@/components/app/data-table-shell";
import { ColumnTrendChart, HorizontalBarChart } from "@/components/app/dashboard-charts";
import { MetricCard } from "@/components/app/metric-card";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildRecentMonths, compactStateLabel, formatShortMonth, groupDatesByLabel } from "@/lib/dashboard-analytics";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [users, companies, serviceTypes, applications, auditCount, emailLogCount, notifications, recentLogs] = await Promise.all([
    prisma.user.findMany({ include: { role: true } }),
    prisma.company.count(),
    prisma.serviceType.findMany({ include: { formFields: true, documentRequirements: true, applications: true } }),
    prisma.application.findMany({ include: { serviceType: true } }),
    prisma.auditLog.count(),
    prisma.auditLog.count({ where: { entityType: "EMAIL_SIMULATION" } }),
    prisma.notification.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: true }
    })
  ]);

  const activeUsers = users.filter((user) => user.isActive).length;
  const inactiveUsers = users.length - activeUsers;

  const roleMap = new Map<string, number>();
  users.forEach((user) => {
    roleMap.set(user.role.name, (roleMap.get(user.role.name) ?? 0) + 1);
  });
  const roleDistribution = Array.from(roleMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const serviceUsage = serviceTypes
    .map((serviceType) => ({ label: serviceType.name, value: serviceType.applications.length }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const months = buildRecentMonths(6);
  const applicationTrend = groupDatesByLabel(
    applications.filter((application) => application.submittedAt).map((application) => application.submittedAt as Date),
    months,
    formatShortMonth
  );

  const missingFields = serviceTypes.filter((serviceType) => serviceType.formFields.length === 0).length;
  const missingRequirements = serviceTypes.filter((serviceType) => serviceType.documentRequirements.length === 0).length;
  const inactiveServices = serviceTypes.filter((serviceType) => !serviceType.isActive).length;

  return (
    <section className="space-y-6">
      <PageHeader title="Admin Dashboard" description="Executive governance cockpit for adoption, controls, and compliance posture." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Users" value={users.length} delta={`Active ${activeUsers} / Inactive ${inactiveUsers}`} />
        <MetricCard title="Companies Onboarded" value={companies} delta="Registered organizations on platform" />
        <MetricCard title="Applications Processed" value={applications.length} delta="Total lifecycle records in the system" />
        <MetricCard title="Audit Events" value={auditCount} delta="Immutable governance trail entries" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 shadow-sm">
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">User population by governance role.</p>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={roleDistribution} />
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 shadow-sm">
          <CardHeader>
            <CardTitle>Top Used Services</CardTitle>
            <p className="text-sm text-muted-foreground">Most adopted services by application volume.</p>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={serviceUsage} />
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Governance Summary</CardTitle>
              <p className="text-sm text-muted-foreground">Configuration and compliance health indicators.</p>
            </div>
            <Link href="/admin/services">
              <Button>Review Config</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="rounded-lg border border-slate-200 bg-white/80 p-3">Service types configured: <strong>{serviceTypes.length}</strong></div>
            <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-3">Missing form fields: <strong>{missingFields}</strong></div>
            <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-3">Missing document requirements: <strong>{missingRequirements}</strong></div>
            <div className="rounded-lg border border-slate-200 bg-white/80 p-3">Inactive service types: <strong>{inactiveServices}</strong></div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3">Notifications logged: <strong>{notifications}</strong></div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3">Email simulation logs: <strong>{emailLogCount}</strong></div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 shadow-sm">
        <CardHeader>
          <CardTitle>Submitted Applications Trend (6 months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ColumnTrendChart data={applicationTrend} />
        </CardContent>
      </Card>

      <DataTableShell
        title="Recent Audit & Compliance Activity"
        columns={["Timestamp", "Actor", "Action", "Entity"]}
        rows={recentLogs.map((log) => [
          new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(log.createdAt),
          log.actor?.fullName ?? "System",
          compactStateLabel(log.action),
          log.entityType
        ])}
        emptyTitle="No audit events yet"
        emptyDescription="Administrative activity logs will appear here once actions are performed."
      />
    </section>
  );
}
