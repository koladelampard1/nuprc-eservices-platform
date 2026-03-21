export function AppHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6 rounded-2xl border border-emerald-100 bg-white px-6 py-4 shadow-sm">
      <div className="mb-3 h-1.5 w-16 rounded-full bg-gradient-to-r from-primary to-emerald-600" />
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
