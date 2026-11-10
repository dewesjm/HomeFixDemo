/* Repair Code choices (Admin > Repair Codes) for the joint page and the field catalog. Condition
   editors include inactive choices so saved rules remain readable and editable. */
import { getRepairCodes } from '../../data/repair-codes';

export function repairCodeOptions(includeInactive = false): { label: string; value: string }[] {
  return getRepairCodes().filter(r => includeInactive || r.active)
    .map(r => ({ label: r.name + (r.active ? '' : ' (inactive)'), value: r.code }));
}
