import { repairCodeOptions } from '../../signoff-definition/repair-code-options';
import { weldPositionOptions } from '../../../data/weld-positions';
import { formInputFields } from '../../signoff-definition/form-fields';
import { FormField } from '../../signoff-definition/field-catalog';
/* A step's fields on the joint page: which show, and the options each offers */
import { Job } from '../../../data/jobs';
import { WorkflowStage } from '../../model/workflow-types';
import { ACTUAL_REQUIREMENT, SHOW_WELD_OVERRIDES } from '../../signoff-definition/weld-fields';
import { isFilledByRule } from '../../signoff-definition/field-fill';
import { rtDegreeRequired } from '../../signoff-definition/rt-degree-minimum';
import { evaluateCondition, conditionClauses } from '../../signoff-definition/field-conditions';
import { buildConditionContext } from '../../signoff-definition/condition-context';
import { fieldActivation } from '../../signoff-definition/step-field-config';
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

/* Fields listed by the selected Type form, with evaluated rules and runtime option lists. */
export function visibleStageFields(stage: WorkflowStage, ctx: StageFormContext): FormField[] {
  const condCtx = buildConditionContext(stage, ctx.job, ctx.stages, ctx.fab);
  return definedFields(stage, condCtx).map(f => stageFieldOptions(f, stage, ctx)).filter(f => {
    if (!f.key.startsWith('override')) return true;
    const proc = getProcedureByGwpWtn(stage.inputs['weldProcedure'] ?? '', stage.inputs['wtn'] ?? '');
    return SHOW_WELD_OVERRIDES && !!proc && procedureHasOverride(proc);
  });
}

/* A field with its runtime options and label. GWP is filtered to the GWPs qualified for this job's
   base metal pair (Material Type 1/2), WTN to the selected GWP, and Filler Metal Type/Size to the
   Procedure that GWP+WTN resolves to. */
export function stageFieldOptions(f: FormField, stage: WorkflowStage, ctx: StageFormContext): FormField {
  const job = ctx.job;
  if (f.key === 'weldPosition') {
    const current = stage.inputs[f.key] ?? '';
    const options = weldPositionOptions();
    const recorded = weldPositionOptions(true).find(o => o.value === current);
    return { ...f, options: current && !options.some(o => o.value === current)
      ? [...options, recorded ?? { label: current, value: current }] : options };
  }
  if (f.key === 'repairType') {
    const current = stage.inputs['repairType'] ?? '';
    const options = repairCodeOptions();
    const recorded = repairCodeOptions(true).find(o => o.value === current);
    return { ...f, options: current && !options.some(o => o.value === current)
      ? [...options, recorded ?? { value: current, label: current }] : options };
  }
  if (f.key === 'weldColor') {
    const current = stage.inputs['weldColor'] ?? '';
    const options = f.options ?? [];
    return { ...f, options: current && !options.some(o => o.value === current)
      ? [...options, { label: current, value: current }] : options };
  }
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
    const recorded = defectCodeOptions(stage.inspectionType, true).find(o => o.value === cur);
    return { ...f, options: cur && !options.some(o => o.value === cur) ? [...options, recorded ?? { label: cur, value: cur }] : options };
  }
  if (f.key === 'degreeRt') {
    const required = rtDegreeRequired(job, stage);
    return required ? { ...f, label: `${f.label} (Required: ${required})` } : f;
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
export function hiddenFieldsWithValues(stage: WorkflowStage): FormField[] {
  return formInputFields(stage).filter(f => {
    const show = effectiveShowIf(fieldActivation(stage, f.key));
    return !!show && conditionClauses(show).every(c => c.source === 'field') && !evaluateCondition(show, buildConditionContext(stage, undefined, [])) && !!stage.inputs[f.key];
  });
}
