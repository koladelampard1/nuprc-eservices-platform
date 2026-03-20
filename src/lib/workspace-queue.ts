import { ApplicationState } from "@prisma/client";

export type QueueUrgency = "NEW" | "DUE_SOON" | "OVERDUE";

const DAY_MS = 24 * 60 * 60 * 1000;

function getAgeInDays(from: Date, now: Date) {
  return Math.floor((now.getTime() - from.getTime()) / DAY_MS);
}

export function getQueueUrgency(params: {
  state: ApplicationState;
  submittedAt: Date | null;
  lastReviewAt?: Date | null;
  lastClarificationAt?: Date | null;
  now?: Date;
}): QueueUrgency {
  const now = params.now ?? new Date();

  const baseline =
    params.state === "CLARIFICATION_REQUIRED"
      ? params.lastClarificationAt ?? params.lastReviewAt ?? params.submittedAt
      : params.lastReviewAt ?? params.submittedAt;

  if (!baseline) {
    return "NEW";
  }

  const ageInDays = getAgeInDays(baseline, now);

  if (params.state === "SUBMITTED") {
    if (ageInDays <= 2) return "NEW";
    if (ageInDays <= 5) return "DUE_SOON";
    return "OVERDUE";
  }

  if (params.state === "CLARIFICATION_REQUIRED") {
    if (ageInDays <= 1) return "NEW";
    if (ageInDays <= 3) return "DUE_SOON";
    return "OVERDUE";
  }

  if (ageInDays <= 3) return "NEW";
  if (ageInDays <= 7) return "DUE_SOON";
  return "OVERDUE";
}

export function getQueueUrgencyTone(urgency: QueueUrgency): "info" | "warning" | "danger" {
  if (urgency === "NEW") return "info";
  if (urgency === "DUE_SOON") return "warning";
  return "danger";
}

export function getQueueUrgencyLabel(urgency: QueueUrgency) {
  if (urgency === "NEW") return "New";
  if (urgency === "DUE_SOON") return "Due Soon";
  return "Overdue";
}
