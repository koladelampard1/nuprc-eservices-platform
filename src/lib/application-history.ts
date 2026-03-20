import { DecisionType, ReviewActionType } from "@prisma/client";

import { deriveGeneratedAtFromReference } from "@/lib/payment";
import { actionLabelMap } from "@/lib/workspace-review";

export type TimelineEvent = {
  id: string;
  at: Date;
  title: string;
  detail: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
};

type HistorySource = {
  createdAt: Date;
  submittedAt: Date | null;
  workflowTransitions: Array<{
    id: string;
    fromState: string;
    toState: string;
    transitionedAt: Date;
    actor: { fullName: string };
    comment: string | null;
  }>;
  reviewActions: Array<{
    id: string;
    actionType: ReviewActionType;
    createdAt: Date;
    note: string | null;
    reviewer: { fullName: string };
  }>;
  clarificationRequests: Array<{
    id: string;
    createdAt: Date;
    message: string;
    respondedAt: Date | null;
  }>;
  paymentReferences: Array<{
    id: string;
    referenceNo: string;
    status: string;
    paidAt: Date | null;
  }>;
  decisionLetters: Array<{
    id: string;
    decisionType: DecisionType;
    issuedAt: Date;
    letterRef: string;
  }>;
};

export function buildApplicationTimeline(history: HistorySource): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: "draft-created",
      at: history.createdAt,
      title: "Draft created",
      detail: "Application draft initialized.",
      tone: "default"
    }
  ];

  if (history.submittedAt) {
    events.push({
      id: "submitted",
      at: history.submittedAt,
      title: "Application submitted",
      detail: "Application moved into the regulatory queue.",
      tone: "info"
    });
  }

  history.paymentReferences.forEach((reference) => {
    const generatedAt = deriveGeneratedAtFromReference(reference.referenceNo);
    if (generatedAt) {
      events.push({
        id: `payment-generated-${reference.id}`,
        at: generatedAt,
        title: "Payment reference generated",
        detail: `${reference.referenceNo} created (${reference.status}).`,
        tone: "info"
      });
    }

    if (reference.paidAt) {
      events.push({
        id: `payment-paid-${reference.id}`,
        at: reference.paidAt,
        title: "Payment marked paid",
        detail: `${reference.referenceNo} settled successfully.`,
        tone: "success"
      });
    }
  });

  history.workflowTransitions.forEach((transition) => {
    events.push({
      id: `wf-${transition.id}`,
      at: transition.transitionedAt,
      title: `Workflow update: ${transition.fromState} → ${transition.toState}`,
      detail: `${transition.actor.fullName}${transition.comment ? ` • ${transition.comment}` : ""}`,
      tone: "default"
    });

    if (transition.toState === "IN_REVIEW") {
      events.push({
        id: `review-started-${transition.id}`,
        at: transition.transitionedAt,
        title: "Review started",
        detail: `Review commenced by ${transition.actor.fullName}.`,
        tone: "info"
      });
    }
  });

  history.reviewActions.forEach((action) => {
    if (action.actionType === "COMMENTED") {
      return;
    }

    events.push({
      id: `review-action-${action.id}`,
      at: action.createdAt,
      title: actionLabelMap[action.actionType],
      detail: `${action.reviewer.fullName}${action.note ? ` • ${action.note}` : ""}`,
      tone: action.actionType.includes("REJECTION") ? "danger" : action.actionType.includes("APPROVAL") ? "success" : "info"
    });
  });

  history.clarificationRequests.forEach((request) => {
    events.push({
      id: `clarification-request-${request.id}`,
      at: request.createdAt,
      title: "Clarification requested",
      detail: request.message,
      tone: "warning"
    });

    if (request.respondedAt) {
      events.push({
        id: `clarification-response-${request.id}`,
        at: request.respondedAt,
        title: "Clarification responded",
        detail: "Operator response received.",
        tone: "success"
      });
    }
  });

  history.decisionLetters.forEach((letter) => {
    events.push({
      id: `decision-${letter.id}`,
      at: letter.issuedAt,
      title: letter.decisionType === "APPROVAL" ? "Final approval" : "Final rejection",
      detail: `Decision letter issued (${letter.letterRef}).`,
      tone: letter.decisionType === "APPROVAL" ? "success" : "danger"
    });

    events.push({
      id: `decision-letter-${letter.id}`,
      at: letter.issuedAt,
      title: "Decision letter available",
      detail: `${letter.decisionType} letter published for download.`,
      tone: "info"
    });
  });

  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}
