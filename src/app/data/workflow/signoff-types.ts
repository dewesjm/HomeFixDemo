/* Admin > Signoff Type Availability: which routing steps have a Type droplist, and its options.
   The table is seeded below and the admin adds and removes rows; a step with no row has no Type.
   Every Repair round uses the Repair row. Excavation NDT's row has no options of its own: its Type
   is the inspection that rejected the joint (excavationNdtStage), the row only decides whether it
   has a Type at all. Stored in localStorage. */
import { STORAGE } from '../storage-keys';
import { StageOption } from './types';
import { ndtKindOptions } from './ndt';
import { isExcavationNdtStageId, isRepairStageId } from './step-ids';

export interface SignoffTypeRow {
  stepId: string;
  options: StageOption[];
}

export const REPAIR_TYPE_ROW = 'repair';
export const EXCAVATION_TYPE_ROW = 'excavation-ndt';

const opt = (label: string, value: string, isDefault = false, repeatable = false): StageOption =>
  ({ label, value, ...(isDefault ? { default: true } : {}), ...(repeatable ? { repeatable: true } : {}) });

/* NDT rows have no default: the inspector picks the inspection performed */
const ndtRows = (phase: string): SignoffTypeRow[] => (['vt5x', 'mtpt', 'utrt'] as const)
  .map(kind => ({ stepId: `${phase}-ndt-${kind}`, options: ndtKindOptions(kind) }));

const SEED_ROWS: SignoffTypeRow[] = [
  { stepId: 'fit', options: [opt('Fit', 'fit', true), opt('Weld Build-Up', 'weld-buildup', false, true)] },
  { stepId: 'tack', options: [opt('Tack', 'standard', true)] },
  { stepId: 'deferred-tack', options: [opt('Tack', 'standard', true)] },
  { stepId: 'root-weld', options: [opt('Root', 'standard', true)] },
  ...ndtRows('root'),
  { stepId: 'root-layer', options: [opt('Interim Layer', 'interim', true, true), opt('Final Layer', 'final')] },
  ...ndtRows('layer'),
  { stepId: 'final-weld', options: [opt('Final Weld', 'standard', true)] },
  ...ndtRows('final'),
  { stepId: REPAIR_TYPE_ROW, options: [opt('Repair', 'repair', true)] },
  { stepId: EXCAVATION_TYPE_ROW, options: [] },
];

/* bumped on every save, so getTemplates() knows its cached options are out of date */
let version = 0;
export const signoffTypesVersion = () => version;

export function getSignoffTypeRows(): SignoffTypeRow[] {
  try {
    const raw = localStorage.getItem(STORAGE.signoffTypes);
    return raw ? JSON.parse(raw) : SEED_ROWS;
  } catch { return SEED_ROWS; }
}

/* an added option's stored value is made from its name (e.g. "Weld Build-Up" -> "weld-build-up") */
export function setSignoffTypeRows(rows: SignoffTypeRow[]) {
  const filled = rows.map(r => ({ ...r, options: r.options.map(o => ({ ...o, value: o.value || valueFromName(o.label) })) }));
  localStorage.setItem(STORAGE.signoffTypes, JSON.stringify(filled));
  version++;
}

function valueFromName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/* the table row a step reads: its own, or the shared Repair / Excavation NDT row for any round */
export function signoffTypeRowId(stageId: string): string {
  return isRepairStageId(stageId) ? REPAIR_TYPE_ROW : isExcavationNdtStageId(stageId) ? EXCAVATION_TYPE_ROW : stageId;
}

export function hasSignoffTypeRow(stageId: string): boolean {
  const id = signoffTypeRowId(stageId);
  return getSignoffTypeRows().some(r => r.stepId === id);
}

/* a step's Type options; undefined when it has no row (no Type droplist) */
export function signoffTypeOptions(stageId: string): StageOption[] | undefined {
  const id = signoffTypeRowId(stageId);
  const row = getSignoffTypeRows().find(r => r.stepId === id);
  return row?.options.length ? row.options.map(o => ({ ...o })) : undefined;
}

/* whether signing `stageId` with Type `type` leaves the routing where it is (see StageOption.repeatable) */
export function typeRepeatable(stageId: string, type: string): boolean {
  return !!signoffTypeOptions(stageId)?.find(o => o.value === type)?.repeatable;
}
