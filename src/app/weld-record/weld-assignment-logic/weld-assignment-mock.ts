/* Mock of the external system that sets a welding step's GWP, WTN and Filler Metal Type/Size
   after doing its own validity checks; a real connection replaces this file. Some joints get nothing
   from it: those need an engineering override, where the values are typed in by hand (see
   isEngineeringEntryJoint). Picks are fixed per joint and step, so they come back the same on every
   visit. Which fields and steps it covers is weld-assignment-rules.ts. */
import { formInputFields } from '../signoff-forms-logic/form-fields';
import { Job } from '../../data/jobs';
import { WorkflowStage } from '../model/workflow-types';
import { SHOW_WELD_OVERRIDES } from '../signoff-forms-logic/weld-fields';
import { isFilledByRule } from '../signoff-forms-logic/field-fill';
import { requirementsMet } from '../qualifications-logic/qualifications';
import { gwpOptionsForMaterials, wtnOptionsForGwp, fillerMetalTypeOptions, fillerMetalSizeOptions, procedureOverride, procedureRequiredQuals } from '../../future/weld-engineering/procedure-values';

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
   whose WPS Welder Qualifications the welder holds. undefined when no GWP is qualified for the base metals. */
function assignedProcedure(job: Job, stageId: string, heldQuals: string[]): { gwp: string; wtn: string } | undefined {
  const gwp = pick(gwpOptionsForMaterials(job.materialType1 ?? '', job.materialType2 ?? ''), job.id)?.value;
  if (!gwp) return undefined;
  const wtns = wtnOptionsForGwp(gwp).map(o => o.value);
  const qualified = wtns.filter(wtn => requirementsMet(heldQuals, [procedureRequiredQuals(gwp, wtn)]));
  const wtn = pick(qualified.length ? qualified : wtns, `${job.id}:${stageId}`);
  return wtn ? { gwp, wtn } : undefined;
}

/* every input the assignment sets: the four assigned fields plus the override values. Weld Process,
   PH/IP and NC actuals follow by their fill rules (the caller applies them, field-fill.ts), same as
   picking GWP then WTN by hand. A filled field, e.g. filler while "Only Consumable Insert used as
   filler" owns it, is left alone. */
export function assignedInputs(job: Job, stage: WorkflowStage, heldQuals: string[]): Record<string, string> {
  const proc = assignedProcedure(job, stage.id, heldQuals);
  if (!proc) return {};
  const has = (k: string) => formInputFields(stage).some(f => f.key === k);
  const { gwp, wtn } = proc;
  const out: Record<string, string> = { weldProcedure: gwp, wtn };
  const ov = SHOW_WELD_OVERRIDES ? procedureOverride(gwp, wtn) : undefined;
  out['overridePhMin'] = ov?.overridePhMin ?? '';
  out['overridePhMax'] = ov?.overridePhMax ?? '';
  out['overrideIpMin'] = ov?.overrideIpMin ?? '';
  out['overrideIpMax'] = ov?.overrideIpMax ?? '';
  out['overrideNote'] = ov?.overrideNote ?? '';
  out['fillerMetalType'] = pick(fillerMetalTypeOptions(gwp, wtn), `${job.id}:${stage.id}:type`)?.value ?? '';
  out['fillerMetalSize'] = pick(fillerMetalSizeOptions(gwp, wtn), `${job.id}:${stage.id}:size`)?.value ?? '';
  return Object.fromEntries(Object.entries(out).filter(([k]) => has(k) && !isFilledByRule(stage, k)));
}
