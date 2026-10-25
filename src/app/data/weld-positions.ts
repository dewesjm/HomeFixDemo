/* Admin > Weld Positions (localStorage) */
import { STORAGE } from './storage-keys';

interface WeldPosition {
  code: string;
  description: string;
  active?: boolean;
}

const DEFAULT_WELD_POSITIONS: WeldPosition[] = [
  { code: 'O', description: 'Overhead' },
  { code: 'V', description: 'Vertical' },
  { code: 'F', description: 'Flat' },
];

export function getWeldPositions(): WeldPosition[] {
  try {
    const raw = localStorage.getItem(STORAGE.weldPositions);
    const positions: WeldPosition[] = raw ? JSON.parse(raw) : DEFAULT_WELD_POSITIONS;
    return positions.map(p => ({ ...p, active: p.active !== false }));
  } catch { return DEFAULT_WELD_POSITIONS.map(p => ({ ...p, active: true })); }
}

export function setWeldPositions(positions: WeldPosition[]) {
  localStorage.setItem(STORAGE.weldPositions, JSON.stringify(positions));
}

export function weldPositionOptions(includeInactive = false): { label: string; value: string }[] {
  return getWeldPositions().filter(p => includeInactive || p.active !== false)
    .map(p => ({ label: `${p.code} - ${p.description}${p.active === false ? ' (inactive)' : ''}`, value: p.code.toLowerCase() }));
}
