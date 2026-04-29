import { ref } from 'vue';
import { createPromiseClient } from '@bufbuild/connect';
import {
  ArchiveTeaSetupRequest,
  ListTeaSetupsRequest,
  TeaSetup as TeaSetupMessage,
  UpsertTeaSetupRequest,
} from '../generated/teanotes/v1/tea_notes_pb';
import { TeaNotesService } from '../generated/teanotes/v1/tea_notes_connect';
import { apiTransport } from './apiTransport';
import { parseStoredJson } from './noteRecord';
import { getScopedStorageKey } from './storageScope';
import { getTeawareNameMap } from './teaware';

export type TeaSetup = {
  id: string;
  name: string;
  teawareIds: string[];
  items: string[];
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const setupsRevision = ref(0);

const STORAGE_KEY = 'notea_setups';
const client = createPromiseClient(TeaNotesService, apiTransport);

function getStorageKey() {
  return getScopedStorageKey(STORAGE_KEY);
}

function normalize(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeStringList(items: string[]) {
  return items.map(normalize).filter(Boolean);
}

function isRemoteSyncEnabled() {
  const token = localStorage.getItem('notea_access_token');
  return Boolean(token && !token.startsWith('demo:'));
}

function resolveItems(teawareIds: string[], fallbackItems: string[] = []) {
  const nameMap = getTeawareNameMap();
  const resolved = teawareIds.map((id) => nameMap[id]).filter(Boolean);
  return resolved.length > 0 ? resolved : fallbackItems;
}

function normalizeSetup(value: unknown): TeaSetup | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<TeaSetup> & { teawareIds?: string[]; items?: string[] };
  const teawareIds = normalizeStringList(Array.isArray(raw.teawareIds) ? raw.teawareIds : []);
  const fallbackItems = normalizeStringList(Array.isArray(raw.items) ? raw.items : []);
  const setup: TeaSetup = {
    id: normalize(String(raw.id || '')),
    name: normalize(String(raw.name || '')),
    teawareIds,
    items: resolveItems(teawareIds, fallbackItems),
    archived: Boolean(raw.archived),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
  return setup.id && setup.name && setup.items.length > 0 ? setup : null;
}

function saveSetups(setups: TeaSetup[]) {
  localStorage.setItem(getStorageKey(), JSON.stringify(setups));
  setupsRevision.value += 1;
}

function mergeSetups(setups: TeaSetup[]) {
  const deduped = new Map<string, TeaSetup>();
  for (const setup of setups) {
    deduped.set(setup.id, setup);
  }
  const next = [...deduped.values()].filter((setup) => !setup.archived);
  saveSetups(next);
  return next;
}

function fromProto(setup: TeaSetupMessage): TeaSetup {
  const teawareIds = [...setup.teawareIds];
  return {
    id: setup.id,
    name: normalize(setup.name),
    teawareIds,
    items: resolveItems(teawareIds),
    archived: setup.archived,
    createdAt: setup.createdAt?.toDate().toISOString(),
    updatedAt: setup.updatedAt?.toDate().toISOString(),
  };
}

export function listSetups(): TeaSetup[] {
  return parseStoredJson<unknown[]>(localStorage.getItem(getStorageKey()), [])
    .map(normalizeSetup)
    .filter((setup): setup is TeaSetup => Boolean(setup))
    .filter((setup) => !setup.archived);
}

export async function hydrateSetupsFromRemote(): Promise<TeaSetup[]> {
  if (!isRemoteSyncEnabled()) {
    return listSetups();
  }
  const response = await client.listTeaSetups(new ListTeaSetupsRequest({ includeArchived: false }));
  return mergeSetups((response.setups ?? []).map(fromProto));
}

export async function addSetup(name: string, teawareIds: string[]): Promise<TeaSetup[]> {
  const setupName = normalize(name);
  const uniqueTeawareIds = [...new Set(normalizeStringList(teawareIds))];
  if (!setupName || uniqueTeawareIds.length === 0) {
    return listSetups();
  }

  const current = listSetups();
  const exists = current.some((setup) => setup.name.toLowerCase() === setupName.toLowerCase());
  if (exists) {
    return current;
  }

  if (!isRemoteSyncEnabled()) {
    return mergeSetups([
      ...current,
      {
        id: crypto.randomUUID(),
        name: setupName,
        teawareIds: uniqueTeawareIds,
        items: resolveItems(uniqueTeawareIds),
      },
    ]);
  }

  const response = await client.upsertTeaSetup(
    new UpsertTeaSetupRequest({
      setup: new TeaSetupMessage({
        name: setupName,
        teawareIds: uniqueTeawareIds,
      }),
    }),
  );

  return mergeSetups([...current, fromProto(response.setup ?? new TeaSetupMessage())]);
}

export async function removeSetup(id: string): Promise<TeaSetup[]> {
  const normalizedId = normalize(id);
  if (!normalizedId) {
    return listSetups();
  }

  if (!isRemoteSyncEnabled()) {
    return mergeSetups(listSetups().filter((setup) => setup.id !== normalizedId));
  }

  await client.archiveTeaSetup(new ArchiveTeaSetupRequest({ setupId: normalizedId }));
  return mergeSetups(listSetups().filter((setup) => setup.id !== normalizedId));
}
