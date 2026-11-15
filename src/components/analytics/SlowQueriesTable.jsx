import { useNavigate } from 'react-router-dom';
import { formatMs } from './StatCards';

export default function SlowQueriesTable({ queries, slowMs }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="text-sm font-medium text-slate-200">Slowest queries</h2>
          <p className="text-xs text-slate-500">
            Click a query to open it in the Optimization Lab.
          </p>
        </div>
        <span className="text-xs text-slate-500">Threshold: {formatMs(slowMs)}</span>
      </div>

      {queries.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-500">
          No successful queries in this period.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500">
              <tr className="border-b border-slate-800">
                <th className="px-5 py-3 font-medium">Query</th>
                <th className="px-3 py-3 text-right font-medium">Avg</th>
                <th className="px-3 py-3 text-right font-medium">Max</th>
                <th className="px-3 py-3 text-right font-medium">Runs</th>
                <th className="px-3 py-3 text-right font-medium">Total</th>
                <th className="px-3 py-3 font-medium">Last run</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {queries.map((q, i) => (
                <tr
                  key={`${i}-${q.sqlText}`}
                  onClick={() => navigate('/optimization-lab', { state: { sql: q.sqlText } })}
                  className="cursor-pointer border-b border-slate-800/60 transition hover:bg-slate-800/50"
                >
                  <td className="max-w-md truncate px-5 py-3 font-mono text-xs text-slate-300" title={q.sqlText}>
                    {q.sqlText}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatMs(q.avgMs)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-400">{formatMs(q.maxMs)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{q.executions}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-400">{formatMs(q.totalMs)}</td>
                  <td className="px-3 py-3 text-xs text-slate-400">
                    {q.lastExecutedAt ? new Date(q.lastExecutedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-5 py-3">
                    {q.status === 'slow' ? (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                        Slow
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                        Good
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}