/* A step's fields on the joint page: which show, and the options each offers */
import { repairCodeOptions } from '../signoff-forms-logic/repair-code-options';
import { weldPositionOptions } from '../../data/weld-positions';
import { formInputFields } from '../signoff-forms-logic/form-fields';
import { FormField } from '../catalogs/field-catalog';
import { Job } from '../../data/jobs';
import { WorkflowStage } from '../model/workflow-types';
import { ACTUAL_REQUIREMENT, SHOW_WELD_OVERRIDES } from '../signoff-forms-logic/weld-fields';
import { isFilledByRule } from '../signoff-forms-logic/field-fill';
import { rtDegreeRequired } from '../signoff-forms-logic/rt-degree-minimum';
import { evaluateCondition, conditionClauses } from '../conditions-logic/form-conditions';
import { buildConditionContext } from '../signoff-forms-logic/condition-context';
import { fieldActivation } from '../signoff-forms-logic/signoff-type-form-rules';
import { effectiveShowIf } from '../signoff-forms-logic/field-rules';
import { definedFields } from '../signoff-forms-logic/shown-fields';
import { inspectionProcedureOptions } from '../../data/inspection-procedures';
import { defectCodeOptions } from '../../data/defect-codes';
import { ASSIGNED_KEYS } from '../weld-assignment-logic/weld-assignment-rules';
import { FILLER_METAL_TYPE_OPTIONS, FILLER_METAL_SIZE_OPTIONS } from '../../data/procedures';
import {
  getGwpOptions, getAllGwpOptions, getWtnOptions, getGwpDescription,
  getWtnDescription, getProcedureOverride, getFillerMetalTypeOptions, getFillerMetalSizeOptions,
} from '../../future/weld-engineering/procedure-service/procedure-usage';

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
    return SHOW_WELD_OVERRIDES && !!getProcedureOverride(stage.inputs['weldProcedure'] ?? '', stage.inputs['wtn'] ?? '');
  });
}

type Option = { label: string; value: string };

/* Fields whose droplist comes from an admin list that can stop offering a value already saved on a
   routing (made inactive, removed, or not offered for this Type). `all` includes inactive entries,
   for the saved value's label. */
function adminLists(f: FormField, stage: WorkflowStage): { offered: Option[]; all?: Option[] } | undefined {
  switch (f.key) {
    case 'weldPosition': return { offered: weldPositionOptions(), all: weldPositionOptions(true) };
    case 'repairType': return { offered: repairCodeOptions(), all: repairCodeOptions(true) };
    case 'weldColor': return { offered: f.options ?? [] };
    /* Admin > Inspection Procedures and Admin > Defect Codes for the routing's Type */
    case 'procedureUsed': return { offered: inspectionProcedureOptions(stage.inspectionType) };
    case 'defectCode': return { offered: defectCodeOptions(stage.inspectionType), all: defectCodeOptions(stage.inspectionType, true) };
    default: return undefined;
  }
}

/* The offered list, plus the saved value when it's no longer on it, so the droplist doesn't show blank */
function withSavedValue(offered: Option[], saved: string, all: Option[] = []): Option[] {
  if (!saved || offered.some(o => o.value === saved)) return offered;
  return [...offered, all.find(o => o.value === saved) ?? { label: saved, value: saved }];
}

/* A field with its runtime options and label. GWP is filtered to the GWPs qualified for this job's
   base metal pair (Material Type 1/2), WTN to the selected GWP, and Filler Metal Type/Size to the
   WTN that GWP+WTN matches. */
export function stageFieldOptions(f: FormField, stage: WorkflowStage, ctx: StageFormContext): FormField {
  const job = ctx.job;
  const lists = adminLists(f, stage);
  if (lists) return { ...f, options: withSavedValue(lists.offered, stage.inputs[f.key] ?? '', lists.all) };
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
    const qualified = getGwpOptions(job?.materialType1 ?? '', job?.materialType2 ?? '');
    const options = ctx.offListUnlocked ? getAllGwpOptions()
      : gwp && !qualified.some(o => o.value === gwp) ? [...qualified, { label: gwp, value: gwp, detail: getGwpDescription(gwp) }]
      : qualified;
    return { ...f, options, description: gwp ? getGwpDescription(gwp) : '' };
  }
  if (f.key === 'wtn') {
    const wtn = stage.inputs?.['wtn'] ?? '';
    return { ...f, options: getWtnOptions(gwp), description: wtn ? getWtnDescription(gwp, wtn) : '' };
  }
  if (f.key === 'fillerMetalType' || f.key === 'fillerMetalSize') {
    /* Prepopulated (e.g. from Fit's Consumable Insert) or opened by a Foreman Override: the full
       option set, so a copied value always has a matching <option> */
    if (isFilledByRule(stage, f.key) || ctx.offListUnlocked) {
      return { ...f, options: f.key === 'fillerMetalType' ? FILLER_METAL_TYPE_OPTIONS : FILLER_METAL_SIZE_OPTIONS };
    }
    const wtn = stage.inputs?.['wtn'] ?? '';
    return { ...f, options: f.key === 'fillerMetalType' ? getFillerMetalTypeOptions(gwp, wtn) : getFillerMetalSizeOptions(gwp, wtn) };
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
