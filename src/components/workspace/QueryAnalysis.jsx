export default function QueryAnalysis({ analysis, analyzing, error }) {
  if (analyzing)
    return (
      <div className="rounded-lg border border-slate-800 p-6 text-sm text-slate-400">
        Analyzing SQL with MySQL EXPLAIN and the optimization assistant...
      </div>
    );
  if (error)
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
        Analysis failed: {error}
      </div>
    );
  if (!analysis) return null;

  const tables = analysis.tables || [];
  const warningCount =
    analysis.issues?.filter((issue) => issue.type === "warning").length || 0;

  return (
    <div className="space-y-5 text-sm">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Tables in plan" value={tables.length} />
        <Metric
          label="Estimated rows scanned"
          value={tables
            .reduce(
              (total, table) => total + (Number(table.rowsExamined) || 0),
              0,
            )
            .toLocaleString()}
        />
        <Metric label="Warnings detected" value={warningCount} />
        <Metric
          label="EXPLAIN request time"
          value={`${analysis.explainMs ?? "—"} ms`}
        />
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-white">What MySQL is doing</h2>
          <span className="text-xs text-slate-500">
            {analysis.llmUsed
              ? "Rule-based analysis + AI suggestion"
              : "Rule-based analysis"}
          </span>
        </div>
        <p className="text-slate-400">
          {analysis.querySummary ||
            "MySQL parsed the statement and produced the execution plan shown below."}
        </p>
        {analysis.llmError && (
          <p className="mt-3 rounded bg-yellow-500/10 p-3 text-xs text-yellow-300">
            AI suggestions are unavailable: {analysis.llmError}. The MySQL
            execution-plan analysis is still available.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="mb-3 font-semibold text-white">
          Detected issues and performance observations
        </h2>
        {analysis.issues?.length ? (
          <div className="space-y-3">
            {analysis.issues.map((issue, index) => (
              <article
                key={`${issue.code || issue.title}-${index}`}
                className="rounded-md border border-slate-800 bg-slate-950/70 p-3"
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span
                    className={
                      issue.type === "warning"
                        ? "text-yellow-400"
                        : issue.type === "success"
                          ? "text-emerald-400"
                          : "text-blue-400"
                    }
                  >
                    {(issue.type || "info").toUpperCase()}
                  </span>
                  <h3 className="font-medium text-slate-100">{issue.title}</h3>
                </div>
                <p className="text-slate-400">{issue.description}</p>
                {issue.recommendation && (
                  <p className="mt-2 text-slate-300">
                    Recommendation: {issue.recommendation}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="text-emerald-300">
            No issues were detected by the current checks.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="mb-3 font-semibold text-white">
          Execution plan by table
        </h2>
        {tables.length === 0 ? (
          <p className="text-slate-500">
            No table-level plan details were returned. This can happen for
            queries that do not read from a table.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-slate-400">
                <tr>
                  <th className="p-2">Table</th>
                  <th className="p-2">Access type</th>
                  <th className="p-2">Possible indexes</th>
                  <th className="p-2">Chosen index</th>
                  <th className="p-2">Estimated rows</th>
                  <th className="p-2">Filtered %</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table, index) => (
                  <tr
                    key={`${table.table}-${index}`}
                    className="border-t border-slate-800"
                  >
                    <td className="p-2 text-slate-200">{table.table}</td>
                    <td className="p-2">{table.accessType}</td>
                    <td className="p-2">
                      {Array.isArray(table.possibleKeys)
                        ? table.possibleKeys.join(", ") || "None"
                        : table.possibleKeys || "None"}
                    </td>
                    <td className="p-2">{table.selectedKey || "None"}</td>
                    <td className="p-2">{table.rowsExamined ?? "Unknown"}</td>
                    <td className="p-2">{table.filtered ?? "Unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Rows and filtered percentages come from EXPLAIN estimates. They are
          not necessarily the actual number of rows read at runtime.
        </p>
      </section>

      {analysis.llmExplanation && (
        <section className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
          <h2 className="mb-2 font-semibold text-blue-300">
            Optimization explanation
          </h2>
          <p className="whitespace-pre-wrap text-slate-300">
            {analysis.llmExplanation}
          </p>
        </section>
      )}
      {analysis.indexRecommendations?.length > 0 && (
        <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <h2 className="mb-3 font-semibold text-white">
            Possible index recommendations
          </h2>
          {analysis.indexRecommendations.map((item, index) => (
            <div
              key={`${item.table}-${index}`}
              className="mb-3 rounded bg-slate-950 p-3"
            >
              <p className="font-medium text-slate-200">
                {item.table}: {item.columns?.join(", ")}
              </p>
              <p className="mt-1 text-slate-400">{item.reason}</p>
              {item.sql && (
                <pre className="mt-2 overflow-x-auto text-xs text-emerald-300">
                  {item.sql}
                </pre>
              )}
            </div>
          ))}
          <p className="text-xs text-yellow-400">
            Review index recommendations before applying them. Additional
            indexes consume storage and add write overhead.
          </p>
        </section>
      )}

      <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="mb-2 font-semibold text-white">Suggested query</h2>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-slate-950 p-3 font-mono text-xs text-emerald-300">
          {analysis.suggestedQuery || analysis.originalQuery}
        </pre>
        <p className="mt-2 text-xs text-slate-500">
          Use the Optimization Lab to inspect the proposed rewrite and compare
          its execution plan with this query.
        </p>
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
