import { ApplicationState } from "@prisma/client";

export type QueueUrgency = "NEW" | "DUE_SOON" | "OVERDUE";

const DAY_MS = 24 * 60 * 60 * 1000;

function getAgeInDays(from: Date, now: Date) {
  return Math.floor((now.getTime() - from.getTime()) / DAY_MS);
}

export function getQueueUrgency(state: ApplicationState, submittedAt: Date | null, now = new Date()): QueueUrgency {
  if (!submittedAt) {
    return "NEW";
  }

  const ageInDays = getAgeInDays(submittedAt, now);

  if (state === "SUBMITTED") {
    if (ageInDays <= 2) return "NEW";
    if (ageInDays <= 5) return "DUE_SOON";
    return "OVERDUE";
  }

  if (state === "CLARIFICATION_REQUIRED") {
    if (ageInDays <= 3) return "DUE_SOON";
    return "OVERDUE";
  }

  if (ageInDays <= 4) return "NEW";
  if (ageInDays <= 8) return "DUE_SOON";
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
