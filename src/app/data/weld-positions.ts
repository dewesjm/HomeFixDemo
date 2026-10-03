/* Admin > Weld Positions (localStorage) */
import { STORAGE } from './storage-keys';

export interface WeldPosition {
  code: string;
  description: string;
}

const DEFAULT_WELD_POSITIONS: WeldPosition[] = [
  { code: 'O', description: 'Overhead' },
  { code: 'V', description: 'Vertical' },
  { code: 'F', description: 'Flat' },
];

export function getWeldPositions(): WeldPosition[] {
  try {
    const raw = localStorage.getItem(STORAGE.weldPositions);
    return raw ? JSON.parse(raw) : DEFAULT_WELD_POSITIONS;
  } catch { return DEFAULT_WELD_POSITIONS; }
}

export function setWeldPositions(positions: WeldPosition[]) {
  localStorage.setItem(STORAGE.weldPositions, JSON.stringify(positions));
}
