import { insertedDefinitionId } from '../routing/instance-identity';
/* Signoff Types By Routing stores available Types and defaults. Every Repair round reads
   the Repair row; Excavation reads its configured Type source and ordered material exceptions. */
import { Job } from '../../data/jobs';
import { materialClassification, MaterialFlag } from '../../data/material-classification';
import { STORAGE } from '../../data/storage-keys';
import { StageOption } from '../model/workflow-types';
import { ConditionRule, conditionsMatch } from '../routing/step-conditions';
import { NDT_KINDS } from '../routing/ndt';
import { isExcavationNdtStageId, isRepairStageId, nqcStepId } from '../routing/step-ids';
import { WELD_BUILDUP_TYPE, getRoutingSignoffTypes, routingSignoffTypesVersion } from './routing-signoff-types';

/* one Type a step offers, by its Signoff Types value */
export interface AvailableType {
  type: string;
  default?: boolean;
  enableWhen?: ConditionRule[];
}

export interface SignoffTypeRow {
  stepId: string;
  types: AvailableType[];
  typeSource?: 'rejecting-inspection';
  typeExceptions?: { from: string; to: string; materialFlag: MaterialFlag | '' }[];
}

export const REPAIR_TYPE_ROW = 'repair';
export const EXCAVATION_TYPE_ROW = 'excavation-ndt';

const only = (type: string): AvailableType[] => [{ type, default: true }];

/* NDT rows have no default: the inspector picks the inspection performed. Each NDT step's NQC row
   (step-ids.ts) gets its own row too. */
const ndtRows = (phase: string): SignoffTypeRow[] => (['vt5x', 'mtpt', 'utrt'] as const)
  .flatMap(kind => [`${phase}-ndt-${kind}`, nqcStepId(`${phase}-ndt-${kind}`)]
    .map(stepId => ({ stepId, types: NDT_KINDS[kind].options.map(o => ({ type: o.value, enableWhen: inspectionEnableWhen(phase, o.value) })) })));

/* Default availability belongs to the routing's Type configuration, not the builder. */
function inspectionEnableWhen(phase: string, type: string): ConditionRule[] {
  const field = phase === 'root' ? 'ndtRoot' : phase === 'layer' ? 'ndtEach' : 'ndtFinal';
  if (type === 'vt') return [[{ field, op: 'isNot', values: ['5X'] }]];
  if (type === '5x') return [[{ field, op: 'is', values: ['5X'] }],
    [{ field: 'self.returningInspectionType', op: 'is', values: ['5x'] }]];
  if (type === 'rt') return phase === 'layer'
    ? [[{ field, op: 'is', values: ['RT'] }]]
    : [[{ field: phase === 'root' ? 'rtRoot' : 'rtFinal', op: 'isNot', values: ['', 'NA'] }]];
  return [[{ field, op: 'is', values: type === 'mt' ? ['MT', 'MT/PT'] : type === 'pt' ? ['PT', 'MT/PT'] : ['UT'] }]];
}

const SEED_ROWS: SignoffTypeRow[] = [
  { stepId: 'pre-fit', types: only('pre-fit') },
  { stepId: 'fit', types: [{ type: 'fit', default: true }, { type: WELD_BUILDUP_TYPE }] },
  { stepId: 'tack', types: only('tack') },
  { stepId: 'fitup-insp', types: only('fitup-insp') },
  { stepId: nqcStepId('fitup-insp'), types: only('fitup-insp') },
  { stepId: 'fitup-release', types: only('fitup-release') },
  { stepId: 'deferred-tack', types: only('deferred-tack') },
  { stepId: 'root-weld', types: only('root') },
  ...ndtRows('root'),
  { stepId: 'root-layer', types: [{ type: 'interim', default: true }, { type: 'final-weld' }] },
  ...ndtRows('layer'),
  { stepId: 'final-weld', types: only('final-weld') },
  ...ndtRows('final'),
  { stepId: 'review-o63', types: only('review-o63') },
  { stepId: 'review-o04', types: only('review-o04') },
  { stepId: 'sold', types: only('sold') },
  { stepId: REPAIR_TYPE_ROW, types: only('repair') },
  { stepId: EXCAVATION_TYPE_ROW, types: [], typeSource: 'rejecting-inspection',
    typeExceptions: [{ from: 'pt', to: '5x', materialFlag: 'nonFerrousOrAustenitic' }] },
];

/* bumped on every save of this table or of Signoff Types, so getTemplates() knows its cached
   options are out of date */
let version = 0;
export const signoffTypesVersion = () => version * 1000 + routingSignoffTypesVersion();

export function getSignoffTypeRows(): SignoffTypeRow[] {
  try {
    const raw = localStorage.getItem(STORAGE.signoffTypes);
    return raw ? JSON.parse(raw) : SEED_ROWS;
  } catch { return SEED_ROWS; }
}

export function setSignoffTypeRows(rows: SignoffTypeRow[]) {
  localStorage.setItem(STORAGE.signoffTypes, JSON.stringify(rows));
  version++;
}

/* the table row a step reads: its own, or the shared Repair / Excavation NDT row for any round */
export function signoffTypeRowId(stageId: string): string {
  return isRepairStageId(stageId) ? REPAIR_TYPE_ROW : isExcavationNdtStageId(stageId) ? EXCAVATION_TYPE_ROW : insertedDefinitionId(stageId) ?? stageId;
}

export function hasSignoffTypeRow(stageId: string): boolean {
  const id = signoffTypeRowId(stageId);
  return getSignoffTypeRows().some(r => r.stepId === id);
}

/* a step's Type options, each with its Signoff Types name and settings; undefined when it
   has no row (no Type droplist). A Type no longer in Signoff Types is left out. */
export function signoffTypeOptions(stageId: string, job?: Job, inputs: Record<string, string> = {}): StageOption[] | undefined {
  const id = signoffTypeRowId(stageId);
  const row = getSignoffTypeRows().find(r => r.stepId === id);
  const types = getRoutingSignoffTypes();
  const options = (row?.types ?? []).flatMap(a => {
    if (job && !conditionsMatch(a.enableWhen, job, [], { id: stageId, signed: false, inputs, signoffInputs: {} })) return [];
    const t = types.find(x => x.value === a.type);
    return t ? [{
      label: t.label, value: t.value,
      ...(a.default ? { default: true } : {}),
      ...(t.signsStep ? { signsStep: t.signsStep } : {}),
    }] : [];
  });
  return row && !row.typeSource ? options : options.length ? options : undefined;
}

/* Only routings with contextual rules retain return data in their blank form. */
export function usesReturningInspectionType(stageId: string): boolean {
  return getSignoffTypeRows().find(r => r.stepId === signoffTypeRowId(stageId))?.types
    .some(t => t.enableWhen?.some(rule => rule.some(c => c.field === 'self.returningInspectionType'))) ?? false;
}

const option = (stageId: string, type: string) => signoffTypeOptions(stageId)?.find(o => o.value === type);

/* the routing step signing `stageId` with Type `type` signs (StageOption.signsStep); '' = itself */
export function typeSignsStep(stageId: string, type: string): string {
  return option(stageId, type)?.signsStep ?? '';
}

/* whether `type` is the step's own: its default Type, or any of its Types when it has no default (the
   NDT kinds). A step signed as another Type (Fit as Weld Build-Up, Layer as Final Weld) carries that
   Type's fields instead of its template's. */
export function isOwnType(stageId: string, type: string): boolean {
  const options = signoffTypeOptions(stageId);
  const def = options?.find(o => o.default);
  return !def || def.value === type;
}

/* The routing's configured Type source and first matching material exception. */
export function excavationTypeOptions(job: Job | undefined, rejectingType: string): StageOption[] | undefined {
  const row = getSignoffTypeRows().find(r => r.stepId === EXCAVATION_TYPE_ROW);
  if (!row) return undefined;
  if (row.typeSource !== 'rejecting-inspection') return signoffTypeOptions(EXCAVATION_TYPE_ROW, job);
  const exception = job && row.typeExceptions?.find(r => r.from === rejectingType && (!r.materialFlag ||
    [job.materialType1, job.materialType2].some(code => materialClassification().some(m => m.code === code && m[r.materialFlag as MaterialFlag]))));
  const type = getRoutingSignoffTypes().find(t => t.value === (exception?.to ?? rejectingType));
  return type ? [{ value: type.value, label: type.label }] : [];
}
