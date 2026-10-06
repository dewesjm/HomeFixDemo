/* A step's fields on the joint page: which show, and the options each offers */
import { Job } from '../jobs';
import {
  StageField, WorkflowStage, ACTUAL_REQUIREMENT, SHOW_WELD_OVERRIDES, WELD_OVERRIDE_FIELDS, getTemplates, isFieldLocked,
  allowableThicknessAmount, showIfMet, fieldAppliesToJob,
} from '../workflow';
import { requiresTraceability } from '../mcl-traceability';
import { inspectionProcedureOptions } from '../inspection-procedures';
import { defectCodeOptions } from '../defect-codes';
import { ASSIGNED_KEYS } from '../weld-assignment';
import {
  gwpOptionsForMaterials, allGwpOptions, wtnOptionsForGwp, gwpDescription, wtnDescription, getProcedureByGwpWtn, hasOverride as procedureHasOverride,
  fillerMetalTypeOptionsForProcedure, fillerMetalSizeOptionsForProcedure, FILLER_METAL_TYPE_OPTIONS, FILLER_METAL_SIZE_OPTIONS
} from '../procedures';

/* what the field rules need besides the step itself */
export interface StageFormContext {
  job: Job | undefined;
  stages: WorkflowStage[];
  /* a Foreman Override on this step opens GWP and Filler Metal Type/Size to their full lists */
  offListUnlocked: boolean;
}

/* PH/IP requirements: the keys the actuals follow */
export const REQUIREMENT_KEYS = new Set(Object.values(ACTUAL_REQUIREMENT));

/* a PH/IP requirement typed on an engineering override step must be a number or NC */
export function typedRequirementError(stage: WorkflowStage, f: { key: string; label: string }): string {
  const v = stage.inputs[f.key] ?? '';
  if (!stage.engineeringEntry || !REQUIREMENT_KEYS.has(f.key) || !v || v === 'NC' || !isNaN(Number(v))) return '';
  return `${f.label} must be a number or NC`;
}

/* Root's RT requirement is job.rtRoot, Final Weld's is job.rtFinal; Layer's RT NDT has no
   matching requirement field on Job, so nothing is enforced there. */
export function rtDegreeRequired(job: Job | undefined, stage: WorkflowStage): string {
  if (stage.id === 'root-ndt-utrt') return job?.rtRoot ?? '';
  if (stage.id === 'final-ndt-utrt') return job?.rtFinal ?? '';
  return '';
}

/* Fit's Weld Build-Up type uses Tack's fields, plus the override fields (Fit isn't a weld step
   when buildStages() runs, so it doesn't get them then) */
function weldBuildupFields(trade: Job['trade']): StageField[] {
  const tackTpl = (getTemplates()[trade] ?? []).find(t => t.id === 'tack');
  return [...(tackTpl?.fields ?? []), ...WELD_OVERRIDE_FIELDS];
}

/* Fit's fields for its Type: Weld Build-Up swaps in Tack's fields plus Affected Item; Fit, or Weld
   Build-Up when Admin > Routing Settings has no Tack step, keeps Fit's own fields */
export function fitFieldsForType(trade: Job['trade'], signoffType: string): StageField[] {
  const templates = getTemplates()[trade] ?? [];
  if (signoffType === 'weld-buildup' && templates.some(t => t.id === 'tack')) {
    return [...weldBuildupFields(trade).map(f => ({ ...f })), { key: 'affectedItem', label: 'Affected Item', type: 'text', required: true }];
  }
  return (templates.find(t => t.id === 'fit')?.fields ?? []).map(f => ({ ...f }));
}

/* Fields shown on the step. Fit under Weld Build-Up reads Tack's template rather than stage.fields,
   which may not have propagated yet when Angular re-evaluates the @if gate in the same
   change-detection tick. */
export function visibleStageFields(stage: WorkflowStage, ctx: StageFormContext): StageField[] {
  const job = ctx.job;
  const isFitWeldBuildup = stage.id === 'fit' && stage.signoffType === 'weld-buildup';
  const rawFields = isFitWeldBuildup ? (job ? weldBuildupFields(job.trade) : WELD_OVERRIDE_FIELDS) : stage.fields;
  return rawFields
    .map(f => stageFieldOptions(f, stage, ctx))
    .filter(f => {
      /* "exceeded" sends the joint to that phase's RT/UT, so it only shows when the joint has one */
      if (f.key === 'allowableThicknessExceeded'
          && !ctx.stages.some(s => s.id === `${stage.inputs['originPhase'] ?? ''}-ndt-utrt`)) return false;
      if (!showIfMet(stage, f) || !fieldAppliesToJob(f, job)) return false;
      /* MIC fields only visible when traceability is required */
      if (f.key === 'consumableInsertId' || f.key === 'backingRingId') {
        return !!job && (requiresTraceability(job.mcl1) || requiresTraceability(job.mcl2));
      }
      /* Weld Position's row is only rendered when N Ind. is '1' (WELD_GROUPS in
         signoff-panel.component.ts); kept in step so it isn't required when it can't be seen */
      if (f.key === 'weldPosition') return job?.nInd === '1';
      /* override fields only when the selected GWP+WTN's WPS has override values set */
      if (f.key.startsWith('override')) {
        if (!SHOW_WELD_OVERRIDES) return false;
        const proc = getProcedureByGwpWtn(stage.inputs?.['weldProcedure'] ?? '', stage.inputs?.['wtn'] ?? '');
        if (!proc || !procedureHasOverride(proc)) return false;
      }
      return true;
    });
}

/* A field with its runtime options and label. GWP is filtered to the GWPs qualified for this job's
   base metal pair (Material Type 1/2), WTN to the selected GWP, and Filler Metal Type/Size to the
   Procedure that GWP+WTN resolves to. */
export function stageFieldOptions(f: StageField, stage: WorkflowStage, ctx: StageFormContext): StageField {
  const job = ctx.job;
  if (f.key === 'procedureUsed') {
    /* Admin > Inspection Procedures for the step's Type; a value no longer listed stays selectable so it doesn't show blank */
    const cur = stage.inputs['procedureUsed'] ?? '';
    const options = inspectionProcedureOptions(stage.inspectionType);
    return { ...f, options: cur && !options.some(o => o.value === cur) ? [...options, { label: cur, value: cur }] : options };
  }
  if (f.key === 'defectCode') {
    /* Admin > Defect Codes for the step's Type; a code no longer listed stays selectable so it doesn't show blank */
    const cur = stage.inputs['defectCode'] ?? '';
    const options = defectCodeOptions(stage.inspectionType);
    return { ...f, options: cur && !options.some(o => o.value === cur) ? [...options, { label: cur, value: cur }] : options };
  }
  if (f.key === 'degreeRt') {
    const required = rtDegreeRequired(job, stage);
    return required ? { ...f, label: `${f.label} (Required: ${required})` } : f;
  }
  if (f.key === 'allowableThicknessExceeded' && job) {
    return { ...f, label: `Allowable thickness of ${allowableThicknessAmount(job.nInd)} has been exceeded - Volumetric inspection (UT/RT) is required` };
  }
  /* engineering override: typed by hand, no list (a filler copied from Consumable Insert keeps its droplist below) */
  if (stage.engineeringEntry && ASSIGNED_KEYS.has(f.key) && !isFieldLocked(stage, f)) {
    return { ...f, type: 'text', options: undefined, description: '' };
  }
  /* typed PH/IP requirements take a number or NC, so they're text boxes */
  if (stage.engineeringEntry && REQUIREMENT_KEYS.has(f.key)) return { ...f, type: 'text' };
  const gwp = stage.inputs?.['weldProcedure'] ?? '';
  if (f.key === 'weldProcedure') {
    /* a Foreman Override opens every GWP; otherwise an off-list GWP left from one (e.g. in
       seeded data) is kept as an option so the droplist doesn't show blank */
    const qualified = gwpOptionsForMaterials(job?.materialType1 ?? '', job?.materialType2 ?? '');
    const options = ctx.offListUnlocked ? allGwpOptions()
      : gwp && !qualified.some(o => o.value === gwp) ? [...qualified, { label: gwp, value: gwp, detail: gwpDescription(gwp) }]
      : qualified;
    return { ...f, options, description: gwp ? gwpDescription(gwp) : '' };
  }
  if (f.key === 'wtn') {
    const wtn = stage.inputs?.['wtn'] ?? '';
    return { ...f, options: wtnOptionsForGwp(gwp), description: wtn ? wtnDescription(gwp, wtn) : '' };
  }
  if (f.key === 'fillerMetalType' || f.key === 'fillerMetalSize') {
    /* Locked (consumable insert copied the value) or opened by a Foreman Override: the full option
       set, so a value copied from Fit's Consumable Insert always has a matching <option> */
    if (isFieldLocked(stage, f) || ctx.offListUnlocked) {
      return { ...f, options: f.key === 'fillerMetalType' ? FILLER_METAL_TYPE_OPTIONS : FILLER_METAL_SIZE_OPTIONS };
    }
    const proc = getProcedureByGwpWtn(stage.inputs?.['weldProcedure'] ?? '', stage.inputs?.['wtn'] ?? '');
    return {
      ...f,
      options: f.key === 'fillerMetalType' ? fillerMetalTypeOptionsForProcedure(proc) : fillerMetalSizeOptionsForProcedure(proc)
    };
  }
  return f;
}

/* dependent fields whose trigger no longer matches but still hold a value: blanked so hidden
   fields don't keep stale values */
export function hiddenFieldsWithValues(stage: WorkflowStage): StageField[] {
  return stage.fields.filter(f => f.showIf && !showIfMet(stage, f) && stage.inputs[f.key]);
}

/* a trigger field that other fields declare a showIf against: always breaks onto its own row (even
   before a selection) so its dependent fields can flow to the right of it once they appear */
export function startsGroup(stage: WorkflowStage, field: StageField): boolean {
  return stage.fields.some(f => f.showIf?.key === field.key);
}
