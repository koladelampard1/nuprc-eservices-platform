import { DecisionType, ReviewActionType } from "@prisma/client";

import { deriveGeneratedAtFromReference } from "@/lib/payment";
import { actionLabelMap } from "@/lib/workspace-review";

type TimelineEvent = {
  id: string;
  at: Date;
  title: string;
  detail: string;
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
      detail: "Application draft initialized."
    }
  ];

  if (history.submittedAt) {
    events.push({
      id: "submitted",
      at: history.submittedAt,
      title: "Application submitted",
      detail: "Application moved into the regulatory queue."
    });
  }

  history.paymentReferences.forEach((reference) => {
    const generatedAt = deriveGeneratedAtFromReference(reference.referenceNo);
    if (generatedAt) {
      events.push({
        id: `payment-generated-${reference.id}`,
        at: generatedAt,
        title: "Payment reference generated",
        detail: `${reference.referenceNo} created (${reference.status}).`
      });
    }

    if (reference.paidAt) {
      events.push({
        id: `payment-paid-${reference.id}`,
        at: reference.paidAt,
        title: "Payment marked paid",
        detail: `${reference.referenceNo} settled successfully.`
      });
    }
  });

  history.workflowTransitions.forEach((transition) => {
    events.push({
      id: `wf-${transition.id}`,
      at: transition.transitionedAt,
      title: `Workflow update: ${transition.fromState} → ${transition.toState}`,
      detail: `${transition.actor.fullName}${transition.comment ? ` • ${transition.comment}` : ""}`
    });

    if (transition.toState === "IN_REVIEW") {
      events.push({
        id: `review-started-${transition.id}`,
        at: transition.transitionedAt,
        title: "Review started",
        detail: `Review commenced by ${transition.actor.fullName}.`
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
      detail: `${action.reviewer.fullName}${action.note ? ` • ${action.note}` : ""}`
    });
  });

  history.clarificationRequests.forEach((request) => {
    events.push({
      id: `clarification-request-${request.id}`,
      at: request.createdAt,
      title: "Clarification requested",
      detail: request.message
    });

    if (request.respondedAt) {
      events.push({
        id: `clarification-response-${request.id}`,
        at: request.respondedAt,
        title: "Clarification responded",
        detail: "Operator response received."
      });
    }
  });

  history.decisionLetters.forEach((letter) => {
    events.push({
      id: `decision-${letter.id}`,
      at: letter.issuedAt,
      title: letter.decisionType === "APPROVAL" ? "Final approval" : "Final rejection",
      detail: `Decision letter issued (${letter.letterRef}).`
    });

    events.push({
      id: `decision-letter-${letter.id}`,
      at: letter.issuedAt,
      title: "Decision letter available",
      detail: `${letter.decisionType} letter published for download.`
    });
  });

  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
}
