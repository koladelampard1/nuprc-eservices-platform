import Link from "next/link";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePortalUser } from "@/lib/portal-application";
import { prisma } from "@/lib/prisma";

function getStateTone(state: string): "default" | "success" | "warning" | "danger" | "info" {
  if (state === "APPROVED") return "success";
  if (state === "REJECTED") return "danger";
  if (state === "CLARIFICATION_REQUIRED") return "warning";
  if (state === "IN_REVIEW" || state === "SUBMITTED") return "info";
  return "default";
}

export default async function PortalApplicationsPage() {
  const user = await requirePortalUser();
  const applications = await prisma.application.findMany({
    where: { companyId: user.companyId ?? "" },
    include: { serviceType: true },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <section className="space-y-6">
      <PageHeader title="Applications" description="Track and manage draft and submitted applications for your company." />
      <div>
        <Link href="/portal/services">
          <Button size="sm">Start New Application</Button>
        </Link>
      </div>

      {applications.length ? (
        <Card>
          <CardHeader>
            <CardTitle>My Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated / Submitted</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell className="font-medium">{application.referenceNo}</TableCell>
                    <TableCell>{application.serviceType.name}</TableCell>
                    <TableCell>
                      <StatusBadge label={application.state} tone={getStateTone(application.state)} />
                    </TableCell>
                    <TableCell>
                      {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(
                        application.submittedAt ?? application.updatedAt
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/portal/applications/${application.id}`} className="text-sm font-medium text-primary hover:underline">
                        Open details
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState title="No applications yet" description="Start a service application to create your first draft." />
      )}
    </section>
  );
}
