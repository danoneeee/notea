export const noteColorOptions = [
  { value: '', label: 'Без цвета', swatch: '#d9e6d5' },
  { value: '#7dbb6f', label: 'Шалфей', swatch: '#7dbb6f' },
  { value: '#e5b75d', label: 'Мёд', swatch: '#e5b75d' },
  { value: '#d88963', label: 'Терракота', swatch: '#d88963' },
  { value: '#c87aa0', label: 'Пион', swatch: '#c87aa0' },
  { value: '#8c7ad8', label: 'Лаванда', swatch: '#8c7ad8' },
  { value: '#5f9bcf', label: 'Туман', swatch: '#5f9bcf' },
  { value: '#6eb0a0', label: 'Нефрит', swatch: '#6eb0a0' },
  { value: '#91816f', label: 'Глина', swatch: '#91816f' },
] as const;

export function getNoteColorStyles(noteColor?: string | null) {
  const color = String(noteColor ?? '').trim();
  if (!color) {
    return {};
  }
  return {
    borderLeft: `4px solid ${color}`,
    background: `linear-gradient(90deg, ${color}14 0%, #fbfdf8 22%, #fbfdf8 100%)`,
  };
}
