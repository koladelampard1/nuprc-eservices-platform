import Link from "next/link";

import { DataTableShell } from "@/components/app/data-table-shell";
import { MetricCard } from "@/components/app/metric-card";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [users, services, logs] = await Promise.all([
    prisma.user.count(),
    prisma.serviceType.count(),
    prisma.auditLog.count()
  ]);

  const recentLogs = await prisma.auditLog.findMany({
    take: 5,
    orderBy: { createdAt: "desc" }
  });

  return (
    <section className="space-y-6">
      <PageHeader title="Admin Dashboard" description="Govern access, service settings, and compliance visibility." />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Registered Users" value={users} delta="Identity coverage across platform roles" />
        <MetricCard title="Service Types" value={services} delta="Configured regulatory services available" />
        <MetricCard title="Audit Events" value={logs} delta="Trace records supporting compliance oversight" />
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Control Center</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Manage platform configuration in a controlled and auditable manner.</p>
          </div>
          <Link href="/admin/users">
            <Button>Manage Users</Button>
          </Link>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <p className="rounded-lg border bg-slate-50/70 p-3 text-slate-700">Enforce role governance and clean segregation of duties.</p>
          <p className="rounded-lg border bg-slate-50/70 p-3 text-slate-700">Maintain service catalogue quality and lifecycle controls.</p>
          <p className="rounded-lg border bg-slate-50/70 p-3 text-slate-700">Review audit events to preserve accountability and trust.</p>
        </CardContent>
      </Card>

      <DataTableShell
        title="Recent Audit Events"
        columns={["Timestamp", "Actor", "Action"]}
        rows={recentLogs.map((log) => [
          new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(log.createdAt),
          log.actorId ?? "System",
          log.action
        ])}
        emptyTitle="No audit events yet"
        emptyDescription="Administrative activity logs will appear here once actions are performed."
      />
    </section>
  );
}
