import { formatKeys, formatNumber } from "./planMetrics";

const TONES = {
  default: "border-slate-800 bg-slate-900/50",
  success: "border-emerald-500/20 bg-emerald-500/5",
  info: "border-blue-500/20 bg-blue-500/5",
  warning: "border-yellow-500/20 bg-yellow-500/5",
  danger: "border-red-500/30 bg-red-500/5",
};

const SEVERITY = {
  warning: {
    label: "Warning",
    className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  },
  success: {
    label: "Good",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  info: {
    label: "Info",
    className: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  },
};

const ACCESS_STYLES = {
  ALL: "text-yellow-300",
  index: "text-blue-300",
  range: "text-emerald-300",
  ref: "text-emerald-300",
  eq_ref: "text-emerald-300",
  const: "text-emerald-300",
  system: "text-emerald-300",
};

export function SectionCard({ title, subtitle, action, tone = "default", children }) {
  return (
    <section className={`rounded-xl border p-5 ${TONES[tone] ?? TONES.default}`}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-white">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Metric({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function CodeBlock({ children, tone = "default" }) {
  const color = tone === "success" ? "text-emerald-300" : "text-slate-300";
  return (
    <pre
      className={`overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-slate-800 bg-slate-950 p-3 font-mono text-xs leading-relaxed ${color}`}
    >
      {children}
    </pre>
  );
}

export function SeverityBadge({ type }) {
  const style = SEVERITY[type] ?? SEVERITY.info;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${style.className}`}
    >
      {style.label}
    </span>
  );
}

export function IssueCard({ issue }) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge type={issue.type} />
        <h3 className="font-medium text-slate-100">{issue.title}</h3>
      </div>
      {issue.description && (
        <p className="mt-2 text-sm text-slate-400">{issue.description}</p>
      )}
      {issue.recommendation && (
        <p className="mt-2 text-sm text-slate-300">
          <span className="text-slate-500">Recommendation: </span>
          {issue.recommendation}
        </p>
      )}
    </article>
  );
}

export function IndexCard({ item }) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
      <p className="font-medium text-slate-100">
        {item.table}
        <span className="text-slate-500">: </span>
        <span className="font-mono text-sm text-slate-200">
          {item.columns?.join(", ")}
        </span>
      </p>
      {item.reason && <p className="mt-1 text-sm text-slate-400">{item.reason}</p>}
      {item.sql && (
        <div className="mt-3">
          <CodeBlock tone="success">{item.sql}</CodeBlock>
        </div>
      )}
    </article>
  );
}

export function PlanTable({ tables = [], emptyText }) {
  if (tables.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        {emptyText ?? "No table-level plan details were returned."}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead className="border-b border-slate-800 text-slate-500">
          <tr>
            <th className="px-2 py-2 font-medium">Table</th>
            <th className="px-2 py-2 font-medium">Access</th>
            <th className="px-2 py-2 font-medium">Possible keys</th>
            <th className="px-2 py-2 font-medium">Chosen key</th>
            <th className="px-2 py-2 text-right font-medium">Est. rows</th>
            <th className="px-2 py-2 text-right font-medium">Filtered</th>
          </tr>
        </thead>
        <tbody>
          {tables.map((table, index) => (
            <tr
              key={`${table.table}-${index}`}
              className="border-b border-slate-800/70 last:border-0"
            >
              <td className="px-2 py-2 text-slate-200">{table.table}</td>
              <td
                className={`px-2 py-2 font-mono ${ACCESS_STYLES[table.accessType] ?? "text-slate-300"}`}
              >
                {table.accessType || "Unknown"}
              </td>
              <td className="px-2 py-2 text-slate-400">
                {formatKeys(table.possibleKeys)}
              </td>
              <td className="px-2 py-2 text-slate-200">
                {table.selectedKey || "None"}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {formatNumber(table.rowsExamined)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {table.filtered ?? "Unknown"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
