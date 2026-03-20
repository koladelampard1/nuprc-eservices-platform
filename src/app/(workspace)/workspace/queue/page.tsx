import Link from "next/link";

import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPaymentStatusTone, isPaymentRequired } from "@/lib/payment";
import { prisma } from "@/lib/prisma";
import { stateToneMap } from "@/lib/workspace-review";

export default async function WorkspaceQueuePage() {
  const queueItems = await prisma.application.findMany({
    where: { state: { in: ["SUBMITTED", "IN_REVIEW"] } },
    include: {
      company: true,
      serviceType: true,
      paymentReferences: {
        orderBy: { referenceNo: "desc" },
        take: 1
      }
    },
    orderBy: { submittedAt: "desc" }
  });

  return (
    <section className="space-y-6">
      <PageHeader
        title="Reviewer Dashboard"
        description="View submitted applications, inspect details, and perform reviewer actions."
      />

      <Card>
        <CardHeader>
          <CardTitle>Applications Awaiting Review</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference Number</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Submission Date</TableHead>
                <TableHead>Current State</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queueItems.length ? (
                queueItems.map((item) => {
                  const latestPayment = item.paymentReferences[0] ?? null;
                  const paymentRequired = isPaymentRequired(item.serviceType.baseFeeNgn);

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.referenceNo}</TableCell>
                      <TableCell>{item.company.name}</TableCell>
                      <TableCell>{item.serviceType.name}</TableCell>
                      <TableCell>
                        {item.submittedAt
                          ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(item.submittedAt)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge label={item.state} tone={stateToneMap[item.state]} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={latestPayment?.status ?? (paymentRequired ? "NOT_STARTED" : "NOT_REQUIRED")}
                          tone={latestPayment ? getPaymentStatusTone(latestPayment.status) : paymentRequired ? "default" : "success"}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link className="text-sm font-medium text-primary hover:underline" href={`/workspace/queue/${item.id}`}>
                          View application
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={7}>
                    No submitted applications are currently awaiting review.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
