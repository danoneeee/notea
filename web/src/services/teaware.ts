import { createPromiseClient } from '@bufbuild/connect';
import {
  ArchiveTeawareRequest,
  ListTeawareRequest,
  Teaware as TeawareMessage,
  TeawareType as ProtoTeawareType,
  UpsertTeawareRequest,
} from '../generated/teanotes/v1/tea_notes_pb';
import { TeaNotesService } from '../generated/teanotes/v1/tea_notes_connect';
import { apiTransport } from './apiTransport';
import { parseStoredJson } from './noteRecord';
import { getScopedStorageKey } from './storageScope';

export type TeawareType = 'teapot' | 'gaiwan' | 'pitcher' | 'cup' | 'aroma-cup' | 'thermos' | 'other';

export type TeawareItem = {
  id: string;
  name: string;
  type: TeawareType;
  color: string;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const STORAGE_KEY = 'notea_teaware';
const client = createPromiseClient(TeaNotesService, apiTransport);

function getStorageKey() {
  return getScopedStorageKey(STORAGE_KEY);
}

function normalize(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function isRemoteSyncEnabled() {
  const token = localStorage.getItem('notea_access_token');
  return Boolean(token && !token.startsWith('demo:'));
}

function normalizeType(value: unknown): TeawareType {
  const candidate = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (candidate === 'teapot' || candidate === 'gaiwan' || candidate === 'pitcher' || candidate === 'cup' || candidate === 'aroma-cup' || candidate === 'thermos') {
    return candidate;
  }
  return 'other';
}

function normalizeItem(value: unknown): TeawareItem | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<TeawareItem>;
  const item: TeawareItem = {
    id: String(raw.id || '').trim(),
    name: normalize(String(raw.name || '')),
    type: normalizeType(raw.type),
    color: String(raw.color || '#d9e6d5').trim() || '#d9e6d5',
    archived: Boolean(raw.archived),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
  return item.id && item.name ? item : null;
}

function saveTeaware(items: TeawareItem[]) {
  localStorage.setItem(getStorageKey(), JSON.stringify(items));
}

function mergeTeaware(items: TeawareItem[]) {
  const deduped = new Map<string, TeawareItem>();
  for (const item of items) {
    deduped.set(item.id, item);
  }
  const next = [...deduped.values()].filter((item) => !item.archived);
  saveTeaware(next);
  return next;
}

function protoTypeToModel(type: ProtoTeawareType): TeawareType {
  switch (type) {
    case ProtoTeawareType.TEAPOT:
      return 'teapot';
    case ProtoTeawareType.GAIWAN:
      return 'gaiwan';
    case ProtoTeawareType.CUP:
      return 'cup';
    case ProtoTeawareType.PITCHER:
      return 'pitcher';
    case ProtoTeawareType.AROMA_CUP:
      return 'aroma-cup';
    case ProtoTeawareType.THERMOS:
      return 'thermos';
    default:
      return 'other';
  }
}

function modelTypeToProto(type: TeawareType): ProtoTeawareType {
  switch (type) {
    case 'teapot':
      return ProtoTeawareType.TEAPOT;
    case 'gaiwan':
      return ProtoTeawareType.GAIWAN;
    case 'cup':
      return ProtoTeawareType.CUP;
    case 'pitcher':
      return ProtoTeawareType.PITCHER;
    case 'aroma-cup':
      return ProtoTeawareType.AROMA_CUP;
    case 'thermos':
      return ProtoTeawareType.THERMOS;
    default:
      return ProtoTeawareType.OTHER;
  }
}

function fromProto(item: TeawareMessage): TeawareItem {
  return {
    id: item.id,
    name: normalize(item.name),
    type: protoTypeToModel(item.type),
    color: item.colorHex || '#d9e6d5',
    archived: item.archived,
    createdAt: item.createdAt?.toDate().toISOString(),
    updatedAt: item.updatedAt?.toDate().toISOString(),
  };
}

export function listTeaware(): TeawareItem[] {
  return parseStoredJson<unknown[]>(localStorage.getItem(getStorageKey()), [])
    .map(normalizeItem)
    .filter((item): item is TeawareItem => Boolean(item))
    .filter((item) => !item.archived);
}

export function getTeawareNameMap() {
  return Object.fromEntries(listTeaware().map((item) => [item.id, item.name]));
}

export async function hydrateTeawareFromRemote(): Promise<TeawareItem[]> {
  if (!isRemoteSyncEnabled()) {
    return listTeaware();
  }
  const response = await client.listTeaware(new ListTeawareRequest({ includeArchived: false }));
  return mergeTeaware((response.items ?? []).map(fromProto));
}

export async function addTeaware(input: { name: string; type: TeawareType; color: string }): Promise<TeawareItem[]> {
  const name = normalize(input.name);
  if (!name) return listTeaware();

  if (!isRemoteSyncEnabled()) {
    return mergeTeaware([
      ...listTeaware(),
      {
        id: crypto.randomUUID(),
        name,
        type: input.type,
        color: input.color || '#d9e6d5',
      },
    ]);
  }

  const response = await client.upsertTeaware(
    new UpsertTeawareRequest({
      item: new TeawareMessage({
        name,
        type: modelTypeToProto(input.type),
        colorHex: input.color || '#d9e6d5',
      }),
    }),
  );

  return mergeTeaware([...listTeaware(), fromProto(response.item ?? new TeawareMessage())]);
}

export async function removeTeaware(id: string): Promise<TeawareItem[]> {
  const normalizedId = String(id || '').trim();
  if (!normalizedId) return listTeaware();

  if (!isRemoteSyncEnabled()) {
    return mergeTeaware(listTeaware().filter((item) => item.id !== normalizedId));
  }

  await client.archiveTeaware(new ArchiveTeawareRequest({ teawareId: normalizedId }));
  return mergeTeaware(listTeaware().filter((item) => item.id !== normalizedId));
}

