import { cn } from "@/lib/utils";

type StatusTone = "default" | "success" | "warning" | "danger" | "info";

const tones: Record<StatusTone, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
  info: "bg-blue-100 text-blue-700"
};

export function StatusBadge({ label, tone = "default" }: { label: string; tone?: StatusTone }) {
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>{label}</span>;
}
