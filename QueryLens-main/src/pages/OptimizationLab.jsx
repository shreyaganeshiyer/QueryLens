import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { queriesApi } from "../services/queriesApi";
import { useQueryAnalysis } from "../context/QueryAnalysisContext";
import {
  CodeBlock,
  IndexCard,
  IssueCard,
  Metric,
  SectionCard,
} from "../components/analysis/AnalysisUi";
import {
  countFullScans,
  formatNumber,
  sumRowsExamined,
} from "../components/analysis/planMetrics";

const buttonBase =
  "rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40";
const secondaryButton = `${buttonBase} border border-slate-700 text-slate-200 hover:bg-slate-800`;
const primaryButton = `${buttonBase} bg-blue-600 text-white hover:bg-blue-500`;

export default function OptimizationLab() {
  const navigate = useNavigate();
  const {
    sql,
    setSql,
    analysis,
    setAnalysis,
    setAnalyzing,
    setAnalysisError,
  } = useQueryAnalysis();
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchmark, setBenchmark] = useState(null);
  const [error, setError] = useState(null);

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
    setAnalysisError(null);
    setAnalyzing(false);
    navigate("/", {
      state: { sql: analysis.suggestedQuery, analyzeOnLoad: true },
    });
  }

  if (!analysis) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Optimization Lab</h1>
          <p className="mt-1 text-sm text-slate-400">
            Analyze a query first. Its optimization suggestions will appear
            here.
          </p>
        </div>
        <button onClick={() => navigate("/")} className={primaryButton}>
          Go to Workspace
        </button>
      </div>
    );
  }

  const hasRewrite =
    Boolean(analysis.suggestedQuery) &&
    analysis.suggestedQuery.trim() !== analysis.originalQuery?.trim();

  const originalScans = countFullScans(analysis.tables);
  const originalRows = sumRowsExamined(analysis.tables);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 text-slate-200">
      <header>
        <button
          onClick={() => navigate("/analysis")}
          className="mb-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft size={14} />
          Back to analysis
        </button>
        <h1 className="text-2xl font-semibold text-white">Optimization Lab</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Review the proposed rewrite, understand why it helps, then time it
          against the original before you apply it.
        </p>
      </header>

      <SectionCard
        title="Query rewrite"
        subtitle={
          hasRewrite
            ? "Review the original query next to the proposed version."
            : "No rewrite was proposed for this query. The original is shown for reference."
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-300">
                Original
              </span>
              <span className="text-xs text-slate-500">
                {originalScans} full scan(s) · {formatNumber(originalRows)} est.
                rows
              </span>
            </div>
            <CodeBlock>{analysis.originalQuery}</CodeBlock>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-emerald-300">
                Proposed
              </span>
            </div>
            <CodeBlock tone="success">
              {analysis.suggestedQuery || analysis.originalQuery}
            </CodeBlock>
          </div>
        </div>
      </SectionCard>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">
          {hasRewrite
            ? "Verify the rewrite against the original before applying it."
            : "There is no rewrite to time or apply."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={benchmarkQueries}
            disabled={!hasRewrite || benchmarking}
            className={secondaryButton}
          >
            {benchmarking ? "Running both..." : "Time both queries"}
          </button>
          <button
            onClick={applyOptimization}
            disabled={!hasRewrite}
            className={primaryButton}
          >
            Apply and re-analyze
          </button>
        </div>
      </div>
      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <SectionCard
        tone="info"
        title="Why this change"
        subtitle={
          analysis.llmError
            ? `AI explanation unavailable: ${analysis.llmError}`
            : undefined
        }
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
          {!hasRewrite
            ? "The analysis did not find a safer rewrite for this query."
            : analysis.llmExplanation ||
              "No explanation was returned for this rewrite."}
        </p>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Optimization opportunities">
          {analysis.issues?.length ? (
            <div className="space-y-3">
              {analysis.issues.map((issue, index) => (
                <IssueCard
                  key={`${issue.code || issue.title}-${index}`}
                  issue={issue}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              No optimization opportunities were identified.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Possible index improvements"
          subtitle="Review before applying. Extra indexes use storage and slow down writes."
        >
          {analysis.indexRecommendations?.length ? (
            <div className="space-y-3">
              {analysis.indexRecommendations.map((item, index) => (
                <IndexCard key={`${item.table}-${index}`} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              No index changes were recommended.
            </p>
          )}
        </SectionCard>
      </div>

      {benchmark && (
        <SectionCard
          title="Single-run timing"
          subtitle="Database-call time for one run of each query, as observed by the app."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric
              label="Original query"
              value={`${benchmark.originalMs} ms`}
            />
            <Metric
              label="Optimized query"
              value={`${benchmark.optimizedMs} ms`}
            />
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Cache state, server load, and query order can change these numbers.
            Repeat several times under similar conditions before drawing
            conclusions.
          </p>
        </SectionCard>
      )}
    </div>
  );
}