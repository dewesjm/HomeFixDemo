import { getRepairCodes } from '../../data/repair-codes';

/* Condition editors include inactive choices so saved rules remain readable and editable. */
export function repairCodeOptions(includeInactive = false): { label: string; value: string }[] {
  return getRepairCodes().filter(r => includeInactive || r.active)
    .map(r => ({ label: r.name + (r.active ? '' : ' (inactive)'), value: r.code }));
}
