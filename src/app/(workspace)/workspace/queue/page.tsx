import { DataTableShell } from "@/components/app/data-table-shell";
import { PageHeader } from "@/components/app/page-header";
import { prisma } from "@/lib/prisma";

export default async function WorkspaceQueuePage() {
  const queueItems = await prisma.application.findMany({
    where: { state: { in: ["SUBMITTED", "IN_REVIEW", "CLARIFICATION_REQUIRED"] } },
    include: { company: true, assignedTo: true },
    orderBy: { updatedAt: "desc" },
    take: 10
  });

  return (
    <section className="space-y-6">
      <PageHeader title="Review Queue" description="Prioritized intake queue with ownership and stage context." />
      <DataTableShell
        title="Queue"
        columns={["Reference", "Company", "State", "Assignee"]}
        rows={queueItems.map((item) => [
          item.referenceNo,
          item.company.name,
          item.state,
          item.assignedTo?.fullName ?? "Unassigned"
        ])}
      />
    </section>
  );
}
