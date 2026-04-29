import type { NoteSyncStatus } from './notes';

const brewingModeLabels: Record<string, string> = {
  gongfu: 'Проливами (гунфу)',
  steep: 'Настоем',
  coldbrew: 'Cold brew',
};

const harvestSeasonLabels: Record<string, string> = {
  spring: 'Весна',
  summer: 'Лето',
  autumn: 'Осень',
  winter: 'Зима',
};

const liquorColorLabels: Record<string, string> = {
  'very-light': 'Очень светлый',
  gold: 'Золотистый',
  amber: 'Янтарный',
  orange: 'Оранжево-медный',
  'red-brown': 'Красно-коричневый',
  dark: 'Тёмный',
};

const mouthfeelLabels: Record<string, string> = {
  airy: 'Воздушное',
  silky: 'Шелковистое',
  juicy: 'Сочное',
  oily: 'Маслянистое',
  dense: 'Плотное',
  drying: 'Подсушивающее',
};

const energyEffectLabels: Record<string, string> = {
  quiet: 'Спокойное, созерцательное',
  warm: 'Тёплое, расслабляющее',
  focused: 'Собранное, фокусирующее',
  uplifting: 'Поднимающее, яркое',
  strong: 'Сильное, телесное',
};

export function formatNoteDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function getNoteSyncLabel(status?: NoteSyncStatus | null) {
  if (status === 'syncing') return 'Идёт синк';
  if (status === 'error') return 'Ошибка синка';
  if (status === 'local') return 'Локальная версия';
  return '';
}

export function getNoteSyncMarkerTone(status?: NoteSyncStatus | null) {
  if (status === 'error') return 'error';
  if (status === 'syncing') return 'syncing';
  if (status === 'local') return 'local';
  return '';
}

export function shouldShowNoteSyncMarker(status?: NoteSyncStatus | null) {
  return Boolean(status && status !== 'synced');
}

export function formatBrewingMode(value?: string | null) {
  return brewingModeLabels[value ?? ''] ?? value ?? '';
}

export function formatHarvestSeason(value?: string | null) {
  return harvestSeasonLabels[value ?? ''] ?? value ?? '';
}

export function formatLiquorColor(value?: string | null) {
  return liquorColorLabels[value ?? ''] ?? value ?? '';
}

export function formatMouthfeel(value?: string | null) {
  return mouthfeelLabels[value ?? ''] ?? value ?? '';
}

export function formatEnergyEffect(value?: string | null) {
  return energyEffectLabels[value ?? ''] ?? value ?? '';
}
