import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePortalUser } from "@/lib/portal-application";
import { prisma } from "@/lib/prisma";

function getStateTone(state: string): "default" | "success" | "warning" | "danger" | "info" {
  if (state === "APPROVED") return "success";
  if (state === "REJECTED") return "danger";
  if (state === "CLARIFICATION_REQUIRED") return "warning";
  if (state === "IN_REVIEW" || state === "SUBMITTED") return "info";
  return "default";
}

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePortalUser();
  const { id } = params;

  const application = await prisma.application.findFirst({
    where: { id, companyId: user.companyId ?? "" },
    include: {
      serviceType: true,
      company: true,
      submittedBy: true,
      formEntries: true
    }
  });

  if (!application) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <PageHeader title={`Application ${application.referenceNo}`} description="Review the submitted or draft application details." />

      <Card>
        <CardHeader>
          <CardTitle>Application Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <p><span className="font-medium">Reference:</span> {application.referenceNo}</p>
          <p><span className="font-medium">Service:</span> {application.serviceType.name}</p>
          <p>
            <span className="font-medium">Status:</span>{" "}
            <StatusBadge label={application.state} tone={getStateTone(application.state)} />
          </p>
          <p><span className="font-medium">Company:</span> {application.company.name}</p>
          <p><span className="font-medium">Submitted By:</span> {application.submittedBy.fullName}</p>
          <p>
            <span className="font-medium">Submitted At:</span>{" "}
            {application.submittedAt
              ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(application.submittedAt)
              : "Not submitted yet"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {application.formEntries.length ? (
            application.formEntries.map((entry) => (
              <div key={entry.id}>
                <p className="font-medium text-slate-900">{entry.fieldLabel}</p>
                <p className="text-slate-700">{entry.value || "-"}</p>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No form values saved yet.</p>
          )}
        </CardContent>
      </Card>

      {application.state === "DRAFT" ? (
        <div>
          <Link href={`/portal/applications/${application.id}/edit`}>
            <Button>Edit Draft</Button>
          </Link>
        </div>
      ) : null}
    </section>
  );
}
