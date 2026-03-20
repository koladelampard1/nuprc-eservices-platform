import { StatusBadge } from "@/components/app/status-badge";

export type ApplicationTimelineEvent = {
  id: string;
  at: Date;
  title: string;
  detail: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
};

export function ApplicationTimeline({
  events,
  emptyMessage = "No timeline history available."
}: {
  events: ApplicationTimelineEvent[];
  emptyMessage?: string;
}) {
  if (!events.length) {
    return <p className="text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="relative rounded-md border bg-white p-3 pl-5">
          <span className="absolute left-2 top-4 h-2 w-2 rounded-full bg-slate-400" aria-hidden />
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-medium text-slate-900">{event.title}</p>
            {event.tone ? <StatusBadge label={new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(event.at)} tone={event.tone} /> : null}
          </div>
          <p className="text-slate-700">{event.detail}</p>
          {!event.tone ? (
            <p className="text-xs text-muted-foreground">
              {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(event.at)}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
