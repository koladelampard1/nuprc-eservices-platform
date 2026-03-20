import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DOCUMENT_UPLOAD_POLICY, computeLatestUploadsByRequirement } from "@/lib/application-document";
import { requirePortalUser } from "@/lib/portal-application";
import { prisma } from "@/lib/prisma";

import { uploadApplicationDocumentAction } from "./document-actions";

function getStateTone(state: string): "default" | "success" | "warning" | "danger" | "info" {
  if (state === "APPROVED") return "success";
  if (state === "REJECTED") return "danger";
  if (state === "CLARIFICATION_REQUIRED") return "warning";
  if (state === "IN_REVIEW" || state === "SUBMITTED") return "info";
  return "default";
}

export default async function ApplicationDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { uploaded?: string; uploadError?: string };
}) {
  const user = await requirePortalUser();
  const { id } = params;

  const application = await prisma.application.findFirst({
    where: { id, companyId: user.companyId ?? "" },
    include: {
      company: true,
      submittedBy: true,
      formEntries: true,
      documents: {
        orderBy: { uploadedAt: "desc" }
      },
      serviceType: {
        include: {
          documentRequirements: {
            where: { isRequired: true },
            orderBy: { sortOrder: "asc" }
          }
        }
      }
    }
  });

  if (!application) {
    notFound();
  }

  const latestUploadsByRequirement = computeLatestUploadsByRequirement(
    application.serviceType.documentRequirements,
    application.documents
  );

  const uploadedRequirements = application.serviceType.documentRequirements.filter(
    (requirement) => latestUploadsByRequirement[requirement.id]
  ).length;
  const totalRequirements = application.serviceType.documentRequirements.length;
  const isChecklistComplete = totalRequirements > 0 && uploadedRequirements === totalRequirements;

  return (
    <section className="space-y-6">
      <PageHeader title={`Application ${application.referenceNo}`} description="Review the submitted or draft application details." />

      {searchParams.uploaded ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Document uploaded successfully.
        </p>
      ) : null}

      {searchParams.uploadError ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {decodeURIComponent(searchParams.uploadError)}
        </p>
      ) : null}

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

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Required Documents</CardTitle>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <p className="text-slate-700">
              {uploadedRequirements} of {totalRequirements} required documents uploaded
            </p>
            <StatusBadge
              label={isChecklistComplete ? "Complete" : "Incomplete"}
              tone={isChecklistComplete ? "success" : "warning"}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Allowed file types: {DOCUMENT_UPLOAD_POLICY.allowedExtensions.join(", ").toUpperCase()} • Max size: {DOCUMENT_UPLOAD_POLICY.maxFileSizeMb}MB
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {application.serviceType.documentRequirements.length ? (
            application.serviceType.documentRequirements.map((requirement) => {
              const latestUpload = latestUploadsByRequirement[requirement.id];
              const uploadAction = uploadApplicationDocumentAction.bind(null, {
                applicationId: application.id,
                requirementId: requirement.id
              });

              return (
                <div key={requirement.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-slate-900">{requirement.name}</p>
                      <p>
                        <span className="text-slate-600">Status: </span>
                        <StatusBadge
                          label={latestUpload ? "Uploaded" : "Missing"}
                          tone={latestUpload ? "success" : "warning"}
                        />
                      </p>
                      <p className="text-slate-700">
                        Latest file: {latestUpload ? latestUpload.fileName : "-"}
                      </p>
                      <p className="text-slate-700">
                        Uploaded date:{" "}
                        {latestUpload
                          ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(
                              latestUpload.uploadedAt
                            )
                          : "-"}
                      </p>
                      {latestUpload ? (
                        <Link
                          href={`/api/portal/applications/${application.id}/documents/${latestUpload.id}`}
                          className="inline-block text-xs text-primary hover:underline"
                          target="_blank"
                        >
                          View latest upload
                        </Link>
                      ) : null}
                    </div>

                    {application.state === "DRAFT" ? (
                      <form action={uploadAction} className="flex min-w-[240px] flex-col gap-2">
                        <input
                          type="file"
                          name="document"
                          accept=".pdf,.doc,.docx"
                          required
                          className="block w-full rounded-md border border-border px-3 py-2 text-xs"
                        />
                        <Button type="submit" size="sm" variant="outline">
                          {latestUpload ? "Replace" : "Upload"}
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-muted-foreground">No required documents configured for this service.</p>
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
