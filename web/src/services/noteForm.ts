import type { NoteRecord } from './notes';
import type { TeaSetup } from './setups';

export type OptionalBasicField = 'country' | 'originRegion' | 'harvestSeason' | 'harvestYear' | 'notes';
export type OptionalBrewField = 'waterSource' | 'rinseCount' | 'infusionsCount' | 'brewingMethod';

export const teaTypeOptions = ['Шен пуэр', 'Шу пуэр', 'Улун', 'Белый', 'Зелёный', 'Красный', 'Хэйча', 'Жёлтый', 'Матча', 'Травяной'];
export const countrySuggestions = ['Китай', 'Япония', 'Корея', 'Индия', 'Непал', 'Шри-Ланка', 'Таиланд', 'Вьетнам', 'Кения'];
export const countryRegionOptions: Record<string, string[]> = {
  Китай: ['Юньнань', 'Фуцзянь', 'Гуандун', 'Аньхой', 'Чжэцзян', 'Сычуань', 'Тайвань', 'Наньтоу', 'Тайбэй', 'Цзяи', 'Илань'],
  Япония: ['Сидзуока', 'Кагосима', 'Миэ', 'Киото'],
  Корея: ['Чеджу', 'Посон', 'Хадон'],
  Индия: ['Дарджилинг', 'Ассам', 'Нилгири', 'Сикким'],
  Непал: ['Илам', 'Панчтхар', 'Дханкута'],
  'Шри-Ланка': ['Нувара-Элия', 'Ува', 'Димбула', 'Канди'],
  Таиланд: ['Чиангмай', 'Чианграй', 'Мэхонгсон'],
  Вьетнам: ['Ламдонг', 'Хазянг', 'Йенбай'],
  Кения: ['Керичо', 'Нанди', 'Ньери'],
};
export const waterSourceOptions = ['Фильтрованная', 'Бутилированная', 'Родниковая', 'Осмос + минерализация', 'Водопроводная отстоянная'];

export function isChinaCountry(value: string) {
  return value.trim().toLowerCase() === 'китай';
}

export function isKnownCountry(value: string) {
  return countrySuggestions.includes(value.trim());
}

export function getOriginRegionOptions(country: string) {
  return countryRegionOptions[country.trim()] ?? [];
}

export function isKnownRegionForCountry(country: string, region: string) {
  const regionValue = region.trim();
  if (!regionValue) return false;
  return getOriginRegionOptions(country).includes(regionValue);
}

export function createSkippedBasicsState(): Record<OptionalBasicField, boolean> {
  return {
    country: false,
    originRegion: false,
    harvestSeason: false,
    harvestYear: false,
    notes: false,
  };
}

export function createSkippedBrewState(): Record<OptionalBrewField, boolean> {
  return {
    waterSource: false,
    rinseCount: false,
    infusionsCount: false,
    brewingMethod: false,
  };
}

export function readStoredDraftNoteId(raw: string | null) {
  if (!raw) return crypto.randomUUID();
  try {
    const parsed = JSON.parse(raw) as Pick<NoteRecord, 'id'>;
    if (parsed.id && typeof parsed.id === 'string' && parsed.id.length > 0) return parsed.id;
  } catch {
    /* ignore invalid draft payload */
  }
  return crypto.randomUUID();
}

export function buildSetupSummary(setups: TeaSetup[], setupId: string) {
  if (!setupId) return '';
  return setups.find((setup) => setup.id === setupId)?.items.join(' + ') ?? '';
}

type StepValidationInput = {
  targetStep: number;
  sessionTitle: string;
  teaName: string;
  teaType: string;
  country: string;
  originRegion: string;
  leafGrams: number | null;
  waterTemp: number | null;
  timeValue: number | null;
  timeMin: number;
  areRatingsComplete: boolean;
  liquorColor: string;
  mouthfeel: string;
  energyEffect: string;
};

export function getStepValidationError(input: StepValidationInput) {
  if (input.targetStep >= 1) {
    if (!input.sessionTitle.trim()) return 'Добавь название сессии, чтобы было легче ориентироваться в журнале.';
    if (!input.teaName.trim()) return 'Добавь название чая, чтобы заметка не потерялась в журнале.';
    if (!input.teaType.trim()) return 'Выбери тип чая на первом шаге.';
  }
  if (input.targetStep >= 2) {
    if (input.leafGrams === null || input.leafGrams <= 0) return 'На втором шаге укажи навеску чая.';
    if (input.waterTemp === null || input.waterTemp <= 0) return 'На втором шаге укажи температуру воды.';
    if (input.timeValue === null || input.timeValue < input.timeMin) return 'Заполни время заваривания для выбранного режима.';
  }
  if (input.targetStep >= 4 && !input.areRatingsComplete) {
    return 'Перед сохранением поставь оценки по всем четырём категориям.';
  }
  if (input.targetStep >= 4) {
    if (!input.liquorColor.trim()) return 'Выбери цвет настоя в дополнительных ощущениях чашки.';
    if (!input.mouthfeel.trim()) return 'Выбери тело / текстуру в дополнительных ощущениях чашки.';
    if (!input.energyEffect.trim()) return 'Выбери энергию / состояние в дополнительных ощущениях чашки.';
  }
  return '';
}
