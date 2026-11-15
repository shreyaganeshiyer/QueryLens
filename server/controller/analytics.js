import { appPool } from '../utility/appDb.js';

// Fixed whitelist. Only these values ever reach SQL text.
const RANGES = {
  '24h': { seconds: 24 * 3600, bucketFormat: '%Y-%m-%d %H:00' },
  '7d': { seconds: 7 * 86400, bucketFormat: '%Y-%m-%d' },
  '30d': { seconds: 30 * 86400, bucketFormat: '%Y-%m-%d' },
};

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseFilters(req) {
  const range = RANGES[req.query.range] ? req.query.range : '7d';
  const connection =
    typeof req.query.connection === 'string' && req.query.connection.trim()
      ? req.query.connection.trim().slice(0, 120)
      : null;

  return {
    range,
    ...RANGES[range],
    slowMs: clampInt(req.query.slowMs, 1, 3600000, 1000),
    connection,
  };
}

// Every analytics query is scoped to the logged-in user.
function baseWhere(userId, f) {
  const clauses = ['user_id = ?', 'created_at >= NOW() - INTERVAL ? SECOND'];
  const params = [userId, f.seconds];
  if (f.connection) {
    clauses.push('connection_name = ?');
    params.push(f.connection);
  }
  return { sql: clauses.join(' AND '), params };
}

const round1 = (n) => Math.round(n * 10) / 10;

// GET /api/analytics/overview?range=7d&slowMs=1000&connection=...
export async function getOverview(req, res) {
  try {
    const f = parseFilters(req);
    const w = baseWhere(req.user.id, f);

    const [rows] = await appPool.query(
      `SELECT
          COUNT(*) AS total,
          SUM(status = 'success') AS successes,
          SUM(status = 'error') AS failures,
          AVG(CASE WHEN status = 'success' THEN duration_ms END) AS avgDurationMs,
          MAX(duration_ms) AS maxDurationMs,
          SUM(CASE WHEN status = 'success' AND duration_ms >= ? THEN 1 ELSE 0 END) AS slowCount
         FROM query_history
        WHERE ${w.sql}`,
      [f.slowMs, ...w.params]
    );

    const r = rows[0];
    const total = Number(r.total) || 0;
    const successes = Number(r.successes) || 0;

    res.json({
      ok: true,
      range: f.range,
      slowMs: f.slowMs,
      totals: {
        total,
        successes,
        failures: Number(r.failures) || 0,
        successRate: total ? round1((successes / total) * 100) : null,
        avgDurationMs: r.avgDurationMs == null ? null : Math.round(Number(r.avgDurationMs)),
        maxDurationMs: r.maxDurationMs == null ? null : Number(r.maxDurationMs),
        slowCount: Number(r.slowCount) || 0,
      },
    });
  } catch (err) {
    console.error('getOverview failed:', err);
    res.status(500).json({ ok: false, message: 'Could not load overview' });
  }
}

// GET /api/analytics/trends?range=7d&connection=...
export async function getTrends(req, res) {
  try {
    const f = parseFilters(req);
    const w = baseWhere(req.user.id, f);

    // bucketFormat comes from the RANGES whitelist, so interpolating it is safe.
    const [rows] = await appPool.query(
      `SELECT
          DATE_FORMAT(created_at, '${f.bucketFormat}') AS bucket,
          COUNT(*) AS total,
          SUM(status = 'success') AS successes,
          SUM(status = 'error') AS failures,
          AVG(CASE WHEN status = 'success' THEN duration_ms END) AS avgDurationMs
         FROM query_history
        WHERE ${w.sql}
        GROUP BY bucket
        ORDER BY bucket`,
      w.params
    );

    res.json({
      ok: true,
      range: f.range,
      points: rows.map((row) => ({
        bucket: row.bucket,
        total: Number(row.total) || 0,
        successes: Number(row.successes) || 0,
        failures: Number(row.failures) || 0,
        avgDurationMs: row.avgDurationMs == null ? null : Math.round(Number(row.avgDurationMs)),
      })),
    });
  } catch (err) {
    console.error('getTrends failed:', err);
    res.status(500).json({ ok: false, message: 'Could not load trends' });
  }
}

// GET /api/analytics/slow-queries?range=7d&slowMs=1000&limit=20&connection=...
// Groups by exact SQL text for now. Normalized digests come later.
export async function getSlowQueries(req, res) {
  try {
    const f = parseFilters(req);
    const w = baseWhere(req.user.id, f);
    const limit = clampInt(req.query.limit, 1, 100, 20);

    const [rows] = await appPool.query(
      `SELECT
          sql_text AS sqlText,
          COUNT(*) AS executions,
          AVG(duration_ms) AS avgMs,
          MAX(duration_ms) AS maxMs,
          SUM(duration_ms) AS totalMs,
          MAX(created_at) AS lastExecutedAt
         FROM query_history
        WHERE ${w.sql} AND status = 'success'
        GROUP BY sql_text
        ORDER BY avgMs DESC
        LIMIT ?`,
      [...w.params, limit]
    );

    res.json({
      ok: true,
      range: f.range,
      slowMs: f.slowMs,
      queries: rows.map((row) => {
        const avgMs = Math.round(Number(row.avgMs) || 0);
        return {
          sqlText: row.sqlText,
          executions: Number(row.executions) || 0,
          avgMs,
          maxMs: Number(row.maxMs) || 0,
          totalMs: Number(row.totalMs) || 0,
          lastExecutedAt: row.lastExecutedAt,
          status: avgMs >= f.slowMs ? 'slow' : 'ok',
        };
      }),
    });
  } catch (err) {
    console.error('getSlowQueries failed:', err);
    res.status(500).json({ ok: false, message: 'Could not load slow queries' });
  }
}