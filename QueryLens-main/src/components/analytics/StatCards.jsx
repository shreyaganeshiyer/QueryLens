import { formatMs } from "./format";

function Card({ label, value, hint, accent }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export default function StatCards({ totals }) {
  const t = totals ?? {};

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card
        label="Total queries"
        value={t.total ?? "—"}
        hint="Executed in the selected period"
        accent="text-white"
      />
      <Card
        label="Avg execution time"
        value={formatMs(t.avgDurationMs)}
        hint="Successful queries only"
        accent="text-blue-400"
      />
      <Card
        label="Slow queries"
        value={t.slowCount ?? "—"}
        hint="Runs at or above the threshold"
        accent="text-amber-400"
      />
      <Card
        label="Success rate"
        value={t.successRate == null ? "—" : `${t.successRate}%`}
        hint={`${t.failures ?? 0} failed`}
        accent="text-emerald-400"
      />
    </div>
  );
}