import { reactive, ref } from 'vue';
import { getApiErrorMessage } from './apiTransport';
import { getUpdatedAtTimestamp, parseStoredJson, sortByUpdatedAt } from './noteRecord';

export const NOTES_DRAFT_KEY = 'notea_note_draft';
export const NOTES_LIST_KEY = 'notea_notes';
const NOTE_SYNC_META_KEY = 'notea_note_sync_meta';
const NOTE_PENDING_DELETES_KEY = 'notea_pending_note_deletes';

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
  sessionTitle?: string;
  teaName: string;
  teaType: string;
  region: string;
  originDetail?: string;
  cultivar?: string;
  source?: string;
  processingStyle?: string;
  harvestSeason?: string;
  harvestYear?: number | null;
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
  freeText: string;
  ratings: NoteRatings;
  updatedAt: string;
};

function sortNotes(records: NoteRecord[]) {
  return sortByUpdatedAt(records);
}

function readSyncMetaMap(): NoteSyncMetaMap {
  return parseStoredJson<NoteSyncMetaMap>(localStorage.getItem(NOTE_SYNC_META_KEY), {});
}

function writeSyncMetaMap(map: NoteSyncMetaMap) {
  localStorage.setItem(NOTE_SYNC_META_KEY, JSON.stringify(map));
  bumpSyncRevision();
}

function readPendingDeletes(): string[] {
  return parseStoredJson<string[]>(localStorage.getItem(NOTE_PENDING_DELETES_KEY), []);
}

function readPendingDeleteSet() {
  return new Set(readPendingDeletes());
}

function writePendingDeletes(ids: string[]) {
  localStorage.setItem(NOTE_PENDING_DELETES_KEY, JSON.stringify([...new Set(ids)]));
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
  localStorage.setItem(NOTES_LIST_KEY, JSON.stringify(sortNotes(records).slice(0, 200)));
}

function persistDraft(note: NoteRecord | null) {
  if (!note) {
    localStorage.removeItem(NOTES_DRAFT_KEY);
  } else {
    localStorage.setItem(NOTES_DRAFT_KEY, JSON.stringify(note));
  }
  bumpNotesRevision();
}

/** Проставляет id для записей из старых версий приложения (до появления поля id). */
function migrateStoredNotesIfNeeded() {
  const raw = localStorage.getItem(NOTES_LIST_KEY);
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
    const id = (n as NoteRecord).id;
    if (typeof id === 'string' && id.length > 0) return n as NoteRecord;
    changed = true;
    return { ...(n as NoteRecord), id: crypto.randomUUID() };
  });
  if (changed) {
    localStorage.setItem(NOTES_LIST_KEY, JSON.stringify(next));
  }
}

function loadNotesFromStorage(): NoteRecord[] {
  migrateStoredNotesIfNeeded();
  return parseStoredJson<NoteRecord[]>(localStorage.getItem(NOTES_LIST_KEY), []);
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
      const { listTeaNotesRemote } = await import('./noteApi');
      const records = await listTeaNotesRemote(300, 0);
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
  return parseStoredJson<NoteRecord | null>(localStorage.getItem(NOTES_DRAFT_KEY), null);
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

function baseNote(overrides: Partial<NoteRecord> & Pick<NoteRecord, 'teaName' | 'teaType' | 'region' | 'updatedAt'>): NoteRecord {
  return {
    id: '',
    noteColor: '',
    brewingMode: 'gongfu',
    brewingMethod: '',
    waterSource: '',
    setupId: null,
    setupSummary: '',
    leafGrams: 5,
    waterTemp: 95,
    waterVolumeMl: 100,
    rinseCount: 1,
    infusionsCount: 6,
    timeValue: 15,
    timeUnit: 'сек',
    descriptors: [],
    liquorColor: '',
    mouthfeel: '',
    energyEffect: '',
    freeText: '',
    ratings: { aroma: 4, taste: 4, aftertaste: 4, balance: 4 },
    ...overrides,
  };
}

/**
 * Демо для профиля / аналитики / круга нот.
 * Семьи на круге: лидеры woody + mineral + sweet (много отметок), средние fruity и floral,
 * нули — herbal, spicy, roasted, umami (сегменты и подписи остаются «призраками»).
 * Формат дескрипторов: family:group:note — как при выборе третьего уровня в круге новой заметки.
 */
export function buildDemoNoteRecords(): NoteRecord[] {
  return [
    baseNote({
      sessionTitle: 'Утренний гунфу перед работой',
      teaName: 'Лао Бан Чжан',
      teaType: 'Шен пуэр',
      region: 'Юньнань',
      originDetail: 'Мэнхай, старые деревья',
      cultivar: 'Да Е Чжун',
      source: 'Магазин',
      processingStyle: 'Свежий',
      harvestSeason: 'spring',
      harvestYear: 2025,
      brewingMethod: 'Гайвань 95 мл, быстрые проливы с прогревом посуды',
      waterSource: 'Фильтрованная',
      setupId: 'gaiwan-jade-95',
      setupSummary: 'Гайвань 95 мл + пиалы',
      leafGrams: 6.5,
      waterTemp: 96,
      waterVolumeMl: 95,
      rinseCount: 1,
      infusionsCount: 8,
      timeValue: 12,
      liquorColor: 'gold',
      mouthfeel: 'juicy',
      energyEffect: 'focused',
      freeText: 'Плотный старт, затем быстро проявилась сладость и минеральная глубина.',
      updatedAt: '2026-03-28T10:00:00.000Z',
      descriptors: ['woody:dry-wood:cedar', 'mineral:water:spring-water', 'sweet:sugar:rock-candy'],
      ratings: { aroma: 5, taste: 5, aftertaste: 4, balance: 5 },
    }),
    baseNote({
      sessionTitle: 'Сравнение двух И У вечером',
      teaName: 'И У «Бань Чжан деревня»',
      teaType: 'Шен пуэр',
      region: 'Юньнань',
      originDetail: 'И У, деревня Бань Чжан',
      cultivar: 'Да Е Чжун',
      source: 'Путешествие',
      processingStyle: 'Выдержанный',
      harvestSeason: 'spring',
      harvestYear: 2024,
      brewingMethod: 'Фарфоровая гайвань, чуть длиннее первые проливы',
      waterSource: 'Бутилированная',
      setupId: 'porcelain-gaiwan-100',
      setupSummary: 'Фарфоровая гайвань 100 мл',
      leafGrams: 6,
      waterTemp: 95,
      waterVolumeMl: 100,
      rinseCount: 1,
      infusionsCount: 7,
      timeValue: 15,
      liquorColor: 'gold',
      mouthfeel: 'silky',
      energyEffect: 'quiet',
      freeText: 'Мягче и светлее, чем ЛБЧ, с длинным сладким хвостом.',
      updatedAt: '2026-03-27T11:00:00.000Z',
      descriptors: ['woody:forest:moss', 'mineral:stone:wet-stone', 'sweet:honey-caramel:honey'],
      ratings: { aroma: 4, taste: 5, aftertaste: 5, balance: 4 },
    }),
    baseNote({
      sessionTitle: 'Глубокий шен в дождливый день',
      teaName: 'Мэнхай дикий шен',
      teaType: 'Шен пуэр',
      region: 'Юньнань',
      originDetail: 'Мэнхай, дикие деревья',
      cultivar: 'Да Е Чжун',
      source: 'Чайный клуб',
      processingStyle: 'Выдержанный',
      harvestSeason: 'spring',
      harvestYear: 2023,
      brewingMethod: 'Исинец 90 мл, плотная навеска',
      waterSource: 'Осмос + минерализация',
      setupId: 'yixing-dark-90',
      setupSummary: 'Исинец 90 мл + пиалы',
      leafGrams: 7,
      waterTemp: 97,
      waterVolumeMl: 90,
      rinseCount: 1,
      infusionsCount: 9,
      timeValue: 10,
      liquorColor: 'amber',
      mouthfeel: 'dense',
      energyEffect: 'strong',
      freeText: 'Самый телесный и мощный среди шенов, долго держит вкус.',
      updatedAt: '2026-03-26T09:00:00.000Z',
      descriptors: ['woody:aged-wood:resin', 'mineral:metallic:iron', 'sweet:pastry:vanilla'],
      ratings: { aroma: 5, taste: 4, aftertaste: 4, balance: 4 },
    }),
    baseNote({
      sessionTitle: 'Холодный настой на весь день',
      teaName: 'Гу Шу Юньнань',
      teaType: 'Шен пуэр',
      region: 'Юньнань',
      originDetail: 'Линьцан, старые деревья',
      cultivar: 'Да Е Чжун',
      source: 'Личный запас',
      processingStyle: 'Свежий',
      harvestSeason: 'spring',
      harvestYear: 2025,
      brewingMode: 'coldbrew',
      brewingMethod: 'Холодный настой в стекле на 8 часов',
      waterSource: 'Бутилированная',
      setupId: 'glass-bottle-600',
      setupSummary: 'Стеклянная бутылка 600 мл',
      leafGrams: 4,
      waterTemp: 8,
      waterVolumeMl: 600,
      rinseCount: null,
      infusionsCount: 1,
      timeValue: 8,
      timeUnit: 'ч',
      liquorColor: 'very-light',
      mouthfeel: 'airy',
      energyEffect: 'uplifting',
      skippedFields: ['rinseCount'],
      freeText: 'Очень прозрачный настой с мягкой медовой сладостью.',
      updatedAt: '2026-03-25T14:00:00.000Z',
      descriptors: ['mineral:stone:wet-stone', 'sweet:sugar:syrup', 'woody:dry-wood:bark'],
      ratings: { aroma: 4, taste: 4, aftertaste: 4, balance: 5 },
    }),
    baseNote({
      sessionTitle: 'Субботняя долгая сессия',
      teaName: 'Нака #301 блин',
      teaType: 'Шен пуэр',
      region: 'Юньнань',
      originDetail: 'Нака, блины весеннего сбора',
      cultivar: 'Да Е Чжун',
      source: 'Магазин',
      processingStyle: 'Выдержанный',
      harvestSeason: 'autumn',
      harvestYear: 2022,
      brewingMethod: 'Гайвань, длинная медленная серия проливов',
      waterSource: 'Фильтрованная',
      setupId: 'gaiwan-stone-100',
      setupSummary: 'Гайвань 100 мл + чахай',
      leafGrams: 6.8,
      waterTemp: 96,
      waterVolumeMl: 100,
      rinseCount: 1,
      infusionsCount: 10,
      timeValue: 14,
      liquorColor: 'amber',
      mouthfeel: 'oily',
      energyEffect: 'focused',
      freeText: 'Очень ровная сессия с нарастающей сладостью и маслянистым телом.',
      updatedAt: '2026-03-24T16:00:00.000Z',
      descriptors: ['woody:forest:fallen-leaves', 'mineral:water:mountain-stream', 'sweet:honey-caramel:caramel'],
      ratings: { aroma: 4, taste: 5, aftertaste: 4, balance: 4 },
    }),
    baseNote({
      sessionTitle: 'Поздний выдержанный шен',
      teaName: 'Булан шен агинг',
      teaType: 'Шен пуэр',
      region: 'Юньнань',
      originDetail: 'Буланшань',
      cultivar: 'Да Е Чжун',
      source: 'Обмен',
      processingStyle: 'Выдержанный',
      harvestSeason: 'autumn',
      harvestYear: 2021,
      brewingMethod: 'Исинец и короткие импульсные проливы',
      waterSource: 'Родниковая',
      setupId: 'yixing-aged-85',
      setupSummary: 'Исинец 85 мл',
      leafGrams: 6.2,
      waterTemp: 98,
      waterVolumeMl: 85,
      rinseCount: 1,
      infusionsCount: 9,
      timeValue: 11,
      liquorColor: 'orange',
      mouthfeel: 'dense',
      energyEffect: 'warm',
      freeText: 'Более зрелый профиль, меньше резкости, больше древесной теплоты.',
      updatedAt: '2026-03-23T12:00:00.000Z',
      descriptors: ['woody:aged-wood:old-cabinet', 'mineral:metallic:cool-metal', 'sweet:sugar:brown-sugar'],
      ratings: { aroma: 5, taste: 4, aftertaste: 5, balance: 5 },
    }),
    baseNote({
      sessionTitle: 'Утёсный улун наедине',
      teaName: 'Да Хун Пао ортодокс',
      teaType: 'Улун',
      region: 'Фуцзянь',
      originDetail: 'Уишань, утёсный участок',
      cultivar: 'Жоу Гуй',
      source: 'Магазин',
      processingStyle: 'Сильная обжарка',
      harvestSeason: 'autumn',
      harvestYear: 2024,
      updatedAt: '2026-03-22T10:00:00.000Z',
      descriptors: ['woody:dry-wood:oak', 'mineral:stone:slate'],
      ratings: { aroma: 5, taste: 5, aftertaste: 3, balance: 4 },
      brewingMode: 'steep',
      brewingMethod: 'Настаивание в фарфоровом чайнике',
      waterSource: 'Фильтрованная',
      setupId: 'teapot-porcelain-180',
      setupSummary: 'Фарфоровый чайник 180 мл',
      leafGrams: 5.5,
      waterTemp: 98,
      waterVolumeMl: 180,
      rinseCount: 1,
      infusionsCount: 3,
      timeValue: 3,
      timeUnit: 'мин',
      liquorColor: 'orange',
      mouthfeel: 'oily',
      energyEffect: 'warm',
      freeText: 'Утёсная минералка и тёплая обжарка, короткий но яркий профиль.',
    }),
    baseNote({
      sessionTitle: 'Тайваньский улун после обеда',
      teaName: 'Телега «минеральный улун»',
      teaType: 'Улун',
      region: 'Тайвань',
      originDetail: 'Высокогорье Тайваня',
      cultivar: 'Цин Синь',
      source: 'Подарок',
      processingStyle: 'Средняя обжарка',
      harvestSeason: 'winter',
      harvestYear: 2024,
      brewingMethod: 'Гайвань, высокая температура и ровные проливы',
      waterSource: 'Бутилированная',
      setupId: 'thin-porcelain-90',
      setupSummary: 'Тонкостенная гайвань 90 мл',
      leafGrams: 6,
      waterTemp: 94,
      waterVolumeMl: 90,
      rinseCount: 1,
      infusionsCount: 7,
      timeValue: 18,
      liquorColor: 'gold',
      mouthfeel: 'silky',
      energyEffect: 'focused',
      freeText: 'Чистый и собранный улун с красивым минеральным шлейфом.',
      updatedAt: '2026-03-21T18:00:00.000Z',
      descriptors: ['woody:forest:wet-forest', 'mineral:water:saline'],
      ratings: { aroma: 4, taste: 4, aftertaste: 4, balance: 5 },
    }),
    baseNote({
      sessionTitle: 'Каменный улун на встрече',
      teaName: 'Каменистый Фуцзянь',
      teaType: 'Улун',
      region: 'Фуцзянь',
      originDetail: 'Уишань',
      cultivar: 'Шуй Сянь',
      source: 'Чайный клуб',
      processingStyle: 'Charcoal roast',
      harvestSeason: 'summer',
      harvestYear: 2023,
      brewingMethod: 'Чайник 120 мл, короткие ровные проливы',
      waterSource: 'Фильтрованная',
      setupId: 'clay-pot-120',
      setupSummary: 'Чайник 120 мл + чахай',
      leafGrams: 6.3,
      waterTemp: 97,
      waterVolumeMl: 120,
      rinseCount: 1,
      infusionsCount: 6,
      timeValue: 16,
      liquorColor: 'amber',
      mouthfeel: 'dense',
      energyEffect: 'quiet',
      freeText: 'Сухая каменная линия и хороший минеральный отклик во вкусе.',
      updatedAt: '2026-03-20T09:00:00.000Z',
      descriptors: ['mineral:metallic:rain', 'woody:aged-wood:cedar-box'],
      ratings: { aroma: 4, taste: 4, aftertaste: 4, balance: 4 },
    }),
    baseNote({
      sessionTitle: 'Высокогорный улун на закате',
      teaName: 'Алишань высокогорный',
      teaType: 'Улун',
      region: 'Тайвань',
      originDetail: 'Алишань',
      cultivar: 'Цин Синь',
      source: 'Магазин',
      processingStyle: 'Свежий',
      harvestSeason: 'winter',
      harvestYear: 2025,
      brewingMethod: 'Гайвань 100 мл, мягкая вода',
      waterSource: 'Осмос + минерализация',
      setupId: 'gaiwan-white-100',
      setupSummary: 'Белая гайвань 100 мл',
      leafGrams: 5.8,
      waterTemp: 92,
      waterVolumeMl: 100,
      rinseCount: 1,
      infusionsCount: 7,
      timeValue: 20,
      liquorColor: 'gold',
      mouthfeel: 'silky',
      energyEffect: 'quiet',
      freeText: 'Цветочность и сливочная сладость, очень ровная текстура.',
      updatedAt: '2026-03-19T08:45:00.000Z',
      descriptors: ['floral:white:magnolia', 'fruity:stone:peach', 'sweet:pastry:biscuit'],
      ratings: { aroma: 5, taste: 4, aftertaste: 4, balance: 5 },
    }),
    baseNote({
      sessionTitle: 'Красный чай под чтение',
      teaName: 'Дун Фан Цзинь Цзюнь',
      teaType: 'Красный',
      region: 'Фуцзянь',
      originDetail: 'Фуцзянь, кусты для красного чая',
      cultivar: 'Мэй Чжань',
      source: 'Подарок',
      processingStyle: 'Сильная ферментация',
      harvestSeason: 'spring',
      harvestYear: 2024,
      brewingMode: 'steep',
      brewingMethod: 'Настой в стеклянном чайнике',
      waterSource: 'Бутилированная',
      setupId: 'glass-pot-300',
      setupSummary: 'Стеклянный чайник 300 мл',
      leafGrams: 4.5,
      waterTemp: 92,
      waterVolumeMl: 300,
      rinseCount: 0,
      infusionsCount: 2,
      timeValue: 4,
      timeUnit: 'мин',
      liquorColor: 'red-brown',
      mouthfeel: 'juicy',
      energyEffect: 'warm',
      freeText: 'Очень ягодный и сладкий красный с ярким ароматом сухого листа.',
      updatedAt: '2026-03-18T19:00:00.000Z',
      descriptors: ['fruity:orchard:pear', 'sweet:honey-caramel:toffee'],
      ratings: { aroma: 5, taste: 5, aftertaste: 5, balance: 5 },
    }),
    baseNote({
      sessionTitle: 'Минеральный красный утром',
      teaName: 'Минералка + мёд',
      teaType: 'Красный',
      region: 'Фуцзянь',
      originDetail: 'Северный Фуцзянь',
      cultivar: 'Шуй Сянь',
      source: 'Личный запас',
      processingStyle: 'Средняя обжарка',
      harvestSeason: 'autumn',
      harvestYear: 2023,
      brewingMode: 'steep',
      brewingMethod: 'Фарфоровый чайник и короткий настой',
      waterSource: 'Фильтрованная',
      setupId: 'porcelain-pot-220',
      setupSummary: 'Фарфоровый чайник 220 мл',
      leafGrams: 5,
      waterTemp: 93,
      waterVolumeMl: 220,
      rinseCount: 0,
      infusionsCount: 2,
      timeValue: 3,
      timeUnit: 'мин',
      liquorColor: 'amber',
      mouthfeel: 'oily',
      energyEffect: 'focused',
      freeText: 'Интересное сочетание медовой сладости и минералки в послевкусии.',
      updatedAt: '2026-03-17T14:00:00.000Z',
      descriptors: ['mineral:stone:flint', 'sweet:pastry:cookie'],
      ratings: { aroma: 4, taste: 4, aftertaste: 4, balance: 4 },
    }),
    baseNote({
      sessionTitle: 'Белый чай для тихого утра',
      teaName: 'Фудин Бай Му Дань',
      teaType: 'Белый',
      region: 'Фуцзянь',
      originDetail: 'Фудин',
      cultivar: 'Бай Хао',
      source: 'Магазин',
      processingStyle: 'Свежий',
      harvestSeason: 'spring',
      harvestYear: 2025,
      brewingMethod: 'Гайвань 110 мл, спокойные длинные проливы',
      waterSource: 'Родниковая',
      setupId: 'gaiwan-ivory-110',
      setupSummary: 'Гайвань 110 мл + стеклянный чахай',
      leafGrams: 5.5,
      waterTemp: 88,
      waterVolumeMl: 110,
      rinseCount: 0,
      infusionsCount: 6,
      timeValue: 25,
      liquorColor: 'very-light',
      mouthfeel: 'airy',
      energyEffect: 'quiet',
      freeText: 'Самая светлая и тихая сессия, много цветочности и деликатной сладости.',
      updatedAt: '2026-03-16T09:00:00.000Z',
      descriptors: ['floral:garden:lilac', 'sweet:honey-caramel:condensed-milk'],
      ratings: { aroma: 4, taste: 4, aftertaste: 4, balance: 5 },
    }),
  ].map((row, index) => ({
    ...row,
    id: `00000000-0000-4000-a000-${String(index + 1).padStart(12, '0')}`,
  }));
}

/** Записать демо-заметки в localStorage (для проверки профиля и аналитики). */
export function seedDemoNotes(options?: { replace?: boolean }) {
  const replace = options?.replace ?? true;
  const demo = buildDemoNoteRecords();
  if (replace) {
    localStorage.setItem(NOTES_LIST_KEY, JSON.stringify(demo));
    localStorage.setItem(
      NOTES_DRAFT_KEY,
      JSON.stringify(
        baseNote({
          id: crypto.randomUUID(),
          sessionTitle: 'Черновик воскресной дегустации',
          teaName: 'Черновик: сравнение двух шенов',
          teaType: 'Шен пуэр',
          region: 'Юньнань',
          brewingMethod: 'Сравнить две гайвани и записать разницу после второй сессии',
          waterSource: 'Фильтрованная',
          setupSummary: 'Две гайвани 100 мл',
          updatedAt: new Date().toISOString(),
          freeText: 'Набросок — не забудь дописать после второй пролива.',
          descriptors: ['woody:dry-wood:sandal', 'floral:white:orange-blossom'],
          ratings: { aroma: 0, taste: 0, aftertaste: 0, balance: 0 },
        }),
      ),
    );
  } else {
    const existing = parseStoredJson<NoteRecord[]>(localStorage.getItem(NOTES_LIST_KEY), []);
    const next = [...demo, ...existing].slice(0, 200);
    localStorage.setItem(NOTES_LIST_KEY, JSON.stringify(next));
  }
  bumpNotesRevision();
}

refreshSyncCounters();
