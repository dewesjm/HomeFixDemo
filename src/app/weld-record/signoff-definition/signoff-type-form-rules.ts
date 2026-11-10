/* Admin > Signoff Type Forms rules: which definition a routing reads (its Type's, including
   Excavation NDT), a field's settings on it, and what its verify-grid rows are checked against. The
   definitions are in data/signoff-type-forms.ts. */
import type { WorkflowStage } from '../model/workflow-types';
import { signoffTypeOptions } from './signoff-type-routing-rules';
import { isExcavationNdtStageId } from '../routing/routing-ids';
import {
  DEFAULT_TYPE_DEFINITIONS, FieldActivation, TYPE_KEY, TypeDefinition, VerifyAgainst, getStepFieldConfig,
} from '../../data/signoff-type-forms';

export function isHeadingItem(a: FieldActivation): boolean {
  return a.heading !== undefined;
}

/* a Layout list item that isn't a field: a heading */
function isLayoutOnlyItem(a: FieldActivation): boolean {
  return isHeadingItem(a);
}

/* the definition's fields, without its headings */
export function definitionFields(items: FieldActivation[]): FieldActivation[] {
  return items.filter(a => !isLayoutOnlyItem(a));
}

/* what a step whose Type hasn't been picked yet shows: only the Type droplist */
const TYPE_ONLY: TypeDefinition = { typeId: '', fields: [{ key: TYPE_KEY, line: 1 }] };

/* a definition by its id (a Type's value), or a step, which reads the definition of its Type */
export type StepRef = string | Pick<WorkflowStage, 'id' | 'signoffType'> & Partial<Pick<WorkflowStage, 'insertion' | 'typeOptions' | 'attributeRules' | 'inputs'>>;

/* the definition a step reads: its Type's, including Excavation NDT; '' while
   the step has Types but none is picked yet; undefined for a step with no Types (Engineering Hold, a
   routing without a Signoff Type to Routing row), which has no form */
export function definitionId(step: StepRef): string | undefined {
  if (typeof step === 'string') return step;
  if (isExcavationNdtStageId(step.id)) return step.signoffType === 'standard' ? '' : step.signoffType;
  const options = step.insertion || step.attributeRules ? step.typeOptions : signoffTypeOptions(step.id);
  if (!options) return undefined;
  return options.some(o => o.value === step.signoffType) ? step.signoffType : '';
}

function findDefinition(step: StepRef): TypeDefinition | undefined {
  const id = definitionId(step);
  if (id === undefined) return undefined;
  if (!id) return TYPE_ONLY;
  return getStepFieldConfig().find(a => a.typeId === id) ?? DEFAULT_TYPE_DEFINITIONS.find(a => a.typeId === id);
}

/* whether a step's fields come from a definition (otherwise from its template): its Type has one */
export function hasStepActivation(step: StepRef): boolean {
  return !!findDefinition(step);
}

/* a field's settings on a step: its definition's entry, else the catalog defaults (a step with no
   definition, or a field its definition doesn't list) */
export function fieldActivation(step: StepRef, key: string): FieldActivation {
  return findDefinition(step)?.fields.find(a => a.key === key) ?? { key };
}

/* whether the step's definition lists the field; used for fields its own form draws (Release to
   welding, Affected Item), which show only when listed */
export function definitionHas(step: StepRef, key: string): boolean {
  return !!findDefinition(step)?.fields.some(a => a.key === key);
}

/* the definition a step reads, or an empty one when it has none */
export function getActivationForStep(step: StepRef): TypeDefinition {
  const definition = findDefinition(step) ?? { typeId: definitionId(step) ?? '', fields: [] };
  if (typeof step === 'string' || !(step.attributeRules?.accessible.length || step.attributeRules?.askAccessible)) return definition;
  /* Attribute Code Exceptions accessible rules: "ID is accessible" is asked above the Type, on its own line */
  const fields = definition.fields.filter(f => f.key !== 'idAccessible');
  const at = Math.max(0, fields.findIndex(f => f.key === TYPE_KEY));
  const line = fields[at]?.line ?? 1;
  fields.splice(at, 0, { key: 'idAccessible', required: true, showIf: { all: [] }, fill: null, line });
  return { ...definition, fields: fields.map((f, i) => i > at && f.line !== undefined && f.line >= line ? { ...f, line: f.line + 1 } : f) };
}

/* what the step's verify-grid rows are checked against */
export function verifyAgainst(step: StepRef): VerifyAgainst {
  const id = definitionId(step);
  return getActivationForStep(step).verifyAgainst
    ?? DEFAULT_TYPE_DEFINITIONS.find(a => a.typeId === id)?.verifyAgainst ?? 'record';
}
