import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { queriesApi } from "../services/queriesApi";
import { useQueryAnalysis } from "../context/QueryAnalysisContext";

function PlanTable({ title, tables = [] }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <h3 className="mb-3 font-medium text-white">{title}</h3>
      {tables.length === 0 ? (
        <p className="text-sm text-slate-500">
          No table access details were returned.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="p-2">Table</th>
                <th className="p-2">Access</th>
                <th className="p-2">Index</th>
                <th className="p-2">Estimated rows</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((table, index) => (
                <tr
                  key={`${table.table}-${index}`}
                  className="border-t border-slate-800"
                >
                  <td className="p-2">{table.table}</td>
                  <td className="p-2">{table.accessType}</td>
                  <td className="p-2">{table.selectedKey || "None"}</td>
                  <td className="p-2">{table.rowsExamined ?? "Unknown"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function OptimizationLab() {
  const navigate = useNavigate();
  const {
    sql,
    setSql,
    analysis,
    optimizationAnalysis,
    setOptimizationAnalysis,
    setAnalysis,
    setAnalyzing,
    setAnalysisError,
  } = useQueryAnalysis();
  const [checking, setChecking] = useState(false);
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchmark, setBenchmark] = useState(null);
  const [error, setError] = useState(null);

  async function compareOptimizedQuery() {
    if (
      !analysis?.suggestedQuery ||
      analysis.suggestedQuery.trim() === sql.trim()
    )
      return;
    setChecking(true);
    setError(null);
    setOptimizationAnalysis(null);
    try {
      const result = await queriesApi.analyze(analysis.suggestedQuery);
      setOptimizationAnalysis(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  async function benchmarkQueries() {
    if (!hasRewrite || benchmarking) return;
    setBenchmarking(true);
    setError(null);
    setBenchmark(null);
    try {
      // Sequential single-run measurements; this is a sample, not a statistical benchmark.
      const original = await queriesApi.execute(analysis.originalQuery);
      const optimized = await queriesApi.execute(analysis.suggestedQuery);
      setBenchmark({
        originalMs: original.databaseCallMs,
        optimizedMs: optimized.databaseCallMs,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBenchmarking(false);
    }
  }

  function applyOptimization() {
    if (!analysis?.suggestedQuery) return;
    setSql(analysis.suggestedQuery);
    setAnalysis(null);
    setOptimizationAnalysis(null);
    setAnalysisError(null);
    setAnalyzing(false);
    navigate("/", {
      state: { sql: analysis.suggestedQuery, analyzeOnLoad: true },
    });
  }

  if (!analysis) {
    return (
      <div className="mx-auto max-w-5xl p-6 text-slate-300">
        <h1 className="text-2xl font-semibold text-white">Optimization Lab</h1>
        <p className="mt-3 text-sm text-slate-400">
          Analyze a query first. Its optimization suggestions will appear here.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white"
        >
          Go to Workspace
        </button>
      </div>
    );
  }

  const hasRewrite =
    analysis.suggestedQuery &&
    analysis.suggestedQuery.trim() !== analysis.originalQuery?.trim();

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6 text-slate-200">
      <div>
        <h1 className="text-2xl font-semibold text-white">Optimization Lab</h1>
        <p className="mt-1 text-sm text-slate-400">
          Review the proposed rewrite, understand the changes, and compare the
          MySQL plans.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <h2 className="mb-2 font-medium text-white">Original Query</h2>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-slate-950 p-3 font-mono text-xs text-slate-300">
            {analysis.originalQuery}
          </pre>
        </section>
        <section className="rounded-lg border border-emerald-500/20 bg-slate-900/50 p-4">
          <h2 className="mb-2 font-medium text-white">
            Proposed Optimized Query
          </h2>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-slate-950 p-3 font-mono text-xs text-emerald-300">
            {analysis.suggestedQuery || analysis.originalQuery}
          </pre>
        </section>
      </div>

      {analysis.llmExplanation && (
        <section className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
          <h2 className="mb-2 font-medium text-blue-300">
            Why this optimization?
          </h2>
          <p className="whitespace-pre-wrap text-sm text-slate-300">
            {analysis.llmExplanation}
          </p>
        </section>
      )}

      <section className="rounded-lg border border-slate-800 p-4">
        <h2 className="mb-3 font-medium text-white">
          Optimization opportunities
        </h2>
        {analysis.issues?.length ? (
          <div className="space-y-3">
            {analysis.issues.map((issue, index) => (
              <div
                key={`${issue.code || issue.title}-${index}`}
                className="rounded-md bg-slate-900 p-3"
              >
                <div className="text-sm font-medium text-slate-200">
                  {issue.title}
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  {issue.description}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Suggested action: {issue.recommendation}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            No optimization opportunities were identified.
          </p>
        )}
        {analysis.indexRecommendations?.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-white">
              Possible index improvements
            </h3>
            {analysis.indexRecommendations.map((item, index) => (
              <div
                key={`${item.table}-${index}`}
                className="mb-2 rounded bg-slate-900 p-3 text-sm"
              >
                <p>
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
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={compareOptimizedQuery}
          disabled={!hasRewrite || checking}
          className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-40"
        >
          {checking ? "Checking optimized plan..." : "Compare execution plans"}
        </button>
        <button
          onClick={benchmarkQueries}
          disabled={!hasRewrite || benchmarking}
          className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-40"
        >
          {benchmarking ? "Running both queries..." : "Measure both queries"}
        </button>
        <button
          onClick={applyOptimization}
          disabled={!hasRewrite}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40"
        >
          Apply optimization and re-analyze
        </button>
      </div>
      {benchmark && (
        <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <h2 className="mb-3 font-medium text-white">
            Single-run execution time sample
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">Original query</p>
              <p className="text-xl font-semibold text-white">
                {benchmark.originalMs} ms
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Optimized query</p>
              <p className="text-xl font-semibold text-white">
                {benchmark.optimizedMs} ms
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            These are one-time application-observed database-call timings. Cache
            state, server load, and query order can affect them. Repeat several
            times under similar conditions before drawing conclusions.
          </p>
        </section>
      )}
      {error && <p className="text-sm text-red-300">{error}</p>}

      {optimizationAnalysis && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Execution plan comparison
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <PlanTable title="Original plan" tables={analysis.tables} />
            <PlanTable
              title="Optimized plan"
              tables={optimizationAnalysis.tables}
            />
          </div>
          <section className="rounded-lg border border-slate-800 p-4">
            <h3 className="mb-2 font-medium text-white">
              Remaining findings after optimization
            </h3>
            {optimizationAnalysis.issues?.length ? (
              <div className="space-y-2">
                {optimizationAnalysis.issues.map((issue, index) => (
                  <div
                    key={`${issue.code || issue.title}-${index}`}
                    className="text-sm"
                  >
                    <span className="font-medium text-slate-200">
                      {issue.title}
                    </span>
                    <p className="text-slate-400">{issue.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-emerald-300">
                No remaining issues were detected by the current checks.
              </p>
            )}
          </section>
        </div>
      )}
      <p className="text-xs text-slate-500">
        Plan row counts are optimizer estimates, not actual rows returned. A
        full table scan may still be the best plan for small tables or queries
        that need most rows.
      </p>
    </div>
  );
}
