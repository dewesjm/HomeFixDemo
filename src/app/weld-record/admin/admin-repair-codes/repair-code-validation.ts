import { RepairCode } from '../../../data/repair-codes';

export function repairCodeError(row: RepairCode, others: RepairCode[]): string {
  const name = row.name.trim();
  if (!name) return 'Enter a Repair Code name';
  if (others.some(r => r.name.trim().toLowerCase() === name.toLowerCase())) return 'A Repair Code with that name already exists';
  return '';
}

/* New choices get readable permanent values; renaming never regenerates them. */
export function newRepairCodeId(name: string, entries: RepairCode[]): string {
  const base = 'custom-' + (name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'repair');
  let value = base;
  for (let n = 2; entries.some(r => r.code === value); n++) value = `${base}-${n}`;
  return value;
}
