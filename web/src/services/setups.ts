export type TeaSetup = {
  id: string;
  name: string;
  items: string[];
};

const STORAGE_KEY = 'notea_setups';

function normalize(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeItems(items: string[]) {
  return items.map(normalize).filter(Boolean);
}

export function listSetups(): TeaSetup[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((x) => x && typeof x === 'object')
      .map((x) => ({
        id: normalize(String((x as TeaSetup).id || '')),
        name: normalize(String((x as TeaSetup).name || '')),
        items: normalizeItems(Array.isArray((x as TeaSetup).items) ? (x as TeaSetup).items : []),
      }))
      .filter((x) => x.id && x.name && x.items.length > 0);
  } catch {
    return [];
  }
}

function saveSetups(setups: TeaSetup[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(setups));
}

export function addSetup(name: string, items: string[]): TeaSetup[] {
  const setupName = normalize(name);
  const setupItems = normalizeItems(items);
  if (!setupName || setupItems.length === 0) {
    return listSetups();
  }
  const current = listSetups();
  const exists = current.some((x) => x.name.toLowerCase() === setupName.toLowerCase());
  if (exists) {
    return current;
  }
  const next = [
    ...current,
    {
      id: `setup:${Date.now()}`,
      name: setupName,
      items: setupItems,
    },
  ];
  saveSetups(next);
  return next;
}

export function removeSetup(id: string): TeaSetup[] {
  const next = listSetups().filter((x) => x.id !== id);
  saveSetups(next);
  return next;
}
