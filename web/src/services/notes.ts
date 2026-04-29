import { reactive, ref } from 'vue';
import { getApiErrorMessage } from './apiTransport';
import { normalizeTeaOrigin } from './originNormalization';
import { getUpdatedAtTimestamp, parseStoredJson, sortByCreatedAt } from './noteRecord';
import { getScopedStorageKey } from './storageScope';

export const NOTES_DRAFT_KEY = 'notea_note_draft';
export const NOTES_LIST_KEY = 'notea_notes';
const NOTE_SYNC_META_KEY = 'notea_note_sync_meta';
const NOTE_PENDING_DELETES_KEY = 'notea_pending_note_deletes';
const LEGACY_DEMO_NOTE_PREFIX = '00000000-0000-4000-a000-';

/** Инкрементируется при изменении списка заметок в storage — чтобы computed в UI пересчитался. */
export const notesRevision = ref(0);
export const notesSyncRevision = ref(0);

export type NoteSyncStatus = 'local' | 'syncing' | 'synced' | 'error';

type NoteSyncMeta = {
  status: NoteSyncStatus;
  error?: string;
  syncedAt?: string;
};

type NoteSyncMetaMap = Record<string, NoteSyncMeta>;

export const notesSyncState = reactive({
  hydrating: false,
  flushing: false,
  pendingCount: 0,
  lastError: '' as string,
  lastSyncedAt: '' as string,
});

let flushInFlight: Promise<void> | null = null;
let hydrateInFlight: Promise<void> | null = null;

function getNotesListKey() {
  return getScopedStorageKey(NOTES_LIST_KEY);
}

function getNotesDraftKey() {
  return getScopedStorageKey(NOTES_DRAFT_KEY);
}

function getSyncMetaKey() {
  return getScopedStorageKey(NOTE_SYNC_META_KEY);
}

function getPendingDeletesKey() {
  return getScopedStorageKey(NOTE_PENDING_DELETES_KEY);
}

function bumpSyncRevision() {
  notesSyncRevision.value += 1;
}

function bumpNotesRevision() {
  notesRevision.value += 1;
  notesSyncRevision.value += 1;
  refreshSyncCounters();
}

export type NoteRatings = {
  aroma: number;
  taste: number;
  aftertaste: number;
  balance: number;
};

export type NoteRecord = {
  /** Стабильный id (UUID); нужен для синхронизации с сервером. */
  id: string;
  noteColor?: string;
  isFavorite?: boolean;
  sessionTitle?: string;
  teaName: string;
  teaType: string;
  /** Страна происхождения (как в форме). */
  country: string;
  /** Провинция / регион (как в форме). */
  originRegion: string;
  /**
   * Денормализованное поле для существующей аналитики и старых записей.
   * Обычно равно originRegion или country.
   */
  region: string;
  harvestSeason?: string;
  harvestYear?: number | null;
  passportNotes?: string;
  skippedFields?: string[];
  brewingMode: 'gongfu' | 'steep' | 'coldbrew';
  brewingMethod: string;
  waterSource?: string;
  setupId: string | null;
  setupSummary: string;
  leafGrams: number | null;
  waterTemp: number | null;
  waterVolumeMl?: number | null;
  rinseCount?: number | null;
  infusionsCount?: number | null;
  timeValue: number | null;
  timeUnit: string;
  descriptors: string[];
  liquorColor?: string;
  mouthfeel?: string;
  energyEffect?: string;
  cupProfileNotes?: string;
  /** legacy: старое единое поле заметок */
  freeText: string;
  ratings: NoteRatings;
  createdAt?: string;
  updatedAt: string;
};

function sortNotes(records: NoteRecord[]) {
  return sortByCreatedAt(records);
}

function normalizeStoredNote(record: NoteRecord): NoteRecord {
  const normalizedOrigin = normalizeTeaOrigin(record.country, record.originRegion, record.region);
  return {
    ...record,
    country: normalizedOrigin.country,
    originRegion: normalizedOrigin.originRegion,
    region: normalizedOrigin.region,
    createdAt: typeof record.createdAt === 'string' && record.createdAt.trim() ? record.createdAt : record.updatedAt,
  };
}

function readSyncMetaMap(): NoteSyncMetaMap {
  return parseStoredJson<NoteSyncMetaMap>(localStorage.getItem(getSyncMetaKey()), {});
}

function writeSyncMetaMap(map: NoteSyncMetaMap) {
  localStorage.setItem(getSyncMetaKey(), JSON.stringify(map));
  bumpSyncRevision();
}

function readPendingDeletes(): string[] {
  return parseStoredJson<string[]>(localStorage.getItem(getPendingDeletesKey()), []);
}

function readPendingDeleteSet() {
  return new Set(readPendingDeletes());
}

function writePendingDeletes(ids: string[]) {
  localStorage.setItem(getPendingDeletesKey(), JSON.stringify([...new Set(ids)]));
  bumpSyncRevision();
}

function refreshSyncCounters() {
  const meta = readSyncMetaMap();
  const notePending = Object.values(meta).filter((item) => item.status === 'local' || item.status === 'syncing' || item.status === 'error').length;
  notesSyncState.pendingCount = notePending + readPendingDeletes().length;
}

function setSyncMeta(noteId: string, patch: Partial<NoteSyncMeta>) {
  const meta = readSyncMetaMap();
  meta[noteId] = { ...(meta[noteId] ?? { status: 'local' as NoteSyncStatus }), ...patch };
  writeSyncMetaMap(meta);
  refreshSyncCounters();
}

function removeSyncMeta(noteId: string) {
  const meta = readSyncMetaMap();
  delete meta[noteId];
  writeSyncMetaMap(meta);
  refreshSyncCounters();
}

function storeNotes(records: NoteRecord[]) {
  localStorage.setItem(getNotesListKey(), JSON.stringify(sortNotes(records.map(normalizeStoredNote))));
}

function persistDraft(note: NoteRecord | null) {
  if (!note) {
    localStorage.removeItem(getNotesDraftKey());
  } else {
    localStorage.setItem(getNotesDraftKey(), JSON.stringify(normalizeStoredNote(note)));
  }
  bumpNotesRevision();
}

/** Проставляет id для записей из старых версий приложения (до появления поля id). */
function migrateStoredNotesIdsIfNeeded() {
  const raw = localStorage.getItem(getNotesListKey());
  if (!raw) return;
  let list: NoteRecord[];
  try {
    list = JSON.parse(raw) as NoteRecord[];
  } catch {
    return;
  }
  if (!Array.isArray(list)) return;
  let changed = false;
  const next = list.map((n) => {
    if (!n || typeof n !== 'object') return n;
    const normalized = normalizeStoredNote(n as NoteRecord);
    const id = normalized.id;
    if (typeof id === 'string' && id.length > 0) return normalized;
    changed = true;
    return { ...normalized, id: crypto.randomUUID() };
  });
  if (changed) {
    localStorage.setItem(getNotesListKey(), JSON.stringify(next));
  }
}

function clearLegacyDemoNotesIfNeeded() {
  const raw = localStorage.getItem(getNotesListKey());
  if (!raw) return;
  let list: NoteRecord[];
  try {
    list = JSON.parse(raw) as NoteRecord[];
  } catch {
    return;
  }
  if (!Array.isArray(list) || list.length === 0) return;

  const next = list.filter((note) => {
    const id = typeof note?.id === 'string' ? note.id : '';
    return !id.startsWith(LEGACY_DEMO_NOTE_PREFIX);
  });

  if (next.length === list.length) return;

  localStorage.setItem(getNotesListKey(), JSON.stringify(next.map(normalizeStoredNote)));
  const syncMeta = readSyncMetaMap();
  let syncMetaChanged = false;
  for (const note of list) {
    const id = typeof note?.id === 'string' ? note.id : '';
    if (!id.startsWith(LEGACY_DEMO_NOTE_PREFIX)) continue;
    if (syncMeta[id]) {
      delete syncMeta[id];
      syncMetaChanged = true;
    }
  }
  if (syncMetaChanged) {
    writeSyncMetaMap(syncMeta);
  }
}

function loadNotesFromStorage(): NoteRecord[] {
  migrateStoredNotesIdsIfNeeded();
  clearLegacyDemoNotesIfNeeded();
  return parseStoredJson<NoteRecord[]>(localStorage.getItem(getNotesListKey()), []).map(normalizeStoredNote);
}

export function listNotes(): NoteRecord[] {
  return sortNotes(loadNotesFromStorage());
}

function isRemoteSyncEnabled() {
  const token = localStorage.getItem('notea_access_token');
  return Boolean(token && !token.startsWith('demo:'));
}

function toSyncErrorMessage(reason: unknown) {
  return getApiErrorMessage(reason);
}

async function pushNoteToRemoteIfAuthed(note: NoteRecord) {
  if (!isRemoteSyncEnabled()) return;
  try {
    const { upsertTeaNoteRemote } = await import('./noteApi');
    setSyncMeta(note.id, { status: 'syncing', error: undefined });
    await upsertTeaNoteRemote(note);
    const now = new Date().toISOString();
    setSyncMeta(note.id, { status: 'synced', error: undefined, syncedAt: now });
    notesSyncState.lastSyncedAt = now;
  } catch (err) {
    const message = toSyncErrorMessage(err);
    setSyncMeta(note.id, { status: 'error', error: message });
    notesSyncState.lastError = message;
  }
}

async function flushPendingDeletes() {
  if (!isRemoteSyncEnabled()) return;
  const pendingDeletes = readPendingDeletes();
  if (!pendingDeletes.length) return;
  const { deleteTeaNoteRemote } = await import('./noteApi');
  const keep: string[] = [];
  for (const noteId of pendingDeletes) {
    try {
      await deleteTeaNoteRemote(noteId);
    } catch (err) {
      keep.push(noteId);
      notesSyncState.lastError = toSyncErrorMessage(err);
    }
  }
  writePendingDeletes(keep);
  refreshSyncCounters();
}

export async function flushPendingRemoteChanges() {
  if (!isRemoteSyncEnabled()) return;
  if (flushInFlight) return flushInFlight;
  flushInFlight = (async () => {
    notesSyncState.flushing = true;
    notesSyncState.lastError = '';
    try {
      await flushPendingDeletes();
      const meta = readSyncMetaMap();
      const pendingDeletes = readPendingDeleteSet();
      for (const note of listNotes()) {
        if (pendingDeletes.has(note.id)) continue;
        const status = meta[note.id]?.status;
        if (status === 'synced') continue;
        await pushNoteToRemoteIfAuthed(note);
      }
    } finally {
      notesSyncState.flushing = false;
      refreshSyncCounters();
      flushInFlight = null;
    }
  })();
  return flushInFlight;
}

function mergeLocalAndRemote(localNotes: NoteRecord[], remoteNotes: NoteRecord[]) {
  const pendingDeletes = readPendingDeleteSet();
  const remoteMap = new Map(remoteNotes.filter((note) => !pendingDeletes.has(note.id)).map((note) => [note.id, note]));
  const merged: NoteRecord[] = [];

  for (const localNote of localNotes) {
    if (pendingDeletes.has(localNote.id)) continue;
    const remoteNote = remoteMap.get(localNote.id);
    if (!remoteNote) {
      merged.push(localNote);
      setSyncMeta(localNote.id, { status: 'local' });
      continue;
    }

    if (getUpdatedAtTimestamp(localNote) > getUpdatedAtTimestamp(remoteNote)) {
      merged.push(localNote);
      setSyncMeta(localNote.id, { status: 'local' });
    } else {
      merged.push(remoteNote);
      const now = new Date().toISOString();
      setSyncMeta(remoteNote.id, { status: 'synced', error: undefined, syncedAt: now });
      notesSyncState.lastSyncedAt = now;
    }
    remoteMap.delete(localNote.id);
  }

  for (const remoteNote of remoteMap.values()) {
    merged.push(remoteNote);
    const now = new Date().toISOString();
    setSyncMeta(remoteNote.id, { status: 'synced', error: undefined, syncedAt: now });
    notesSyncState.lastSyncedAt = now;
  }

  return sortNotes(merged);
}

export function publishNote(note: NoteRecord) {
  const withId =
    typeof note.id === 'string' && note.id.length > 0 ? note : { ...note, id: crypto.randomUUID() };
  const existing = loadNotesFromStorage();
  const deduped = existing.filter((item) => item.id !== withId.id);
  storeNotes([withId, ...deduped]);
  writePendingDeletes(readPendingDeletes().filter((id) => id !== withId.id));
  setSyncMeta(withId.id, { status: 'local', error: undefined });
  bumpNotesRevision();
  void flushPendingRemoteChanges();
  return withId;
}

export const upsertRecentNote = publishNote;

/** Подтянуть журнал с сервера, слить его с локальными заметками и дотолкать несинхронизированное. */
export async function hydrateNotesFromRemote(): Promise<void> {
  if (!isRemoteSyncEnabled()) return;
  if (hydrateInFlight) return hydrateInFlight;
  hydrateInFlight = (async () => {
    notesSyncState.hydrating = true;
    notesSyncState.lastError = '';
    try {
      const { listAllTeaNotesRemote } = await import('./noteApi');
      const records = await listAllTeaNotesRemote();
      const merged = mergeLocalAndRemote(loadNotesFromStorage(), records);
      storeNotes(merged);
      bumpNotesRevision();
      await flushPendingRemoteChanges();
    } catch (err) {
      notesSyncState.lastError = toSyncErrorMessage(err);
    } finally {
      notesSyncState.hydrating = false;
      hydrateInFlight = null;
    }
  })();
  return hydrateInFlight;
}

export function getLatestDraft(): NoteRecord | null {
  return parseStoredJson<NoteRecord | null>(localStorage.getItem(getNotesDraftKey()), null);
}

export function saveDraft(note: NoteRecord) {
  const withId = typeof note.id === 'string' && note.id.length > 0 ? note : { ...note, id: crypto.randomUUID() };
  persistDraft(withId);
  return withId;
}

export function discardDraft(noteId?: string) {
  const draft = getLatestDraft();
  if (!draft) return;
  if (noteId && draft.id !== noteId) return;
  persistDraft(null);
}

export function getNoteById(noteId: string) {
  return listNotes().find((item) => item.id === noteId) ?? null;
}

export async function ensureNoteAvailable(noteId: string) {
  const local = getNoteById(noteId);
  if (local) return local;
  if (!isRemoteSyncEnabled()) return null;
  try {
    const { getTeaNoteRemote } = await import('./noteApi');
    const remote = await getTeaNoteRemote(noteId);
    if (!remote) return null;
    storeNotes([remote, ...loadNotesFromStorage().filter((item) => item.id !== remote.id)]);
    setSyncMeta(remote.id, { status: 'synced', syncedAt: new Date().toISOString(), error: undefined });
    bumpNotesRevision();
    return remote;
  } catch (err) {
    notesSyncState.lastError = toSyncErrorMessage(err);
    return null;
  }
}

export function getNoteSyncMeta(noteId: string): NoteSyncMeta | null {
  return readSyncMetaMap()[noteId] ?? null;
}

export function getNoteSyncStatus(noteId: string): NoteSyncStatus {
  return getNoteSyncMeta(noteId)?.status ?? 'synced';
}

export async function deleteNoteById(noteId: string) {
  const next = loadNotesFromStorage().filter((item) => item.id !== noteId);
  storeNotes(next);
  removeSyncMeta(noteId);
  discardDraft(noteId);
  if (isRemoteSyncEnabled()) {
    writePendingDeletes([...readPendingDeletes(), noteId]);
  }
  bumpNotesRevision();
  await flushPendingRemoteChanges();
}

refreshSyncCounters();
