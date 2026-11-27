/* The ids of the starting Routing Settings rows (welding-steps.ts) and the rules that read them,
   kept beside the seed they describe. */

/* NQC rows: Fit-Up Insp and every NDT step come as two Routing Settings rows, the NQC one
   ('nqc-<id>', N Ind 1 or 2) and the regular one (N Ind 3). A joint gets one of each pair; both work
   the same way, so rules that depend on the step (its phase, its method) read the base id. */
const NQC_PREFIX = 'nqc-';
/* the NDT routings each phase has: Layer has no RT/UT routing */
export const PHASE_NDT_KINDS: Record<'root' | 'layer' | 'final', readonly ('vt5x' | 'mtpt' | 'utrt')[]> = {
  root: ['vt5x', 'mtpt', 'utrt'], layer: ['vt5x', 'mtpt'], final: ['vt5x', 'mtpt', 'utrt'],
};
export const NQC_SPLIT_STEP_IDS = ['fitup-insp',
  ...(['root', 'layer', 'final'] as const).flatMap(p => PHASE_NDT_KINDS[p].map(k => `${p}-ndt-${k}`))];
export const nqcStepId = (id: string) => `${NQC_PREFIX}${id}`;
export const baseStepId = (id: string) => id.startsWith(NQC_PREFIX) ? id.slice(NQC_PREFIX.length) : id;
export const isFitupInspId = (id: string) => baseStepId(id) === 'fitup-insp';

/* Ids of the steps added while a joint is worked (Repair, Excavation NDT, Engineering Hold).
   Each can happen more than once: round 1 is 'repair' / 'excavation-ndt' / 'engineering-hold', later
   rounds add a number ('repair-2', 'excavation-ndt-2'...). A round's Excavation NDT shares its
   Repair's number. */

export const isRepairStageId = (id: string) => /^repair(-\d+)?$/.test(id);
export const isExcavationNdtStageId = (id: string) => /^(nqc-)?excavation-ndt(-\d+)?$/.test(id);
export const isEngineeringHoldId = (id: string) => /^engineering-hold(-\d+)?$/.test(id);

const roundSuffix = (id: string) => /-(\d+)$/.exec(id)?.[0] ?? '';
export const excavationIdForRepair = (repairId: string, definitionId = 'excavation-ndt') => `${definitionId}${roundSuffix(repairId)}`;
export const repairIdForExcavation = (excavationId: string) => `repair${roundSuffix(excavationId)}`;
/* round number after the first, e.g. "Repair 2" */
export const roundLabel = (label: string, id: string) => roundSuffix(id) ? `${label} ${roundSuffix(id).slice(1)}` : label;

/* Structural's NDT routings per phase, in order: Pipe's three method pairs plus ET (its own routing,
   after MT/PT). Structural has no Layer. */
export const STRUCTURAL_PHASE_NDT_KINDS = ['vt5x', 'mtpt', 'et', 'utrt'] as const;
export const STRUCTURAL_PHASES = ['root', 'final'] as const;
const structuralNdt = (phase: string) => STRUCTURAL_PHASE_NDT_KINDS.map(k => `${phase}-ndt-${k}`);

/* the built-in routings Structural's settings tables start with, in order (no NQC rows) */
export const STRUCTURAL_STEP_IDS = [
  'fit', 'fitup-insp', 'root-weld', ...structuralNdt('root'), 'final-weld', ...structuralNdt('final'),
  'review-o63', 'review-o04', 'sold',
];
