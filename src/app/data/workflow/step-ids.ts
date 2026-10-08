/* NQC rows: Fit-Up Insp and every NDT step come as two Routing Settings rows, the NQC one
   ('nqc-<id>', N Ind 1 or 2) and the regular one (the rest). A joint gets one of each pair; both work
   the same way, so rules that depend on the step (its phase, its method) read the base id. */
const NQC_PREFIX = 'nqc-';
export const NQC_SPLIT_STEP_IDS = ['fitup-insp',
  ...['root', 'layer', 'final'].flatMap(p => ['vt5x', 'mtpt', 'utrt'].map(k => `${p}-ndt-${k}`))];
export const nqcStepId = (id: string) => `${NQC_PREFIX}${id}`;
export const baseStepId = (id: string) => id.startsWith(NQC_PREFIX) ? id.slice(NQC_PREFIX.length) : id;
export const isFitupInspId = (id: string) => baseStepId(id) === 'fitup-insp';
/* the joint's own step for a built-in id: that step, or its NQC / regular twin */
export function stepOnJoint<T extends { id: string }>(stages: T[], id: string): T | undefined {
  return stages.find(s => s.id === id) ?? stages.find(s => baseStepId(s.id) === baseStepId(id));
}

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
