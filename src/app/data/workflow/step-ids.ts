/* Ids of the steps added while a joint is worked (Repair, Excavation NDT, Engineering Hold).
   Each can happen more than once: round 1 is 'repair' / 'excavation-ndt' / 'engineering-hold', later
   rounds add a number ('repair-2', 'excavation-ndt-2'...). A round's Excavation NDT shares its
   Repair's number. */

export const isRepairStageId = (id: string) => /^repair(-\d+)?$/.test(id);
export const isExcavationNdtStageId = (id: string) => /^excavation-ndt(-\d+)?$/.test(id);
export const isEngineeringHoldId = (id: string) => /^engineering-hold(-\d+)?$/.test(id);

const roundSuffix = (id: string) => /-(\d+)$/.exec(id)?.[0] ?? '';
export const excavationIdForRepair = (repairId: string) => `excavation-ndt${roundSuffix(repairId)}`;
export const repairIdForExcavation = (excavationId: string) => `repair${roundSuffix(excavationId)}`;
/* round number after the first, e.g. "Repair 2" */
export const roundLabel = (label: string, id: string) => roundSuffix(id) ? `${label} ${roundSuffix(id).slice(1)}` : label;
