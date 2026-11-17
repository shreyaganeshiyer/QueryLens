import {
  CodeBlock,
  IndexCard,
  IssueCard,
  Metric,
  PlanTable,
  SectionCard,
} from "../analysis/AnalysisUi";
import {
  countFullScans,
  formatNumber,
  sumRowsExamined,
} from "../analysis/planMetrics";

export default function QueryAnalysis({ analysis, analyzing, error }) {
  if (analyzing)
    return (
      <div className="rounded-xl border border-slate-800 p-6 text-sm text-slate-400">
        Analyzing SQL with MySQL EXPLAIN and the optimization assistant...
      </div>
    );
  if (error)
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
        Analysis failed: {error}
      </div>
    );
  if (!analysis) return null;

  const tables = analysis.tables || [];
  const warningCount =
    analysis.issues?.filter((issue) => issue.type === "warning").length || 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Tables in plan" value={tables.length} />
        <Metric
          label="Est. rows examined"
          value={formatNumber(sumRowsExamined(tables))}
          hint={`${countFullScans(tables)} full table scan(s)`}
        />
        <Metric label="Warnings" value={warningCount} />
        <Metric
          label="EXPLAIN time"
          value={`${analysis.explainMs ?? "—"} ms`}
        />
      </section>

      <SectionCard
        title="What MySQL is doing"
        subtitle={
          analysis.querySummary ||
          "MySQL parsed the statement and produced the execution plan shown below."
        }
        action={
          <span className="rounded-full border border-slate-700 px-2.5 py-0.5 text-xs text-slate-400">
            {analysis.llmUsed
              ? "Rule-based + AI suggestion"
              : "Rule-based analysis"}
          </span>
        }
      >
        {analysis.llmError && (
          <p className="rounded-md border border-yellow-500/20 bg-yellow-500/10 p-3 text-xs text-yellow-300">
            AI suggestions are unavailable: {analysis.llmError}. The MySQL
            execution-plan analysis is still available.
          </p>
        )}
      </SectionCard>

      <SectionCard title="Detected issues and observations">
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
          <p className="text-sm text-emerald-300">
            No issues were detected by the current checks.
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="Execution plan by table"
        subtitle="Rows and filtered percentages are EXPLAIN estimates, not necessarily rows read at runtime."
      >
        <PlanTable
          tables={tables}
          emptyText="No table-level plan details were returned. This can happen for queries that do not read from a table."
        />
      </SectionCard>

      {analysis.llmExplanation && (
        <SectionCard tone="info" title="Optimization explanation">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
            {analysis.llmExplanation}
          </p>
        </SectionCard>
      )}

      {analysis.indexRecommendations?.length > 0 && (
        <SectionCard
          title="Possible index recommendations"
          subtitle="Review before applying. Extra indexes use storage and slow down writes."
        >
          <div className="space-y-3">
            {analysis.indexRecommendations.map((item, index) => (
              <IndexCard key={`${item.table}-${index}`} item={item} />
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Suggested query"
        subtitle="Open the Optimization Lab to inspect this rewrite and compare its plan with the original."
      >
        <CodeBlock tone="success">
          {analysis.suggestedQuery || analysis.originalQuery}
        </CodeBlock>
      </SectionCard>
    </div>
  );
}
