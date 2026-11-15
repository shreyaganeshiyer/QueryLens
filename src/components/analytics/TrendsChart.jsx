import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const AXIS = { fill: '#64748b', fontSize: 12 };
const GRID = '#1e293b';
const TOOLTIP = {
  contentStyle: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8 },
  labelStyle: { color: '#e2e8f0' },
};

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-sm font-medium text-slate-200">{title}</h2>
      <p className="mb-4 text-xs text-slate-500">{subtitle}</p>
      <div className="h-64">{children}</div>
    </div>
  );
}

export default function TrendsChart({ points }) {
  if (!points.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-500">
        No queries in this period yet. Run some queries in the Workspace to see trends here.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Average execution time"
        subtitle="Successful queries, averaged per bucket"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="bucket" tick={AXIS} stroke={GRID} minTickGap={24} />
            <YAxis tick={AXIS} stroke={GRID} unit=" ms" width={70} />
            <Tooltip {...TOOLTIP} formatter={(v) => [`${v} ms`, 'Avg']} />
            <Line
              type="monotone"
              dataKey="avgDurationMs"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Query volume"
        subtitle="Successful and failed runs per bucket"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="bucket" tick={AXIS} stroke={GRID} minTickGap={24} />
            <YAxis tick={AXIS} stroke={GRID} allowDecimals={false} width={40} />
            <Tooltip {...TOOLTIP} cursor={{ fill: '#1e293b' }} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            <Bar dataKey="successes" name="Success" stackId="q" fill="#34d399" />
            <Bar dataKey="failures" name="Failed" stackId="q" fill="#f87171" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}