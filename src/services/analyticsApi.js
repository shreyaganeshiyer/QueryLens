const BASE = '/api/analytics';

async function request(path, params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== '')
  );
  const res = await fetch(`${BASE}${path}?${qs.toString()}`, { credentials: 'include' });
  const data = await res.json().catch(() => ({ ok: false, message: 'Bad response from server' }));
  if (!res.ok || !data.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

export const analyticsApi = {
  overview: (filters) => request('/overview', filters),
  trends: (filters) => request('/trends', filters),
  slowQueries: (filters) => request('/slow-queries', filters),
};