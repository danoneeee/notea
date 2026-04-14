export function parseStoredJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getUpdatedAtTimestamp(value: { updatedAt: string }) {
  const ts = new Date(value.updatedAt).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

export function sortByUpdatedAt<T extends { updatedAt: string }>(records: T[]) {
  return [...records].sort((a, b) => getUpdatedAtTimestamp(b) - getUpdatedAtTimestamp(a));
}
