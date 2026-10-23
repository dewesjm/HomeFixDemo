import { FormField } from './field-catalog';
/* Turning a step's recorded values into what History and the joint page show */
import { SignoffInput, WorkflowStage } from '../model/workflow-types';
import { isUserEditable } from './field-locks';
import { hasDecision, showsType } from './stage-rules';
import { withComments } from './signoff-parts';
import { lookupCatalogField } from './field-catalog';

export function displayValue(f: { type: string; options?: { label: string; value: string }[]; unit?: string }, raw: string | undefined): string {
  const v = raw ?? '';
  if (f.type === 'checkbox') return v === 'yes' ? 'Yes' : 'No';
  if (!v) return '';
  const opt = f.options?.find(o => o.value === v);
  if (opt) return opt.label;
  return f.unit ? `${v} ${f.unit}` : v;
}

/* value as shown in the history Old/New columns; a dash when empty */
export const show = (v: string | null | undefined) => (v && v.length ? v : '-');

/* display label for a raw stage input key, falling back to the key itself if undefined */
export function labelFor(_stage: WorkflowStage, key: string): string {
  return lookupCatalogField(key)?.label ?? key;
}

/* Every editable field the user was shown, with its value, plus Type and the decision. Blanks are kept:
   what was left empty is part of the record. The caller passes the fields that were visible. */
export function snapshotInputs(stage: WorkflowStage, fields: FormField[], signoffFields: FormField[]): SignoffInput[] {
  const out: SignoffInput[] = [];
  const typeOpts = stage.typeOptions ?? [];
  if (showsType(stage)) {
    out.push({ label: 'Type', value: typeOpts.find(o => o.value === stage.inspectionType)?.label ?? '' });
  }
  for (const f of fields) {
    if (isUserEditable(stage, f)) out.push({ label: f.label, value: displayValue(f, stage.inputs[f.key]) });
  }
  for (const f of withComments(stage, signoffFields)) out.push({ label: f.label, value: displayValue(f, stage.signoffInputs[f.key]) });
  if (stage.result && hasDecision(stage)) out.push({ label: stage.decisionLabel || 'Decision', value: stage.result.toUpperCase() });
  return out;
}
