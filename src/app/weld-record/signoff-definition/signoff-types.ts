/* Admin > Signoff Type Availability: which Types (Admin > Routing Signoff Types) each routing step
   offers in its Type droplist, and which is its default. The table is seeded below and the admin adds
   and removes rows; a step with no row has no Type. Every Repair round uses the Repair row. Excavation
   NDT's row has no options of its own: its Type is the inspection that rejected the joint
   (excavationNdtStage), the row only decides whether it has a Type at all. Stored in localStorage. */
import { STORAGE } from '../../data/storage-keys';
import { StageOption } from '../model/workflow-types';
import { NDT_KINDS } from '../routing/ndt';
import { isExcavationNdtStageId, isRepairStageId, nqcStepId } from '../routing/step-ids';
import { WELD_BUILDUP_TYPE, getRoutingSignoffTypes, routingSignoffTypesVersion } from './routing-signoff-types';

/* one Type a step offers, by its Routing Signoff Types value */
export interface AvailableType {
  type: string;
  default?: boolean;
}

export interface SignoffTypeRow {
  stepId: string;
  types: AvailableType[];
}

export const REPAIR_TYPE_ROW = 'repair';
export const EXCAVATION_TYPE_ROW = 'excavation-ndt';

const only = (type: string): AvailableType[] => [{ type, default: true }];

/* NDT rows have no default: the inspector picks the inspection performed. Each NDT step's NQC row
   (step-ids.ts) gets its own row too. */
const ndtRows = (phase: string): SignoffTypeRow[] => (['vt5x', 'mtpt', 'utrt'] as const)
  .flatMap(kind => [`${phase}-ndt-${kind}`, nqcStepId(`${phase}-ndt-${kind}`)]
    .map(stepId => ({ stepId, types: NDT_KINDS[kind].options.map(o => ({ type: o.value })) })));

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
  { stepId: EXCAVATION_TYPE_ROW, types: [] },
];

/* bumped on every save of this table or of Routing Signoff Types, so getTemplates() knows its cached
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
  return isRepairStageId(stageId) ? REPAIR_TYPE_ROW : isExcavationNdtStageId(stageId) ? EXCAVATION_TYPE_ROW : stageId;
}

export function hasSignoffTypeRow(stageId: string): boolean {
  const id = signoffTypeRowId(stageId);
  return getSignoffTypeRows().some(r => r.stepId === id);
}

/* a step's Type options, each with its Routing Signoff Types name and settings; undefined when it
   has no row (no Type droplist). A Type no longer in Routing Signoff Types is left out. */
export function signoffTypeOptions(stageId: string): StageOption[] | undefined {
  const id = signoffTypeRowId(stageId);
  const row = getSignoffTypeRows().find(r => r.stepId === id);
  const types = getRoutingSignoffTypes();
  const options = (row?.types ?? []).flatMap(a => {
    const t = types.find(x => x.value === a.type);
    return t ? [{
      label: t.label, value: t.value,
      ...(a.default ? { default: true } : {}),
      ...(t.repeatable ? { repeatable: true } : {}),
      ...(t.signsStep ? { signsStep: t.signsStep } : {}),
    }] : [];
  });
  return options.length ? options : undefined;
}

const option = (stageId: string, type: string) => signoffTypeOptions(stageId)?.find(o => o.value === type);

/* whether signing `stageId` with Type `type` leaves the routing where it is (see StageOption.repeatable) */
export function typeRepeatable(stageId: string, type: string): boolean {
  return !!option(stageId, type)?.repeatable;
}

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
