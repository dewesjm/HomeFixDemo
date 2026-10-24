/* Admin > Weld Colors: stable values shared by signoff forms and condition pickers. */
import { STORAGE } from './storage-keys';

export interface WeldColor { code: string; name: string }

const DEFAULT_WELD_COLORS: WeldColor[] = [
  { code: 'shiny-silver', name: 'Shiny Silver' }, { code: 'straw', name: 'Straw' },
  { code: 'light-blue', name: 'Light Blue' }, { code: 'dark-blue', name: 'Dark Blue' },
  { code: 'gray-powder', name: 'Gray Powder' }, { code: 'yellow-powder', name: 'Yellow Powder' },
];

export function getWeldColors(): WeldColor[] {
  try {
    const raw = localStorage.getItem(STORAGE.weldColors);
    if (raw) {
      const entries: unknown = JSON.parse(raw);
      if (Array.isArray(entries) && entries.every(e => e && typeof e.code === 'string' && typeof e.name === 'string')) return entries;
    }
  } catch { /* use defaults when saved data cannot be read */ }
  return DEFAULT_WELD_COLORS.map(e => ({ ...e }));
}

export function setWeldColors(entries: WeldColor[]): void {
  localStorage.setItem(STORAGE.weldColors, JSON.stringify(entries));
}

export function weldColorOptions(): { label: string; value: string }[] {
  return getWeldColors().map(e => ({ label: e.name, value: e.code }));
}
