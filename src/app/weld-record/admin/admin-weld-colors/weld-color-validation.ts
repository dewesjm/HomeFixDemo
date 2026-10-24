import { WeldColor } from '../../../data/weld-colors';

export function weldColorError(color: WeldColor, others: WeldColor[]): string {
  if (!color.name.trim()) return 'Color is required.';
  if (others.some(e => e.code.toLowerCase() === color.code.trim().toLowerCase())) return 'That color already exists.';
  if (others.some(e => e.name.trim().toLowerCase() === color.name.trim().toLowerCase())) return 'That color name already exists.';
  return '';
}
