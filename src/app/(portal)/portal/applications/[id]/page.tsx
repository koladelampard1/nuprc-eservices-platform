import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deriveGeneratedAtFromReference, formatNaira, getPaymentStatusTone, isPaymentRequired } from "@/lib/payment";
import {
  DOCUMENT_UPLOAD_POLICY,
  computeLatestUploadsByRequirement,
  getMissingRequiredDocuments
} from "@/lib/application-document";
import { requirePortalUser } from "@/lib/portal-application";
import { prisma } from "@/lib/prisma";

import { uploadApplicationDocumentAction } from "./document-actions";
import { respondToClarificationAction } from "./clarification-actions";
import { generatePaymentReferenceAction, markPaymentStatusAction } from "./payment-actions";
import { submitDraftFromDetailAction } from "./submit-action";

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
    searchParams: {
    uploaded?: string;
    uploadError?: string;
    saved?: string;
    submitted?: string;
    submitStatus?: string;
    submitError?: string;
      clarificationResponded?: string;
      paymentGenerated?: string;
      paymentPaid?: string;
      paymentFailed?: string;
      payError?: string;
    };
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
      clarificationRequests: {
        include: { requestedBy: true },
        orderBy: { createdAt: "desc" }
      },
      decisionLetters: {
        select: {
          decisionType: true
        }
      },
      serviceType: {
        include: {
          documentRequirements: {
            where: { isRequired: true },
            orderBy: { sortOrder: "asc" }
          }
        }
      },
      paymentReferences: {
        orderBy: { referenceNo: "desc" }
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

  const missingRequiredDocuments = await prisma.$transaction((tx) =>
    getMissingRequiredDocuments(tx, application.id, application.serviceType.id)
  );

  const uploadedRequirements = application.serviceType.documentRequirements.filter(
    (requirement) => latestUploadsByRequirement[requirement.id]
  ).length;
  const totalRequirements = application.serviceType.documentRequirements.length;
  const isChecklistComplete = totalRequirements === 0 || uploadedRequirements === totalRequirements;
  const canEditDraft = application.state === "DRAFT";
  const paymentRequired = isPaymentRequired(application.serviceType.baseFeeNgn);
  const latestPaymentReference = application.paymentReferences[0] ?? null;
  const isPaymentComplete = !paymentRequired || latestPaymentReference?.status === "PAID";
  const canSubmitApplication = canEditDraft && missingRequiredDocuments.length === 0 && isPaymentComplete;
  const submitAction = submitDraftFromDetailAction.bind(null, application.id);
  const generatePaymentAction = generatePaymentReferenceAction.bind(null, application.id);
  const markPaidAction = markPaymentStatusAction.bind(null, application.id, "PAID");
  const markFailedAction = markPaymentStatusAction.bind(null, application.id, "FAILED");
  const respondAction = respondToClarificationAction.bind(null, application.id);
  const hasUnresolvedClarification = application.clarificationRequests.some((request) => !request.respondedAt);

  const hasAcknowledgementLetter = application.state !== "DRAFT";
  const hasApprovalLetter = application.state === "APPROVED" && application.decisionLetters.some((letter) => letter.decisionType === "APPROVAL");
  const hasRejectionLetter = application.state === "REJECTED" && application.decisionLetters.some((letter) => letter.decisionType === "REJECTION");

  return (
    <section className="space-y-6">
      <PageHeader title={`Application ${application.referenceNo}`} description="Review the submitted or draft application details." />

      {searchParams.uploaded ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Document uploaded successfully.
        </p>
      ) : null}

      {searchParams.saved === "draft" ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Draft saved successfully.
        </p>
      ) : null}

      {searchParams.submitted === "true" ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Application submitted successfully.
        </p>
      ) : null}

      {searchParams.submitStatus === "deferred" ? (
        <p className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Draft saved. Complete required documents/payment before final submission.
        </p>
      ) : null}

      {searchParams.clarificationResponded === "true" ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Clarification response submitted successfully.
        </p>
      ) : null}

      {searchParams.paymentGenerated === "true" ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Demo payment reference generated successfully.
        </p>
      ) : null}

      {searchParams.paymentPaid === "true" ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Demo payment marked as PAID successfully. You can now submit this draft.
        </p>
      ) : null}

      {searchParams.paymentFailed === "true" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Demo payment marked as FAILED.
        </p>
      ) : null}

      {searchParams.uploadError ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {decodeURIComponent(searchParams.uploadError)}
        </p>
      ) : null}

      {searchParams.submitError ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {decodeURIComponent(searchParams.submitError)}
        </p>
      ) : null}

      {searchParams.payError ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {decodeURIComponent(searchParams.payError)}
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

      {application.state === "CLARIFICATION_REQUIRED" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Clarification Required: Please review reviewer feedback below and provide your response.
        </p>
      ) : null}


      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <p><span className="font-medium">Service Fee:</span> {formatNaira(application.serviceType.baseFeeNgn)}</p>
            <p>
              <span className="font-medium">Payment Required:</span>{" "}
              <StatusBadge label={paymentRequired ? "Yes" : "No"} tone={paymentRequired ? "warning" : "success"} />
            </p>
            <p><span className="font-medium">Reference:</span> {latestPaymentReference?.referenceNo ?? "Not generated yet"}</p>
            <p>
              <span className="font-medium">Status:</span>{" "}
              <StatusBadge
                label={latestPaymentReference?.status ?? (paymentRequired ? "NOT_STARTED" : "NOT_REQUIRED")}
                tone={latestPaymentReference ? getPaymentStatusTone(latestPaymentReference.status) : paymentRequired ? "default" : "success"}
              />
            </p>
            <p>
              <span className="font-medium">Generated Date:</span>{" "}
              {latestPaymentReference
                ? (() => {
                    const generatedAt = deriveGeneratedAtFromReference(latestPaymentReference.referenceNo);
                    return generatedAt
                      ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(generatedAt)
                      : "Derived date unavailable";
                  })()
                : "-"}
            </p>
            <p>
              <span className="font-medium">Paid Date:</span>{" "}
              {latestPaymentReference?.paidAt
                ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(latestPaymentReference.paidAt)
                : "-"}
            </p>
          </div>

          {paymentRequired && !isPaymentComplete ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Payment is required for this service. Complete the demo payment step before final submission.
            </p>
          ) : null}

          {canEditDraft && paymentRequired ? (
            <div className="flex flex-wrap gap-3">
              {!latestPaymentReference ? (
                <form action={generatePaymentAction}>
                  <Button type="submit" variant="outline">Generate Payment Reference</Button>
                </form>
              ) : null}

              {latestPaymentReference && latestPaymentReference.status !== "PAID" ? (
                <>
                  <form action={markPaidAction}>
                    <Button type="submit">Mark as Paid (Demo)</Button>
                  </form>
                  <form action={markFailedAction}>
                    <Button type="submit" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-50">
                      Mark as Failed (Demo)
                    </Button>
                  </form>
                </>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Official Letters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          {hasAcknowledgementLetter ? (
            <Link href={`/api/portal/applications/${application.id}/letters/acknowledgement`} target="_blank">
              <Button variant="outline">Download Acknowledgement</Button>
            </Link>
          ) : null}

          {hasApprovalLetter ? (
            <Link href={`/api/portal/applications/${application.id}/letters/approval`} target="_blank">
              <Button>Download Approval Letter</Button>
            </Link>
          ) : null}

          {hasRejectionLetter ? (
            <Link href={`/api/portal/applications/${application.id}/letters/rejection`} target="_blank">
              <Button variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-50">Download Rejection Letter</Button>
            </Link>
          ) : null}

          {!hasAcknowledgementLetter && !hasApprovalLetter && !hasRejectionLetter ? (
            <p className="text-muted-foreground">Letters become available once the application is submitted.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clarification Thread</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {application.clarificationRequests.length ? (
            application.clarificationRequests.map((request) => (
              <div key={request.id} className="space-y-2 rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">Reviewer: {request.requestedBy.fullName}</p>
                  <StatusBadge
                    label={request.respondedAt ? "Resolved" : "Unresolved"}
                    tone={request.respondedAt ? "success" : "warning"}
                  />
                </div>
                <p className="rounded-md bg-slate-50 px-3 py-2 text-slate-700">{request.message}</p>
                <p className="text-xs text-muted-foreground">
                  Requested: {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(request.createdAt)}
                </p>
                {request.response ? (
                  <div className="space-y-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <p className="font-medium text-emerald-900">Your Response</p>
                    <p className="text-emerald-900">{request.response}</p>
                    {request.respondedAt ? (
                      <p className="text-xs text-emerald-800">
                        Responded: {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(request.respondedAt)}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No clarification requests yet.</p>
          )}

          {application.state === "CLARIFICATION_REQUIRED" && hasUnresolvedClarification ? (
            <form action={respondAction} className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Respond to Clarification</p>
              <textarea
                name="response"
                required
                className="min-h-24 w-full rounded-md border border-border px-3 py-2 text-sm"
                placeholder="Provide clarification response to the reviewer"
              />
              <div className="grid gap-2 md:grid-cols-2">
                <select
                  name="requirementId"
                  defaultValue=""
                  className="rounded-md border border-border px-3 py-2 text-sm"
                >
                  <option value="">Select requirement (optional when no file)</option>
                  {application.serviceType.documentRequirements.map((requirement) => (
                    <option key={requirement.id} value={requirement.id}>
                      {requirement.name}
                    </option>
                  ))}
                </select>
                <input
                  type="file"
                  name="document"
                  accept=".pdf,.doc,.docx"
                  className="block w-full rounded-md border border-border px-3 py-2 text-xs"
                />
              </div>
              <Button type="submit" size="sm">Submit Clarification Response</Button>
            </form>
          ) : null}
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
          {application.state === "DRAFT" && !isChecklistComplete ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Submission is blocked until all required documents are uploaded.
            </p>
          ) : null}

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

      {canEditDraft ? (
        <div className="flex flex-wrap gap-3">
          <Link href={`/portal/applications/${application.id}/edit`}>
            <Button>Edit Draft</Button>
          </Link>
          {canSubmitApplication ? (
            <form action={submitAction}>
              <Button type="submit">Submit Application</Button>
            </form>
          ) : (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
              Final submission is available after all required documents are uploaded and payment is completed where applicable.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
