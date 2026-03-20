import Link from "next/link";
import { ApplicationState } from "@prisma/client";

import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPaymentStatusTone, isPaymentRequired } from "@/lib/payment";
import { prisma } from "@/lib/prisma";
import { getQueueUrgency, getQueueUrgencyLabel, getQueueUrgencyTone } from "@/lib/workspace-queue";
import { stateToneMap } from "@/lib/workspace-review";

const queueStates: ApplicationState[] = ["SUBMITTED", "IN_REVIEW", "CLARIFICATION_REQUIRED"];

export default async function WorkspaceQueuePage({
  searchParams
}: {
  searchParams: {
    state?: string;
    serviceType?: string;
    q?: string;
    sort?: string;
  };
}) {
  const selectedState: ApplicationState | "ALL" = queueStates.includes(searchParams.state as ApplicationState)
    ? (searchParams.state as ApplicationState)
    : "ALL";
  const selectedServiceType = searchParams.serviceType?.trim() || "ALL";
  const queryText = searchParams.q?.trim() || "";
  const sortOrder = searchParams.sort === "oldest" ? "oldest" : "newest";

  const [serviceTypes, queueItems] = await Promise.all([
    prisma.serviceType.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.application.findMany({
      where: {
        AND: [
          { state: { in: queueStates } },
          selectedState === "ALL" ? {} : { state: selectedState },
          selectedServiceType === "ALL" ? {} : { serviceTypeId: selectedServiceType },
          queryText
            ? {
                OR: [
                  { referenceNo: { contains: queryText } },
                  { company: { name: { contains: queryText } } }
                ]
              }
            : {}
        ]
      },
      include: {
        company: true,
        serviceType: true,
        clarificationRequests: {
          where: { respondedAt: null },
          select: { id: true }
        },
        paymentReferences: {
          orderBy: { referenceNo: "desc" },
          take: 1
        }
      },
      orderBy: { submittedAt: sortOrder === "oldest" ? "asc" : "desc" }
    })
  ]);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Reviewer Dashboard"
        description="View submitted applications, inspect details, and perform reviewer actions."
      />

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle>Applications Awaiting Review</CardTitle>
          <form className="grid gap-3 md:grid-cols-6">
            <select
              name="state"
              defaultValue={selectedState}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="ALL">All states</option>
              {queueStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>

            <select
              name="serviceType"
              defaultValue={selectedServiceType}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="ALL">All services</option>
              {serviceTypes.map((serviceType) => (
                <option key={serviceType.id} value={serviceType.id}>
                  {serviceType.name}
                </option>
              ))}
            </select>

            <Input
              name="q"
              defaultValue={queryText}
              placeholder="Search reference or company"
              className="md:col-span-2"
            />

            <select
              name="sort"
              defaultValue={sortOrder}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <Button type="submit" variant="outline">Apply</Button>
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference Number</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Submission Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queueItems.length ? (
                queueItems.map((item) => {
                  const latestPayment = item.paymentReferences[0] ?? null;
                  const paymentRequired = isPaymentRequired(item.serviceType.baseFeeNgn);
                  const hasPendingClarification = item.clarificationRequests.length > 0;
                  const urgency = getQueueUrgency(item.state, item.submittedAt);

                  return (
                    <TableRow
                      key={item.id}
                      className={hasPendingClarification ? "bg-amber-50/60" : undefined}
                    >
                      <TableCell className="font-medium">{item.referenceNo}</TableCell>
                      <TableCell>{item.company.name}</TableCell>
                      <TableCell>{item.serviceType.name}</TableCell>
                      <TableCell>
                        {item.submittedAt
                          ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(item.submittedAt)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge label={item.state} tone={stateToneMap[item.state]} />
                          {hasPendingClarification ? <StatusBadge label="Clarification Required" tone="warning" /> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={latestPayment?.status ?? (paymentRequired ? "NOT_STARTED" : "NOT_REQUIRED")}
                          tone={latestPayment ? getPaymentStatusTone(latestPayment.status) : paymentRequired ? "default" : "success"}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={getQueueUrgencyLabel(urgency)}
                          tone={getQueueUrgencyTone(urgency)}
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
                  <TableCell className="text-muted-foreground" colSpan={8}>
                    No applications matched the current filters.
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
