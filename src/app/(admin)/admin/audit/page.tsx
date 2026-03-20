import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";

function formatAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatEntity(entityType: string) {
  return `${entityType.replaceAll("_", " ")}`;
}

function formatEventDetail(action: string, entityType: string, metadata: unknown) {
  const formattedAction = formatAction(action);
  const formattedEntity = formatEntity(entityType);

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return `${formattedAction} on ${formattedEntity.toLowerCase()}.`;
  }

  const entries = Object.entries(metadata as Record<string, unknown>)
    .filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    .slice(0, 3)
    .map(([key, value]) => `${formatAction(key)}: ${String(value)}`);

  if (!entries.length) {
    return `${formattedAction} on ${formattedEntity.toLowerCase()}.`;
  }

  return `${formattedAction} on ${formattedEntity.toLowerCase()} • ${entries.join(" • ")}`;
}

export default async function AdminAuditPage({
  searchParams
}: {
  searchParams: { action?: string; entityType?: string; q?: string };
}) {
  const selectedAction = searchParams.action?.trim() || "ALL";
  const selectedEntity = searchParams.entityType?.trim() || "ALL";
  const search = searchParams.q?.trim() || "";

  const [actions, entities, logs] = await Promise.all([
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    prisma.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } }),
    prisma.auditLog.findMany({
      where: {
        AND: [
          selectedAction === "ALL" ? {} : { action: selectedAction },
          selectedEntity === "ALL" ? {} : { entityType: selectedEntity },
          search ? { OR: [{ entityId: { contains: search } }, { action: { contains: search } }] } : {}
        ]
      },
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 150
    })
  ]);

  return (
    <section className="space-y-6">
      <PageHeader title="Audit Log" description="Immutable governance event trail with actor, action, entity, and event context." />

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle>System Activity</CardTitle>
          <form className="grid gap-3 md:grid-cols-5">
            <select name="action" defaultValue={selectedAction} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="ALL">All actions</option>
              {actions.map((entry) => <option key={entry.action} value={entry.action}>{formatAction(entry.action)}</option>)}
            </select>
            <select name="entityType" defaultValue={selectedEntity} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="ALL">All entities</option>
              {entities.map((entry) => <option key={entry.entityType} value={entry.entityType}>{entry.entityType}</option>)}
            </select>
            <Input name="q" defaultValue={search} placeholder="Search action or entity id" className="md:col-span-2" />
            <Button type="submit" variant="outline">Apply</Button>
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length ? (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.actor?.fullName ?? "System"}</TableCell>
                    <TableCell>
                      <StatusBadge tone="info" label={formatAction(log.action)} />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{formatEntity(log.entityType)}</p>
                      <p className="font-mono text-xs text-muted-foreground">{log.entityId}</p>
                    </TableCell>
                    <TableCell className="max-w-lg text-sm text-slate-700">{formatEventDetail(log.action, log.entityType, log.metadata)}</TableCell>
                    <TableCell>{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(log.createdAt)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">No audit entries matched the selected filters.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
