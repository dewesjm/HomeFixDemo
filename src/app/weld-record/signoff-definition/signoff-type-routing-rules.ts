/* Admin > Signoff Type to Routing rules: the Type options a routing offers on a joint, read from the
   rows in data/signoff-type-routing.ts. Every Repair round reads the Repair row; Excavation reads its
   configured Type source and ordered material exceptions. */
import { insertedDefinitionId } from '../routing/inserted/instance-identity';
import { Job } from '../../data/jobs';
import { replacedType } from './type-exceptions';
import { StageOption } from '../model/workflow-types';
import { conditionsMatch } from '../conditions/joint-conditions';
import { isExcavationNdtStageId, isRepairStageId } from '../routing/routing-ids';
import { getSignoffTypes } from '../../data/signoff-types';
import {
  AvailableType, SignoffTypeRoutingRow, getSignoffTypeRoutingRows, REPAIR_TYPE_ROW, EXCAVATION_TYPE_ROW, NQC_EXCAVATION_TYPE_ROW,
} from '../../data/signoff-type-routing';

export const typeSourceLabel = (source: SignoffTypeRoutingRow['typeSource']) =>
  source === 'rejecting-inspection' ? 'Rejecting inspection' : 'Signoff Type Selection';

/* the table row a step reads: its own, or the shared Repair / Excavation NDT row for any round */
function signoffTypeRowId(stageId: string): string {
  return isRepairStageId(stageId) ? REPAIR_TYPE_ROW : isExcavationNdtStageId(stageId) ? (stageId.startsWith('nqc-') ? NQC_EXCAVATION_TYPE_ROW : EXCAVATION_TYPE_ROW) : insertedDefinitionId(stageId) ?? stageId;
}

/* a step's Type options, each with its Signoff Types name and settings; undefined when it
   has no row (no Type droplist). A Type no longer in Signoff Types is left out. */
export function signoffTypeOptions(stageId: string, job?: Job, inputs: Record<string, string> = {}, rejectingType?: string): StageOption[] | undefined {
  const id = signoffTypeRowId(stageId);
  const row = getSignoffTypeRoutingRows().find(r => r.stepId === id);
  if (!row) return undefined;
  return resolveTypeOptions(row, stageId, job, inputs, rejectingType);
}

/* Resolve configured or contextual candidates through the same ordered replacement rules. */
function resolveTypeOptions(row: SignoffTypeRoutingRow, stageId: string, job?: Job,
  inputs: Record<string, string> = {}, rejectingType?: string): StageOption[] {
  const catalog = getSignoffTypes();
  const enabled = (a: AvailableType) => !job || conditionsMatch(a.enableWhen, job, [],
    { id: stageId, signed: false, inputs, signoffInputs: {} });
  const candidates: AvailableType[] = row.typeSource === 'rejecting-inspection'
    ? (rejectingType ? [{ type: rejectingType }] : []) : row.types.filter(enabled);
  const result: StageOption[] = [];
  for (const candidate of candidates) {
    const value = replacedType(row.typeExceptions, candidate.type, job, inputs);
    const configured = row.types.find(t => t.type === value);
    if (configured && !enabled(configured)) continue;
    const type = catalog.find(t => t.value === value);
    if (!type) continue;
    const existing = result.find(o => o.value === value);
    if (existing) { if (candidate.default) existing.default = true; continue; }
    result.push({ value, label: type.label, ...(candidate.default ? { default: true } : {}),
      ...(type.signsStep ? { signsStep: type.signsStep } : {}) });
  }
  return result;
}

/* Only routings with contextual rules retain return data in their blank form. */
export function usesReturningInspectionType(stageId: string): boolean {
  const row = getSignoffTypeRoutingRows().find(r => r.stepId === signoffTypeRowId(stageId));
  return [...(row?.types.map(t => t.enableWhen) ?? []), ...(row?.typeExceptions?.map(r => r.when) ?? [])]
    .some(rules => rules?.some(rule => rule.some(c => c.field === 'self.returningInspectionType')));
}

const option = (stageId: string, type: string) => signoffTypeOptions(stageId)?.find(o => o.value === type);

/* the routing step signing `stageId` with Type `type` signs (StageOption.signsStep); '' = itself */
export function typeSignsStep(stageId: string, type: string): string {
  return option(stageId, type)?.signsStep ?? getSignoffTypes().find(t => t.value === type)?.signsStep ?? '';
}

/* whether `type` is the step's own: its default Type, or any of its Types when it has no default (the
   NDT kinds). A step signed as another Type (Fit as Weld Build-Up, Layer as Final Weld) carries that
   Type's fields instead of its template's. */
export function isOwnType(stageId: string, type: string): boolean {
  const options = signoffTypeOptions(stageId);
  const def = options?.find(o => o.default);
  return !def || def.value === type;
}

/* every Type an Excavation NDT routing can be signed as, for the admin pickers: what the routings
   whose rejection adds a Repair (`sourceStepIds`) offer, plus what its exceptions switch to. A joint's
   Excavation narrows this to the rejecting Type (excavationTypeOptions). */
export function excavationPossibleTypes(definitionId: string, sourceStepIds: string[]): StageOption[] {
  const rows = getSignoffTypeRoutingRows();
  const exceptions = rows.find(r => r.stepId === definitionId)?.typeExceptions ?? [];
  const values = [...rows.filter(r => sourceStepIds.includes(r.stepId)).flatMap(r => r.types.map(t => t.type)),
    ...exceptions.map(e => e.to)];
  const catalog = getSignoffTypes();
  return [...new Set(values)].flatMap(value => {
    const type = catalog.find(t => t.value === value);
    return type ? [{ value, label: type.label, ...(type.signsStep ? { signsStep: type.signsStep } : {}) }] : [];
  });
}

/* The routing's configured Type source and first matching material exception. */
export function excavationTypeOptions(job: Job | undefined, rejectingType: string, definitionId = EXCAVATION_TYPE_ROW): StageOption[] | undefined {
  const row = getSignoffTypeRoutingRows().find(r => r.stepId === definitionId);
  return row ? resolveTypeOptions(row, definitionId, job, {}, rejectingType) : undefined;
}
