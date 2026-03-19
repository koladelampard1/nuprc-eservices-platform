import { DataTableShell } from "@/components/app/data-table-shell";
import { PageHeader } from "@/components/app/page-header";
import { prisma } from "@/lib/prisma";

export default async function AdminAuditPage() {
  const logs = await prisma.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  return (
    <section className="space-y-6">
      <PageHeader title="Audit Log" description="Immutable system activity timeline for governance and traceability." />
      <DataTableShell
        title="Recent Events"
        columns={["When", "Actor", "Action", "Entity"]}
        rows={logs.map((log) => [
          new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(log.createdAt),
          log.actor?.fullName ?? "System",
          log.action,
          `${log.entityType} (${log.entityId})`
        ])}
      />
    </section>
  );
}
