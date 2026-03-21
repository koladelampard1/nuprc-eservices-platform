export default function PublicLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-64 rounded-3xl bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-36 rounded-2xl bg-slate-200" />
        <div className="h-36 rounded-2xl bg-slate-200" />
        <div className="h-36 rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}
