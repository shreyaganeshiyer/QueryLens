import { useEffect, useState } from 'react';
import { analyticsApi } from '../services/analyticsApi';
import StatCards from '../components/analytics/StatCards';
import TrendsChart from '../components/analytics/TrendsChart';
import SlowQueriesTable from '../components/analytics/SlowQueriesTable';

const RANGES = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

const SLOW_THRESHOLDS = [
  { value: 100, label: '100 ms' },
  { value: 500, label: '500 ms' },
  { value: 1000, label: '1 s' },
  { value: 5000, label: '5 s' },
];

export default function Analytics() {
  const [range, setRange] = useState('7d');
  const [slowMs, setSlowMs] = useState(1000);
  const [data, setData] = useState({ overview: null, trends: null, slow: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([
      analyticsApi.overview({ range, slowMs }),
      analyticsApi.trends({ range }),
      analyticsApi.slowQueries({ range, slowMs, limit: 20 }),
    ])
      .then(([overview, trends, slow]) => {
        if (!cancelled) setData({ overview, trends, slow });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range, slowMs]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 text-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Analytics</h1>
          <p className="text-sm text-slate-400">
            How your queries are performing across the selected period.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  range === r.value
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-400">
            Slow above
            <select
              value={slowMs}
              onChange={(e) => setSlowMs(Number(e.target.value))}
              className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1.5 text-slate-200 focus:border-blue-600 focus:outline-none"
            >
              {SLOW_THRESHOLDS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && !data.overview ? (
        <div className="py-20 text-center text-sm text-slate-500">Loading analytics…</div>
      ) : (
        <>
          <StatCards totals={data.overview?.totals} />
          <TrendsChart points={data.trends?.points ?? []} />
          <SlowQueriesTable queries={data.slow?.queries ?? []} slowMs={slowMs} />
        </>
      )}
    </div>
  );
}