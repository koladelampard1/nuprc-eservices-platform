import { cn } from "@/lib/utils";

export type ChartDatum = {
  label: string;
  value: number;
  hint?: string;
};

function toPercent(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(6, Math.round((value / max) * 100));
}

export function HorizontalBarChart({
  data,
  valueFormatter,
  barClassName
}: {
  data: ChartDatum[];
  valueFormatter?: (value: number) => string;
  barClassName?: string;
}) {
  const max = Math.max(...data.map((item) => item.value), 0);

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="space-y-1.5">
          <div className="flex items-center justify-between gap-4 text-sm">
            <div>
              <p className="font-medium text-slate-800">{item.label}</p>
              {item.hint ? <p className="text-xs text-slate-500">{item.hint}</p> : null}
            </div>
            <span className="font-semibold text-slate-700">{valueFormatter ? valueFormatter(item.value) : item.value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-emerald-100/60">
            <div
              className={cn("h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-700", barClassName)}
              style={{ width: `${toPercent(item.value, max)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ColumnTrendChart({
  data,
  valueFormatter
}: {
  data: ChartDatum[];
  valueFormatter?: (value: number) => string;
}) {
  const max = Math.max(...data.map((item) => item.value), 0);

  return (
    <div className="space-y-3">
      <div className="flex h-36 items-end gap-2 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2">
        {data.map((item) => {
          const height = max === 0 ? 8 : Math.max(8, Math.round((item.value / max) * 100));

          return (
            <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-medium text-slate-500">{valueFormatter ? valueFormatter(item.value) : item.value}</span>
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-emerald-700 to-emerald-400"
                style={{ height: `${height}%` }}
                title={`${item.label}: ${item.value}`}
              />
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-6 gap-2 text-center text-[11px] text-slate-500">
        {data.map((item) => (
          <span key={item.label} className="truncate">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DonutStat({ value, total, label }: { value: number; total: number; label: string }) {
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-white/80 px-3 py-2">
      <div
        className="grid h-12 w-12 place-items-center rounded-full text-xs font-semibold text-emerald-900"
        style={{ background: `conic-gradient(rgb(16 185 129) ${percent * 3.6}deg, rgb(209 250 229) 0deg)` }}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white">{percent}%</span>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{value} of {total}</p>
      </div>
    </div>
  );
}
