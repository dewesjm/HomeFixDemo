import { WeldColor } from '../../../data/weld-colors';

export function weldColorError(color: WeldColor, others: WeldColor[]): string {
  if (!color.code.trim() || !color.name.trim()) return 'Code and color name are required.';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(color.code.trim())) return 'Use lowercase letters, numbers and hyphens for the code.';
  if (others.some(e => e.code.toLowerCase() === color.code.trim().toLowerCase())) return 'That code already exists.';
  if (others.some(e => e.name.trim().toLowerCase() === color.name.trim().toLowerCase())) return 'That color name already exists.';
  return '';
}
