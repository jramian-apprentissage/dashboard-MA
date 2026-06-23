const KEY = 'ma_history';
const MAX = 500;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

function save(events) {
  localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX)));
}

const RETENTION_MS = 45 * 24 * 60 * 60 * 1000;

export function trackEvent(userId, userName, type, page = null) {
  const cutoff = Date.now() - RETENTION_MS;
  const events = load().filter(e => new Date(e.timestamp).getTime() >= cutoff);
  events.push({ userId, userName, timestamp: new Date().toISOString(), type, page });
  save(events);
}

export function getHistory(userId) {
  const all = load();
  const list = userId ? all.filter(e => e.userId === userId) : all;
  return [...list].reverse();
}

export function clearHistory(userId) {
  const events = load();
  save(userId ? events.filter(e => e.userId !== userId) : []);
}
