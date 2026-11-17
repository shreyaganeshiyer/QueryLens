// Small helpers for summarising EXPLAIN table rows. Kept separate from the
// React components so Vite's fast refresh only sees component exports.

export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Unknown";
  }
  return Number(value).toLocaleString();
}

export function sumRowsExamined(tables = []) {
  return tables.reduce(
    (total, table) => total + (Number(table.rowsExamined) || 0),
    0,
  );
}

export function countFullScans(tables = []) {
  return tables.filter((table) => table.accessType === "ALL").length;
}

export function formatKeys(keys) {
  if (Array.isArray(keys)) return keys.join(", ") || "None";
  return keys || "None";
}

// Describes the change from the original plan to the optimized plan.
export function describeChange(original, optimized, { lowerIsBetter = true } = {}) {
  if (original === optimized) return "No change";
  const improved = lowerIsBetter ? optimized < original : optimized > original;
  return improved ? "Improved" : "Worse than the original";
}
