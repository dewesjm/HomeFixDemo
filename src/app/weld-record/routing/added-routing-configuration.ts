/* Readiness of ordinary inserted definitions; Type/form configuration stays with its existing owners. */
import { describeConditions } from './step-conditions';
import { StageTemplate } from '../model/workflow-types';
import { getSignoffTypeRows } from '../signoff-definition/signoff-types';
import { getRoutingSignoffTypes } from '../signoff-definition/routing-signoff-types';
import { getStepFieldConfig } from '../signoff-definition/step-field-config';

export function routingNameError(name: string, id: string, templates: StageTemplate[]): string {
  if (!name.trim()) return 'Enter a routing name.';
  return templates.some(t => t.id !== id && t.label.trim().toLowerCase() === name.trim().toLowerCase())
    ? 'A routing with this name already exists.' : '';
}

export function addedRoutingSetup(template: StageTemplate): { errors: string[]; summary: string } {
  const errors: string[] = [];
  if (!template.label.trim()) errors.push('Enter a routing name.');
  if (!template.role || template.role === 'View') errors.push('Choose a signing persona.');
  const row = getSignoffTypeRows().find(r => r.stepId === template.id);
  if (template.lifecycle !== 'ordinary') return { errors: [], summary: 'Built-in lifecycle; configure its Types in Signoff Types By Routing.' };
  if (!row || (!row.typeSource && !row.types.length)) errors.push('Offer at least one Signoff Type.');
  if ((row?.types.filter(t => t.default).length ?? 0) > 1) errors.push('Choose at most one default Type.');
  const types = getRoutingSignoffTypes();
  const forms = getStepFieldConfig();
  const labels = [...(row?.types ?? []), ...(row?.typeExceptions ?? []).map(r => ({ type: r.to, default: false, enableWhen: r.when }))].map(option => {
    const type = types.find(t => t.value === option.type);
    if (!type) errors.push(`Unknown Type: ${option.type}.`);
    else {
      if (type.signsStep && type.signsStep !== template.id) errors.push(`${type.label} signs another routing; choose a Type that signs this routing.`);
      if (!forms.some(f => f.typeId === type.value && f.fields.some(field => field.heading === undefined))) errors.push(`Configure a form for ${type.label}.`);
    }
    return `${type?.label ?? option.type}${option.default ? ' (default)' : ''} [${describeConditions(option.enableWhen)}]`;
  });
  return { errors, summary: errors.length ? errors.join(' ') : `Ready: ${labels.join('; ')}. Uses shared Type forms.` };
}
