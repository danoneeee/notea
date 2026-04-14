import type { NoteSyncStatus } from './notes';

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
