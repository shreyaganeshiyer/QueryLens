import { useNavigate } from "react-router-dom";
import { useQueryAnalysis } from "../context/QueryAnalysisContext";
import QueryAnalysis from "../components/workspace/QueryAnalysis";

export default function Analysis() {
  const navigate = useNavigate();
  const { sql, analysis, analyzing, analysisError, lastExecution } =
    useQueryAnalysis();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 text-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Query Analysis</h1>
          <p className="mt-1 text-sm text-slate-400">
            Understand how MySQL processes your SQL and where performance can
            improve.
          </p>
        </div>
        <button
          onClick={() => navigate("/optimization-lab")}
          disabled={!analysis}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Open Optimization Lab
        </button>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-300">
          Analyzed SQL
        </h2>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-slate-950 p-3 font-mono text-sm text-green-300">
          {sql || "No query selected"}
        </pre>
        {lastExecution?.sql?.trim() === sql?.trim() && (
          <p className="mt-2 text-xs text-slate-400">
            Last measured database call:{" "}
            <span className="text-slate-200">
              {lastExecution.databaseCallMs} ms
            </span>{" "}
            (measured when you clicked Run).
          </p>
        )}
      </section>

      {!analysis && !analyzing && !analysisError && (
        <div className="rounded-lg border border-slate-800 p-6 text-sm text-slate-400">
          No analysis is available yet. Return to Workspace and click Analyze.
        </div>
      )}
      <QueryAnalysis
        analysis={analysis}
        analyzing={analyzing}
        error={analysisError}
      />
    </div>
  );
}
