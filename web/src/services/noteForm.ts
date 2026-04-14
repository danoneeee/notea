import type { NoteRecord } from './notes';
import type { TeaSetup } from './setups';

export type OptionalBasicField = 'originDetail' | 'cultivar' | 'source' | 'harvestSeason' | 'harvestYear' | 'processingStyle';
export type OptionalBrewField = 'waterSource' | 'rinseCount' | 'infusionsCount' | 'brewingMethod';

export const teaTypeOptions = ['Шен пуэр', 'Шу пуэр', 'Улун', 'Белый', 'Зелёный', 'Красный', 'Хэйча', 'Жёлтый', 'Матча', 'Травяной'];
export const regionSuggestions = ['Юньнань', 'Фуцзянь', 'Гуандун', 'Аньхой', 'Чжэцзян', 'Сычуань', 'Тайвань', 'Япония', 'Корея', 'Индия', 'Непал', 'Шри-Ланка'];
export const originSuggestions = ['Мэнхай', 'Иу', 'Буланшань', 'Уишань', 'Алишань', 'Лишань', 'Фудин', 'Чаочжоу'];
export const cultivarSuggestions = ['Да Е Чжун', 'Цин Синь', 'Жоу Гуй', 'Шуй Сянь', 'Фо Шоу', 'Мэй Чжань', 'Бай Хао'];
export const sourceOptions = ['Магазин', 'Чайный клуб', 'Обмен', 'Подарок', 'Путешествие', 'Личный запас'];
export const processingStyleOptions = ['Свежий', 'Выдержанный', 'Лёгкая обжарка', 'Средняя обжарка', 'Сильная обжарка', 'Сильная ферментация', 'Bug-bitten', 'Charcoal roast'];
export const waterSourceOptions = ['Фильтрованная', 'Бутилированная', 'Родниковая', 'Осмос + минерализация', 'Водопроводная отстоянная'];

export function createSkippedBasicsState(): Record<OptionalBasicField, boolean> {
  return {
    originDetail: false,
    cultivar: false,
    source: false,
    harvestSeason: false,
    harvestYear: false,
    processingStyle: false,
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
  teaName: string;
  teaType: string;
  region: string;
  leafGrams: number | null;
  waterTemp: number | null;
  timeValue: number | null;
  timeMin: number;
  areRatingsComplete: boolean;
};

export function getStepValidationError(input: StepValidationInput) {
  if (input.targetStep >= 1) {
    if (!input.teaName.trim()) return 'Добавь название чая, чтобы заметка не потерялась в журнале.';
    if (!input.teaType.trim()) return 'Выбери тип чая на первом шаге.';
    if (!input.region.trim()) return 'Укажи регион или провинцию, чтобы аналитика по географии работала корректно.';
  }
  if (input.targetStep >= 2) {
    if (input.leafGrams === null || input.leafGrams <= 0) return 'На втором шаге укажи навеску чая.';
    if (input.waterTemp === null || input.waterTemp <= 0) return 'На втором шаге укажи температуру воды.';
    if (input.timeValue === null || input.timeValue < input.timeMin) return 'Заполни время заваривания для выбранного режима.';
  }
  if (input.targetStep >= 4 && !input.areRatingsComplete) {
    return 'Перед сохранением поставь оценки по всем четырём категориям.';
  }
  return '';
}
