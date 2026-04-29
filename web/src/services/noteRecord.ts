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

export function getCreatedAtTimestamp(value: { createdAt?: string; updatedAt: string }) {
  const ts = new Date(value.createdAt || value.updatedAt).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

export function sortByCreatedAt<T extends { createdAt?: string; updatedAt: string }>(records: T[]) {
  return [...records].sort((a, b) => {
    const createdDiff = getCreatedAtTimestamp(b) - getCreatedAtTimestamp(a);
    if (createdDiff !== 0) return createdDiff;
    return getUpdatedAtTimestamp(b) - getUpdatedAtTimestamp(a);
  });
}
