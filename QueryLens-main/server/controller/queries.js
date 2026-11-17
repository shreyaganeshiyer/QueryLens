import { performance } from "node:perf_hooks";

import { friendlyError } from "../errors.js";
import { validateReadOnly, SqlGuardError } from "../sqlGuard.js";
import { requireConnection, extractLine } from "../utility/queries_utils.js";

import { recordQuery } from "../utility/historyDb.js";
import { getActiveMeta } from "../pool.js";

import { optimizeQuery } from "../utility/llmOptimizer.js";

const QUERY_TIMEOUT_MS = 10000;
const MAX_ROWS = 1000;

export async function execute(req, res) {
  const pool = requireConnection(res);
  if (!pool) return;

  const rawSql = req.body?.sql;
  const connectionName = getActiveMeta()?.name ?? null;

  let sql;

  // Validate before starting the database-call timer.
  try {
    sql = validateReadOnly(rawSql);
  } catch (err) {
    if (err instanceof SqlGuardError) {
      recordQuery(req.user.id, {
        sql: String(rawSql ?? ""),
        connectionName,
        status: "error",
        durationMs: 0,
        errorMessage: err.message,
      });

      return res.status(400).json({
        ok: false,
        kind: "guard",
        message: err.message,
      });
    }

    throw err;
  }

  try {
    const started = performance.now();

    const [rows, fields] = await pool.query({
      sql,
      timeout: QUERY_TIMEOUT_MS,
    });

    const databaseCallMs = Number((performance.now() - started).toFixed(2));

    const allRows = Array.isArray(rows) ? rows : [];

    recordQuery(req.user.id, {
      sql,
      connectionName,
      status: "success",
      rowCount: allRows.length,
      durationMs: Math.round(databaseCallMs),
    });

    return res.json({
      ok: true,
      columns: (fields ?? []).map((f) => f.name),
      rows: allRows.slice(0, MAX_ROWS),
      rowCount: allRows.length,
      truncated: allRows.length > MAX_ROWS,

      // This is the time observed around pool.query(),
      // not pure MySQL internal execution time.
      databaseCallMs,
    });
  } catch (err) {
    const message = err.sqlMessage || friendlyError(err);

    recordQuery(req.user.id, {
      sql,
      connectionName,
      status: "error",
      durationMs: null,
      errorMessage: message,
    });

    return res.status(400).json({
      ok: false,
      kind: "sql",
      message,
      code: err.code ?? null,
      line: extractLine(err.sqlMessage),
    });
  }
}

function extractPlanDetails(plan) {
  const tables = [];

  function visit(value) {
    if (!value || typeof value !== "object") return;

    if (value.table_name) {
      tables.push({
        table: value.table_name,
        accessType: value.access_type ?? "UNKNOWN",
        possibleKeys: value.possible_keys ?? [],
        selectedKey: value.key ?? null,
        rowsExamined: value.rows_examined_per_scan ?? null,
        rowsProduced: value.rows_produced_per_join ?? null,
        filtered: value.filtered ?? null,
      });
    }

    for (const child of Object.values(value)) {
      if (child && typeof child === "object") {
        visit(child);
      }
    }
  }

  visit(plan);

  return tables;
}

// The LLM can propose indexes on tables, columns or key orders that do not
// exist. Keep only recommendations that match the real schema and plan.
function sanitizeIndexRecommendations(items, schema, planTables) {
  if (!Array.isArray(items)) return [];

  const planTableNames = new Set(
    planTables.map((table) => String(table.table).toLowerCase()),
  );

  const columnsByTable = new Map();
  for (const row of schema?.columns ?? []) {
    const table = String(row.TABLE_NAME).toLowerCase();
    if (!columnsByTable.has(table)) columnsByTable.set(table, new Set());
    columnsByTable.get(table).add(String(row.COLUMN_NAME).toLowerCase());
  }

  // Existing indexes per table, with their columns in order.
  const indexesByTable = new Map();
  for (const row of schema?.indexes ?? []) {
    const table = String(row.TABLE_NAME).toLowerCase();
    if (!indexesByTable.has(table)) indexesByTable.set(table, new Map());
    const byName = indexesByTable.get(table);
    if (!byName.has(row.INDEX_NAME)) byName.set(row.INDEX_NAME, []);
    byName.get(row.INDEX_NAME).push(String(row.COLUMN_NAME).toLowerCase());
  }

  // True when an existing index already starts with these columns in order.
  const alreadyIndexed = (table, columns) => {
    const indexes = indexesByTable.get(table);
    if (!indexes) return false;
    return [...indexes.values()].some((cols) =>
      columns.every((col, i) => cols[i] === col),
    );
  };

  return items
    .filter((item) => {
      if (!item || typeof item !== "object") return false;

      const table = String(item.table ?? "").toLowerCase();
      const columns = Array.isArray(item.columns)
        ? item.columns.map((col) => String(col).toLowerCase())
        : [];

      // Table must be one the query reads, and columns must exist in it.
      if (!planTableNames.has(table) || columns.length === 0) return false;
      const known = columnsByTable.get(table);
      if (!known || !columns.every((col) => known.has(col))) return false;

      // Skip suggestions the table already satisfies.
      if (alreadyIndexed(table, columns)) return false;

      // If SQL is given, it must be a CREATE INDEX on this same table.
      if (item.sql) {
        const escaped = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const isCreateIndex = /^\s*CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(
          item.sql,
        );
        const mentionsTable = new RegExp(`\\b${escaped}\\b`, "i").test(
          item.sql,
        );
        if (!isCreateIndex || !mentionsTable) return false;
      }

      return true;
    })
    .slice(0, 5);
}

// True only if the connected MySQL user has INDEX (or ALL PRIVILEGES) on the
// current database, or globally. Reads the user's own grants, so it needs no
// special privilege. Checks scope, unlike a plain text search of the grants.
async function canCreateIndexes(pool) {
  try {
    const [[dbRow]] = await pool.query("SELECT DATABASE() AS db");
    const dbName = dbRow?.db;
    if (!dbName) return false;

    // Grant text is what MySQL shows, e.g. GRANT INDEX ON `dbms\_event`.*
    // so backslash escapes are removed before comparing scopes.
    const dbScope = `\`${dbName.replace(/`/g, "``")}\`.*`;

    const [grantRows] = await pool.query("SHOW GRANTS FOR CURRENT_USER()");
    return grantRows.some((row) => {
      const grant = String(Object.values(row)[0]);
      const match = grant.match(/^GRANT\s+(.+?)\s+ON\s+(.+?)\s+TO\s+/i);
      if (!match) return false;

      const privileges = match[1].toUpperCase();
      const scope = match[2].replace(/\\/g, "");
      const scopeMatches = scope === "*.*" || scope === dbScope;
      const hasIndex = /\bALL PRIVILEGES\b|\bINDEX\b/.test(privileges);

      return scopeMatches && hasIndex;
    });
  } catch {
    return false;
  }
}

// Confirms MySQL can parse and plan the suggested query. Runs EXPLAIN only,
// so the query itself is never executed.
async function isExplainable(pool, query) {
  try {
    await pool.query({ sql: `EXPLAIN ${query}`, timeout: QUERY_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

function generateSuggestions(sql, tables) {
  const issues = [];
  let suggestedQuery = sql;
  const yearPattern = /YEAR\s*\(\s*([a-zA-Z0-9_`.]+)\s*\)\s*=\s*(\d{4})/i;
  const match = suggestedQuery.match(yearPattern);

  if (match) {
    const column = match[1];
    const year = Number(match[2]);
    const replacement = `${column} >= '${year}-01-01' AND ${column} < '${year + 1}-01-01'`;
    suggestedQuery = suggestedQuery.replace(yearPattern, replacement);
    issues.push({
      code: "FUNCTION_ON_FILTER_COLUMN",
      type: "warning",
      title: "Function applied to a date column",
      description: `YEAR(${column}) applies a function to the filtered column. A normal index on that column may not be usable for a range lookup.`,
      recommendation:
        "Use a half-open date range so MySQL can consider a range scan on an index over this column.",
    });
  }

  if (/\bSELECT\s+\*/i.test(sql)) {
    issues.push({
      code: "SELECT_STAR",
      type: "info",
      title: "SELECT * retrieves every column",
      description:
        "The query asks MySQL to return all columns from the selected table(s), even if the caller may need only a subset.",
      recommendation:
        "List only the columns the application needs. This can reduce data transfer and may make covering indexes possible.",
    });
  }

  for (const table of tables) {
    const estimatedRows = Number(table.rowsExamined) || 0;
    if (table.accessType === "ALL" && estimatedRows >= 1000) {
      issues.push({
        code: `LARGE_FULL_SCAN_${table.table}`,
        type: "warning",
        title: `Large full table scan: ${table.table}`,
        description: `The plan uses ALL access for ${table.table} and estimates about ${estimatedRows.toLocaleString()} rows per scan. This may become expensive as the table grows.`,
        recommendation:
          "Inspect the WHERE and JOIN predicates and consider an index only when it matches the query's filtering or join pattern. A full scan can still be optimal when most rows are needed.",
      });
    } else if (
      ["range", "ref", "eq_ref", "const", "system"].includes(table.accessType)
    ) {
      issues.push({
        code: `INDEX_ACCESS_${table.table}_${table.accessType}`,
        type: "success",
        title: `Indexed or selective access: ${table.table}`,
        description: `MySQL selected ${table.accessType} access${table.selectedKey ? ` using index ${table.selectedKey}` : ""}.`,
        recommendation:
          "Review estimated rows and the selected index to confirm that the access path is appropriate for the expected data volume.",
      });
    } else if (table.accessType === "ALL") {
      issues.push({
        code: `SMALL_FULL_SCAN_${table.table}`,
        type: "info",
        title: `Full scan on ${table.table}`,
        description: `MySQL selected a full scan, but the estimated scan size is ${estimatedRows || "unknown"} rows. This is not automatically a performance problem for a small table.`,
        recommendation:
          "Revisit this only if the table grows or measured query latency becomes significant.",
      });
    }
  }

  if (issues.length === 0) {
    issues.push({
      code: "NO_COMMON_ISSUES",
      type: "success",
      title: "No common issue detected",
      description:
        "The current SQL and its execution plan did not trigger the optimization checks implemented by QueryLens.",
      recommendation:
        "Validate performance with representative data and compare measured execution times under similar conditions.",
    });
  }
  return { issues, suggestedQuery };
}

function summarizeQuery(sql, tables) {
  const operation = /^\s*WITH\b/i.test(sql)
    ? "A common-table-expression query"
    : "A SELECT query";
  if (!tables.length)
    return `${operation} was analyzed. The execution plan did not expose any table-level access details.`;
  const names = [...new Set(tables.map((table) => table.table))];
  const scans = tables.filter((table) => table.accessType === "ALL").length;
  const indexed = tables.filter((table) =>
    ["range", "ref", "eq_ref", "const", "system"].includes(table.accessType),
  ).length;
  return `${operation} reads ${names.join(", ")}. MySQL selected ${indexed} indexed/selective access path(s) and ${scans} full scan(s) across ${tables.length} table access operation(s). The table below shows the optimizer's estimated rows and index choices.`;
}

// Analyses a SELECT query without returning its result rows.

export async function analyze(req, res) {
  const pool = requireConnection(res);
  if (!pool) return;

  let sql;
  try {
    sql = validateReadOnly(req.body?.sql);
    if (!/^(SELECT|WITH)\b/i.test(sql)) {
      return res.status(400).json({
        ok: false,
        message: "Analysis is supported only for SELECT queries.",
      });
    }
  } catch (err) {
    if (err instanceof SqlGuardError) {
      return res
        .status(400)
        .json({ ok: false, kind: "guard", message: err.message });
    }
    throw err;
  }

  try {
    const explainStarted = performance.now();
    const [planRows] = await pool.query({
      sql: `EXPLAIN FORMAT=JSON ${sql}`,
      timeout: QUERY_TIMEOUT_MS,
    });
    const explainMs = Number((performance.now() - explainStarted).toFixed(2));
    const rawPlan = planRows[0]?.EXPLAIN;
    const executionPlan =
      typeof rawPlan === "string" ? JSON.parse(rawPlan) : rawPlan;
    const tables = extractPlanDetails(executionPlan);

    // Findings are regenerated from this exact SQL and its current plan.
    const { issues: ruleIssues, suggestedQuery: ruleSuggestedQuery } =
      generateSuggestions(sql, tables);
    const schema = await getSchemaContext(pool, tables);

    let llmResult = null;
    let llmError = null;
    try {
      llmResult = await optimizeQuery({
        sql,
        schema,
        executionPlan,
        ruleBasedIssues: ruleIssues,
      });
    } catch (err) {
      llmError = err.message;
    }

    // Prefer the deterministic rule rewrite. Accept an LLM rewrite only when
    // it is valid and actually differs from the input query.
    let suggestedQuery = ruleSuggestedQuery;
    if (suggestedQuery.trim() === sql.trim() && llmResult?.optimizedQuery) {
      try {
        const candidate = validateOptimizedQuery(llmResult.optimizedQuery);
        if (candidate.trim() !== sql.trim()) suggestedQuery = candidate;
      } catch (err) {
        llmError = `Invalid LLM suggestion: ${err.message}`;
      }
    }

    // Offer a rewrite only if MySQL can parse and plan it.
    if (
      suggestedQuery.trim() !== sql.trim() &&
      !(await isExplainable(pool, suggestedQuery))
    ) {
      llmError =
        "The suggested rewrite could not be validated by MySQL, so it was not offered.";
      suggestedQuery = sql;
    }

    // Index SQL is only shown when the connected user is allowed to run it.
    // The reasoning stays visible either way.
    const canIndex = await canCreateIndexes(pool);
    const indexRecommendations = sanitizeIndexRecommendations(
      llmResult?.indexRecommendations,
      schema,
      tables,
    ).map((item) => (canIndex ? item : { ...item, sql: null }));

    // Findings come only from this SQL and this MySQL plan. Do not append
    // LLM issue lists, which may be speculative or duplicate older findings.
    return res.json({
      ok: true,
      originalQuery: sql,
      suggestedQuery,
      issues: ruleIssues,
      tables,
      executionPlan,
      explainMs,
      querySummary: summarizeQuery(sql, tables),
      llmExplanation: llmResult?.explanation ?? null,
      indexRecommendations,
      canCreateIndexes: canIndex,
      llmUsed: Boolean(llmResult),
      llmError,
    });
  } catch (err) {
    return res.status(400).json({
      ok: false,
      kind: "analysis",
      message: err.sqlMessage || err.message || friendlyError(err),
      code: err.code ?? null,
    });
  }
}

async function getSchemaContext(pool, tables) {
  const tableNames = [
    ...new Set(
      tables
        .map((table) => table.table)
        .filter((name) => typeof name === "string"),
    ),
  ];

  if (tableNames.length === 0) {
    return {
      columns: [],
      indexes: [],
    };
  }

  const placeholders = tableNames.map(() => "?").join(", ");

  const [columns] = await pool.query(
    `
      SELECT
        TABLE_NAME,
        COLUMN_NAME,
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_KEY
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN (${placeholders})
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `,
    tableNames,
  );

  const [indexes] = await pool.query(
    `
      SELECT
        TABLE_NAME,
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        SEQ_IN_INDEX
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN (${placeholders})
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    `,
    tableNames,
  );

  return {
    columns,
    indexes,
  };
}

function validateOptimizedQuery(query) {
  if (typeof query !== "string" || !query.trim()) {
    throw new Error("LLM did not generate a valid SQL query.");
  }

  const validated = validateReadOnly(query);

  const firstWord = validated.split(/\s+/)[0].toUpperCase();

  if (!["SELECT", "WITH"].includes(firstWord)) {
    throw new Error("LLM generated an unsupported query type.");
  }

  return validated;
}