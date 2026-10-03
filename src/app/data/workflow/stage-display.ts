/* Turning a step's recorded values into what History and the joint page show */
import { SignoffField, SignoffInput, StageField, WorkflowStage } from './types';
import { isUserEditable } from './weld-fields';
import { hasDecision } from './stage-rules';

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
export function labelFor(stage: WorkflowStage, key: string): string {
  return stage.fields.find(f => f.key === key)?.label
    ?? stage.signoffFields.find(f => f.key === key)?.label
    ?? key;
}

/* true when a field's showIf trigger matches. inspectionType and result live on the stage itself,
   every other trigger key in stage.inputs. */
export function showIfMet(stage: WorkflowStage, f: StageField): boolean {
  if (!f.showIf) return true;
  const cur = f.showIf.key === 'inspectionType' ? stage.inspectionType
    : f.showIf.key === 'result' ? stage.result
    : stage.inputs[f.showIf.key];
  if (f.showIf.anyOf ? !f.showIf.anyOf.includes(cur ?? '') : cur !== f.showIf.equals) return false;
  return (f.showIf.and ?? []).every(c => (c.key === 'result' ? stage.result : stage.inputs[c.key]) === c.equals);
}

/* Fields whose showIf is met; a simple stand-in for the job page's visible fields, used only for seeded data. */
export function fieldsShown(stage: WorkflowStage): StageField[] {
  return stage.fields.filter(f => showIfMet(stage, f));
}

/* Every editable field the user was shown, with its value, plus Type and the decision. Blanks are kept:
   what was left empty is part of the record. The caller passes the fields that were visible. */
export function snapshotInputs(stage: WorkflowStage, fields: StageField[], signoffFields: SignoffField[]): SignoffInput[] {
  const out: SignoffInput[] = [];
  const typeOpts = stage.routingOptions ?? [];
  if (typeOpts.length) {
    const cur = stage.id === 'fit' ? stage.routingType : stage.inspectionType;
    out.push({ label: 'Type', value: typeOpts.find(o => o.value === cur)?.label ?? '' });
  }
  for (const f of fields) {
    if (isUserEditable(stage, f)) out.push({ label: f.label, value: displayValue(f, stage.inputs[f.key]) });
  }
  for (const f of signoffFields) out.push({ label: f.label, value: displayValue(f, stage.signoffInputs[f.key]) });
  if (stage.result && hasDecision(stage)) out.push({ label: stage.decisionLabel || 'Decision', value: stage.result.toUpperCase() });
  return out;
}
