export function AppHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
