import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

type BannerTone = "success" | "error" | "warning" | "info";

const toneStyles: Record<BannerTone, { icon: typeof CheckCircle2; className: string }> = {
  success: {
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-900"
  },
  error: {
    icon: AlertCircle,
    className: "border-rose-200 bg-rose-50 text-rose-900"
  },
  warning: {
    icon: TriangleAlert,
    className: "border-amber-200 bg-amber-50 text-amber-900"
  },
  info: {
    icon: Info,
    className: "border-sky-200 bg-sky-50 text-sky-900"
  }
};

export function StateBanner({ tone, message }: { tone: BannerTone; message: string }) {
  const toneStyle = toneStyles[tone];
  const Icon = toneStyle.icon;

  return (
    <div className={cn("flex items-start gap-2 rounded-lg border px-4 py-3 text-sm", toneStyle.className)}>
      <Icon className="mt-0.5 h-4 w-4" />
      <p>{message}</p>
    </div>
  );
}
