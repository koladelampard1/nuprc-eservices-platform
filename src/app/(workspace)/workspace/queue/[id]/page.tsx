import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  computeLatestUploadsByRequirement,
  getMissingRequiredDocuments
} from "@/lib/application-document";
import { prisma } from "@/lib/prisma";
import { actionLabelMap, canTransitionToFinalState, requireWorkspaceUser, stateToneMap } from "@/lib/workspace-review";

import {
  addCommentAction,
  finalApprovalAction,
  finalRejectionAction,
  recommendApprovalAction,
  recommendRejectionAction,
  requestClarificationAction
} from "./actions";

export default async function ReviewerApplicationDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { success?: string; error?: string };
}) {
  const user = await requireWorkspaceUser();

  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      submittedBy: true,
      decisionLetters: {
        select: {
          id: true,
          decisionType: true,
          letterRef: true,
          issuedAt: true
        },
        orderBy: { issuedAt: "desc" }
      },
      serviceType: {
        include: {
          documentRequirements: {
            where: { isRequired: true },
            orderBy: { sortOrder: "asc" }
          }
        }
      },
      formEntries: true,
      documents: {
        orderBy: { uploadedAt: "desc" }
      },
      reviewActions: {
        include: { reviewer: true },
        orderBy: { createdAt: "desc" }
      },
      workflowTransitions: {
        include: { actor: true },
        orderBy: { transitionedAt: "desc" }
      },
      clarificationRequests: {
        include: { requestedBy: true },
        orderBy: { createdAt: "desc" }
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

  const isDirector = canTransitionToFinalState(user.roleCode);
  const uploadedRequirements = application.serviceType.documentRequirements.filter(
    (requirement) => latestUploadsByRequirement[requirement.id]
  ).length;
  const totalRequirements = application.serviceType.documentRequirements.length;
  const canReview = ["SUBMITTED", "IN_REVIEW", "CLARIFICATION_REQUIRED"].includes(application.state);

  const hasAcknowledgementLetter = application.state !== "DRAFT";
  const approvalLetter = application.decisionLetters.find((letter) => letter.decisionType === "APPROVAL");
  const rejectionLetter = application.decisionLetters.find((letter) => letter.decisionType === "REJECTION");

  const commentAction = addCommentAction.bind(null, application.id);
  const clarificationAction = requestClarificationAction.bind(null, application.id);
  const recommendationApprovalAction = recommendApprovalAction.bind(null, application.id);
  const recommendationRejectionAction = recommendRejectionAction.bind(null, application.id);
  const directorFinalApprovalAction = finalApprovalAction.bind(null, application.id);
  const directorFinalRejectionAction = finalRejectionAction.bind(null, application.id);

  return (
    <section className="space-y-6">
      <PageHeader
        title={`Review Application ${application.referenceNo}`}
        description="Inspect full submission details, evaluate evidence, and capture review decisions."
      />

      {searchParams.success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {decodeURIComponent(searchParams.success)}
        </p>
      ) : null}

      {searchParams.error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {decodeURIComponent(searchParams.error)}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Application Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <p><span className="font-medium">Reference:</span> {application.referenceNo}</p>
          <p><span className="font-medium">Company:</span> {application.company.name}</p>
          <p><span className="font-medium">Service Type:</span> {application.serviceType.name}</p>
          <p>
            <span className="font-medium">Current State:</span>{" "}
            <StatusBadge label={application.state} tone={stateToneMap[application.state]} />
          </p>
          <p><span className="font-medium">Submitted By:</span> {application.submittedBy.fullName}</p>
          <p>
            <span className="font-medium">Submission Date:</span>{" "}
            {application.submittedAt
              ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(application.submittedAt)
              : "-"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submitted Form Entries</CardTitle>
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
            <p className="text-muted-foreground">No form entries were submitted.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-700">Completeness:</span>
            <StatusBadge
              label={`${uploadedRequirements}/${totalRequirements} required documents uploaded`}
              tone={missingRequiredDocuments.length ? "warning" : "success"}
            />
          </div>

          {missingRequiredDocuments.length ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Missing required documents: {missingRequiredDocuments.join(", ")}.
            </p>
          ) : null}

          {application.serviceType.documentRequirements.length ? (
            application.serviceType.documentRequirements.map((requirement) => {
              const latestUpload = latestUploadsByRequirement[requirement.id];
              return (
                <div key={requirement.id} className="rounded-lg border p-4">
                  <p className="font-medium text-slate-900">{requirement.name}</p>
                  <p className="mt-1">
                    <span className="text-slate-600">Status: </span>
                    <StatusBadge label={latestUpload ? "Uploaded" : "Missing"} tone={latestUpload ? "success" : "warning"} />
                  </p>
                  {latestUpload ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-slate-700">Latest File: {latestUpload.fileName}</p>
                      <p className="text-slate-700">
                        Uploaded At:{" "}
                        {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(latestUpload.uploadedAt)}
                      </p>
                      <Link
                        href={`/api/workspace/applications/${application.id}/documents/${latestUpload.id}`}
                        target="_blank"
                        className="inline-block text-xs text-primary hover:underline"
                      >
                        View / Download
                      </Link>
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <p className="text-muted-foreground">No required documents are configured for this service.</p>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Official Letters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-3">
            {hasAcknowledgementLetter ? (
              <Link href={`/api/workspace/applications/${application.id}/letters/acknowledgement`} target="_blank">
                <Button variant="outline">Download Acknowledgement</Button>
              </Link>
            ) : null}

            {approvalLetter ? (
              <Link href={`/api/workspace/applications/${application.id}/letters/approval`} target="_blank">
                <Button>Download Approval Letter</Button>
              </Link>
            ) : null}

            {rejectionLetter ? (
              <Link href={`/api/workspace/applications/${application.id}/letters/rejection`} target="_blank">
                <Button variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-50">Download Rejection Letter</Button>
              </Link>
            ) : null}
          </div>

          {approvalLetter ? (
            <p className="text-xs text-muted-foreground">
              Approval Ref: {approvalLetter.letterRef} • Issued {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(approvalLetter.issuedAt)}
            </p>
          ) : null}

          {rejectionLetter ? (
            <p className="text-xs text-muted-foreground">
              Rejection Ref: {rejectionLetter.letterRef} • Issued {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(rejectionLetter.issuedAt)}
            </p>
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
                    <p className="font-medium text-emerald-900">Operator Response</p>
                    <p className="text-emerald-900">{request.response}</p>
                    {request.respondedAt ? (
                      <p className="text-xs text-emerald-800">
                        Responded: {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(request.respondedAt)}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700">Awaiting operator response.</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No clarification requests yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {canReview ? (
            <>
              <form action={commentAction} className="space-y-2 rounded-lg border p-4">
                <p className="text-sm font-medium">Add Comment</p>
                <textarea
                  name="note"
                  required
                  className="min-h-20 w-full rounded-md border border-border px-3 py-2 text-sm"
                  placeholder="Enter review comment"
                />
                <Button type="submit" size="sm" variant="outline">Save Comment</Button>
              </form>

              <div className="grid gap-4 md:grid-cols-2">
                <form action={clarificationAction} className="space-y-2 rounded-lg border p-4">
                  <p className="text-sm font-medium">Request Clarification</p>
                  <textarea
                    name="note"
                    required
                    className="min-h-20 w-full rounded-md border border-border px-3 py-2 text-sm"
                    placeholder="Specify clarification request"
                  />
                  <Button type="submit" size="sm" variant="outline">Request Clarification</Button>
                </form>

                <form action={recommendationApprovalAction} className="space-y-2 rounded-lg border p-4">
                  <p className="text-sm font-medium">Recommend Approval</p>
                  <textarea
                    name="note"
                    className="min-h-20 w-full rounded-md border border-border px-3 py-2 text-sm"
                    placeholder="Optional comment"
                  />
                  <Button type="submit" size="sm">Recommend Approval</Button>
                </form>
              </div>

              <form action={recommendationRejectionAction} className="space-y-2 rounded-lg border p-4">
                <p className="text-sm font-medium">Recommend Rejection</p>
                <textarea
                  name="note"
                  required
                  className="min-h-20 w-full rounded-md border border-border px-3 py-2 text-sm"
                  placeholder="State reason for rejection recommendation"
                />
                <Button type="submit" size="sm" variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-50">Recommend Rejection</Button>
              </form>

              {isDirector ? (
                <div className="grid gap-4 rounded-lg border border-blue-200 bg-blue-50 p-4 md:grid-cols-2">
                  <form action={directorFinalApprovalAction} className="space-y-2 rounded-lg border bg-white p-4">
                    <p className="text-sm font-medium">Director: Final Approval</p>
                    <textarea
                      name="note"
                      className="min-h-20 w-full rounded-md border border-border px-3 py-2 text-sm"
                      placeholder="Optional final decision note"
                    />
                    <Button type="submit" size="sm">Final Approve</Button>
                  </form>

                  <form action={directorFinalRejectionAction} className="space-y-2 rounded-lg border bg-white p-4">
                    <p className="text-sm font-medium">Director: Final Rejection</p>
                    <textarea
                      name="note"
                      required
                      className="min-h-20 w-full rounded-md border border-border px-3 py-2 text-sm"
                      placeholder="Required reason for final rejection"
                    />
                    <Button type="submit" size="sm" variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-50">Final Reject</Button>
                  </form>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Review actions are unavailable because this application is already in a terminal state.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application Timeline / History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {application.workflowTransitions.length ? (
            application.workflowTransitions.map((transition) => (
              <div key={transition.id} className="rounded-md border p-3">
                <p className="font-medium">
                  {transition.fromState} → {transition.toState}
                </p>
                <p className="text-slate-700">Actor: {transition.actor.fullName}</p>
                <p className="text-slate-700">
                  Date:{" "}
                  {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(transition.transitionedAt)}
                </p>
                {transition.comment ? <p className="mt-1 text-slate-700">Comment: {transition.comment}</p> : null}
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No workflow transitions recorded yet.</p>
          )}

          <div className="pt-2">
            <p className="mb-2 text-sm font-medium">Review Action Log</p>
            {application.reviewActions.length ? (
              <div className="space-y-2">
                {application.reviewActions.map((action) => (
                  <div key={action.id} className="rounded-md border p-3">
                    <p className="font-medium">{actionLabelMap[action.actionType]}</p>
                    <p className="text-slate-700">Reviewer: {action.reviewer.fullName}</p>
                    <p className="text-slate-700">
                      Date: {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(action.createdAt)}
                    </p>
                    {action.note ? <p className="mt-1 text-slate-700">Note: {action.note}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No review actions captured yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
