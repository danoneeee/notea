import { ref } from 'vue';

export const NOTES_DRAFT_KEY = 'notea_note_draft';
export const NOTES_LIST_KEY = 'notea_notes';

/** Инкрементируется при изменении списка заметок в storage — чтобы computed в UI пересчитался. */
export const notesRevision = ref(0);

function bumpNotesRevision() {
  notesRevision.value += 1;
}

export type NoteRatings = {
  aroma: number;
  taste: number;
  aftertaste: number;
  balance: number;
};

export type NoteRecord = {
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

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function listNotes(): NoteRecord[] {
  const saved = parseJson<NoteRecord[]>(localStorage.getItem(NOTES_LIST_KEY), []);
  return [...saved].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function upsertRecentNote(note: NoteRecord) {
  const existing = listNotes();
  const deduped = existing.filter((item) => item.updatedAt !== note.updatedAt);
  const next = [note, ...deduped].slice(0, 200);
  localStorage.setItem(NOTES_LIST_KEY, JSON.stringify(next));
  bumpNotesRevision();
}

export function getLatestDraft(): NoteRecord | null {
  return parseJson<NoteRecord | null>(localStorage.getItem(NOTES_DRAFT_KEY), null);
}

function baseNote(overrides: Partial<NoteRecord> & Pick<NoteRecord, 'teaName' | 'teaType' | 'region' | 'updatedAt'>): NoteRecord {
  return {
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
 * Формат дескрипторов: family:index как в мастере заметки.
 */
export function buildDemoNoteRecords(): NoteRecord[] {
  return [
    // Ядро: одни и те же три семейства — яркий треугольник на круге
    baseNote({
      teaName: 'Лао Бан Чжан',
      teaType: 'Шен пуэр',
      region: 'Юньнань',
      updatedAt: '2026-03-28T10:00:00.000Z',
      descriptors: ['woody:0', 'mineral:1', 'sweet:0'],
      ratings: { aroma: 5, taste: 5, aftertaste: 4, balance: 5 },
    }),
    baseNote({
      teaName: 'И У «Бань Чжан деревня»',
      teaType: 'Шен пуэр',
      region: 'Юньнань',
      updatedAt: '2026-03-27T11:00:00.000Z',
      descriptors: ['woody:1', 'mineral:0', 'sweet:1'],
      ratings: { aroma: 4, taste: 5, aftertaste: 5, balance: 4 },
    }),
    baseNote({
      teaName: 'Мэнхай дикий шен',
      teaType: 'Шен пуэр',
      region: 'Юньнань',
      updatedAt: '2026-03-26T09:00:00.000Z',
      descriptors: ['woody:2', 'mineral:2', 'sweet:2'],
      ratings: { aroma: 5, taste: 4, aftertaste: 4, balance: 4 },
    }),
    baseNote({
      teaName: 'Гу Шу Юньнань',
      teaType: 'Шен пуэр',
      region: 'Юньнань',
      updatedAt: '2026-03-25T14:00:00.000Z',
      descriptors: ['mineral:0', 'sweet:0', 'woody:0'],
      ratings: { aroma: 4, taste: 4, aftertaste: 4, balance: 5 },
    }),
    baseNote({
      teaName: 'Нака #301 блин',
      teaType: 'Шен пуэр',
      region: 'Юньнань',
      updatedAt: '2026-03-24T16:00:00.000Z',
      descriptors: ['woody:1', 'mineral:1', 'sweet:1'],
      ratings: { aroma: 4, taste: 5, aftertaste: 4, balance: 4 },
    }),
    baseNote({
      teaName: 'Булан шен агинг',
      teaType: 'Шен пуэр',
      region: 'Юньнань',
      updatedAt: '2026-03-23T12:00:00.000Z',
      descriptors: ['woody:2', 'mineral:2', 'sweet:0'],
      ratings: { aroma: 5, taste: 4, aftertaste: 5, balance: 5 },
    }),
    // Ещё крепим лидеров, без «лишних» семейств
    baseNote({
      teaName: 'Да Хун Пао ортодокс',
      teaType: 'Улун',
      region: 'Фуцзянь',
      updatedAt: '2026-03-22T10:00:00.000Z',
      descriptors: ['woody:0', 'mineral:0'],
      ratings: { aroma: 5, taste: 5, aftertaste: 3, balance: 4 },
      brewingMode: 'steep',
      timeValue: 3,
      timeUnit: 'мин',
    }),
    baseNote({
      teaName: 'Телега «минеральный улун»',
      teaType: 'Улун',
      region: 'Тайвань',
      updatedAt: '2026-03-21T18:00:00.000Z',
      descriptors: ['woody:1', 'mineral:1'],
      ratings: { aroma: 4, taste: 4, aftertaste: 4, balance: 5 },
    }),
    baseNote({
      teaName: 'Каменистый Фуцзянь',
      teaType: 'Улун',
      region: 'Фуцзянь',
      updatedAt: '2026-03-20T09:00:00.000Z',
      descriptors: ['mineral:2', 'woody:2'],
      ratings: { aroma: 4, taste: 4, aftertaste: 4, balance: 4 },
    }),
    // Средний слой — fruity / floral (заметно слабее лидеров)
    baseNote({
      teaName: 'Алишань высокогорный',
      teaType: 'Улун',
      region: 'Тайвань',
      updatedAt: '2026-03-19T08:45:00.000Z',
      descriptors: ['floral:0', 'fruity:0', 'sweet:2'],
      ratings: { aroma: 5, taste: 4, aftertaste: 4, balance: 5 },
    }),
    baseNote({
      teaName: 'Дун Фан Цзинь Цзюнь',
      teaType: 'Красный',
      region: 'Фуцзянь',
      updatedAt: '2026-03-18T19:00:00.000Z',
      descriptors: ['fruity:1', 'sweet:1'],
      ratings: { aroma: 5, taste: 5, aftertaste: 5, balance: 5 },
    }),
    baseNote({
      teaName: 'Минералка + мёд',
      teaType: 'Красный',
      region: 'Фуцзянь',
      updatedAt: '2026-03-17T14:00:00.000Z',
      descriptors: ['mineral:0', 'sweet:2'],
      ratings: { aroma: 4, taste: 4, aftertaste: 4, balance: 4 },
    }),
    // herbal, spicy, roasted, umami в этом наборе намеренно отсутствуют — на круге остаются пустыми
  ];
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
          teaName: 'Черновик: сравнение двух шенов',
          teaType: 'Шен пуэр',
          region: 'Юньнань',
          updatedAt: new Date().toISOString(),
          freeText: 'Набросок — не забудь дописать после второй пролива.',
          descriptors: ['woody:0', 'floral:0'],
          ratings: { aroma: 0, taste: 0, aftertaste: 0, balance: 0 },
        }),
      ),
    );
  } else {
    const existing = parseJson<NoteRecord[]>(localStorage.getItem(NOTES_LIST_KEY), []);
    const next = [...demo, ...existing].slice(0, 200);
    localStorage.setItem(NOTES_LIST_KEY, JSON.stringify(next));
  }
  bumpNotesRevision();
}
