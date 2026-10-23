import { formInputFields } from '../weld-record/signoff-definition/form-fields';
/* Stand-in for the external system that sets a welding step's GWP, WTN and Filler Metal Type/Size
   after doing its own validity checks. The person can't change them. Some joints get nothing from
   it: those need an engineering override, where the values are typed in by hand (see
   isEngineeringEntryJoint). Picks are fixed per joint and step, so they come back the same on every visit. */
import { Job } from './jobs';
import { WorkflowStage } from '../weld-record/model/workflow-types';
import { SHOW_WELD_OVERRIDES } from '../weld-record/signoff-definition/weld-fields';
import { isFilledByRule } from '../weld-record/signoff-definition/field-fill';
import { requirementsMet } from '../weld-record/qualifications/qualifications';
import { conditionRequirements } from '../weld-record/qualifications/qual-conditions';
import {
  Procedure, procedures, gwpOptionsForMaterials, fillerMetalTypeOptionsForProcedure,
  fillerMetalSizeOptionsForProcedure, hasOverride as procedureHasOverride,
} from './procedures';

export const ASSIGNED_KEYS = new Set(['weldProcedure', 'wtn', 'fillerMetalType', 'fillerMetalSize']);

/* welding steps (and Fit as a Weld Build-Up) are the ones with a GWP field */
export function isAssignedStage(stage: WorkflowStage): boolean {
  return formInputFields(stage).some(f => f.key === 'weldProcedure');
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick<T>(list: T[], key: string): T | undefined {
  return list.length ? list[hash(key) % list.length] : undefined;
}

/* joints the external system sends no values for, so engineering types them in: about 1 in 5
   (stand-in pick), plus any joint with no GWP qualified for its base metals */
export function isEngineeringEntryJoint(job: Job): boolean {
  return hash(`${job.id}:engineering`) % 5 === 0
    || !gwpOptionsForMaterials(job.materialType1 ?? '', job.materialType2 ?? '').length;
}

/* one GWP per joint (qualified for its base metals); WTN and filler per step, preferring a WTN
   whose qualifications the welder holds. undefined when no GWP is qualified for the base metals. */
function assignedProcedure(job: Job, stageId: string, heldQuals: string[]): Procedure | undefined {
  const gwp = pick(gwpOptionsForMaterials(job.materialType1 ?? '', job.materialType2 ?? ''), job.id)?.value;
  if (!gwp) return undefined;
  const rows = procedures().filter(p => p.gwp === gwp);
  const qualified = rows.filter(p => requirementsMet(heldQuals, conditionRequirements(job, { inputs: { wtn: p.wtn } })));
  return pick(qualified.length ? qualified : rows, `${job.id}:${stageId}`);
}

/* every input the assignment sets: the four assigned fields plus the override values. Weld Process,
   PH/IP and NC actuals follow by their fill rules (the caller applies them, field-fill.ts), same as
   picking GWP then WTN by hand. A filled field, e.g. filler while "Only Consumable Insert used as
   filler" owns it, is left alone. */
export function assignedInputs(job: Job, stage: WorkflowStage, heldQuals: string[]): Record<string, string> {
  const proc = assignedProcedure(job, stage.id, heldQuals);
  if (!proc) return {};
  const has = (k: string) => formInputFields(stage).some(f => f.key === k);
  const out: Record<string, string> = { weldProcedure: proc.gwp, wtn: proc.wtn };
  const hasOv = SHOW_WELD_OVERRIDES && procedureHasOverride(proc);
  out['overridePhMin'] = hasOv ? proc.overridePhMin : '';
  out['overridePhMax'] = hasOv ? proc.overridePhMax : '';
  out['overrideIpMin'] = hasOv ? proc.overrideIpMin : '';
  out['overrideIpMax'] = hasOv ? proc.overrideIpMax : '';
  out['overrideNote'] = hasOv ? proc.overrideNote : '';
  out['fillerMetalType'] = pick(fillerMetalTypeOptionsForProcedure(proc), `${job.id}:${stage.id}:type`)?.value ?? '';
  out['fillerMetalSize'] = pick(fillerMetalSizeOptionsForProcedure(proc), `${job.id}:${stage.id}:size`)?.value ?? '';
  return Object.fromEntries(Object.entries(out).filter(([k]) => has(k) && !isFilledByRule(stage, k)));
}
