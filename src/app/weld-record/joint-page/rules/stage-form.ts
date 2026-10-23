/* A step's fields on the joint page: which show, and the options each offers */
import { Job } from '../../../data/jobs';
import { StageField, WorkflowStage } from '../../model/workflow-types';
import { ACTUAL_REQUIREMENT, SHOW_WELD_OVERRIDES } from '../../signoff-definition/weld-fields';
import { isFilledByRule } from '../../signoff-definition/field-fill';
import { allowableThicknessAmount } from '../../routing/added-steps';
import { showIfMet } from '../../signoff-definition/stage-display';
import { baseStepId } from '../../routing/step-ids';
import { evaluateCondition } from '../../signoff-definition/field-conditions';
import { buildConditionContext } from '../../signoff-definition/condition-context';
import { hasStepActivation, fieldActivation } from '../../signoff-definition/step-field-config';
import { effectiveShowIf } from '../../signoff-definition/field-rules';
import { definedFields } from '../../signoff-definition/shown-fields';
import { inspectionProcedureOptions } from '../../../data/inspection-procedures';
import { defectCodeOptions } from '../../../data/defect-codes';
import { ASSIGNED_KEYS } from '../../../data/weld-assignment';
import {
  gwpOptionsForMaterials, allGwpOptions, wtnOptionsForGwp, gwpDescription, wtnDescription, getProcedureByGwpWtn, hasOverride as procedureHasOverride,
  fillerMetalTypeOptionsForProcedure, fillerMetalSizeOptionsForProcedure, FILLER_METAL_TYPE_OPTIONS, FILLER_METAL_SIZE_OPTIONS
} from '../../../data/procedures';

/* what the field rules need besides the step itself */
export interface StageFormContext {
  job: Job | undefined;
  stages: WorkflowStage[];
  /* a Foreman Override on this step opens GWP and Filler Metal Type/Size to their full lists */
  offListUnlocked: boolean;
  /* the joint's Fabrication values (Revised Joint Design decides whether an insert is needed) */
  fab?: Record<string, string>;
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
  if (baseStepId(stage.id) === 'root-ndt-utrt') return job?.rtRoot ?? '';
  if (baseStepId(stage.id) === 'final-ndt-utrt') return job?.rtFinal ?? '';
  return '';
}

/* Fields shown on the step, with their runtime options. Steps with an Admin > Signoff Type
   Definition (the built-in routing, Repair, Excavation NDT, Fit as Weld Build-Up) list its fields
   (definedFields); steps added in Admin > Routing Settings use their template's fields. */
export function visibleStageFields(stage: WorkflowStage, ctx: StageFormContext): StageField[] {
  const condCtx = buildConditionContext(stage, ctx.job, ctx.stages, ctx.fab);
  if (hasStepActivation(stage)) return definedFields(stage, condCtx).map(f => stageFieldOptions(f, stage, ctx));
  /* each template field follows its catalog show rule (e.g. Weld Position only when N Ind. is 1) */
  return stage.fields
    .map(f => stageFieldOptions(f, stage, ctx))
    .filter(f => {
      if (!showIfMet(stage, f)) return false;
      const cond = effectiveShowIf(fieldActivation(stage, f.key));
      if (cond && !evaluateCondition(cond, condCtx)) return false;
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
  /* engineering override: typed by hand, no list (a filler prepopulated from Consumable Insert keeps its droplist below) */
  if (stage.engineeringEntry && ASSIGNED_KEYS.has(f.key) && !isFilledByRule(stage, f.key)) {
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
    /* Prepopulated (e.g. from Fit's Consumable Insert) or opened by a Foreman Override: the full
       option set, so a copied value always has a matching <option> */
    if (isFilledByRule(stage, f.key) || ctx.offListUnlocked) {
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
