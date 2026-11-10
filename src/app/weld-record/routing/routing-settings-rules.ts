/* Rules for the Admin > Routing Settings rows (stored in data/routing-settings.ts): the live rows joints are
   built from, each with its Type options from Admin > Signoff Type to Routing (signoff-type-routing-rules.ts), and the
   checks a Routing Settings change must pass before it is saved. */
import { insertedDefinitionId } from './inserted/instance-identity';
import { insertionConfigurationErrors } from './inserted/insertion-validation';
import { addedRoutingSetup, routingNameError } from './inserted/added-routing-configuration';
import { routingFormFields } from '../signoff-definition/form-fields';
import { stepFieldConfigVersion } from '../../data/signoff-type-forms';
import { NDT_KINDS } from './ndt';
import { Job } from '../../data/jobs';
import { loadRoutingSettings, saveRoutingSettings } from '../../data/routing-settings';
import { registerStepTemplates, registerRoutingFields } from '../catalogs/field-choices';
import { StageTemplate } from '../model/workflow-types';
import { signoffTypeOptions } from '../signoff-definition/signoff-type-routing-rules';
import { signoffTypeRoutingVersion } from '../../data/signoff-type-routing';

/* ── The live rows ── */

/* Routing Settings rows with each row's Type options (Admin > Signoff Type to Routing); cached until a save or a Type change */
let _merged: Record<Job['trade'], StageTemplate[]> | null = null;
let _mergedTypesVersion = -1;

export function getTemplates(): Record<Job['trade'], StageTemplate[]> {
  if (_merged && _mergedTypesVersion === signoffTypeRoutingVersion()) return _merged;
  _mergedTypesVersion = signoffTypeRoutingVersion();
  const rows = loadRoutingSettings();
  for (const trade of Object.keys(rows) as Job['trade'][]) {
    rows[trade] = rows[trade].map(s => ({ ...s, typeOptions: s.lifecycle === 'excavation' ? Object.values(NDT_KINDS).flatMap(k => k.options) : signoffTypeOptions(s.id) }));
  }
  _merged = rows;
  return _merged;
}

/* step-answer conditions (any step's own fields) read the live templates */
registerStepTemplates(() => getTemplates());
registerRoutingFields(routingFormFields, stepFieldConfigVersion);

/* invalidate the merged cache so next read re-loads from localStorage */
function invalidateTemplateCache() { _merged = null; }

/* ── Admin > Routing Settings edits ── */

export function addStageTemplate(trade: Job['trade'], stage: Omit<StageTemplate, 'required'> & { required?: boolean }) {
  const templates = getTemplates();
  const newStage: StageTemplate = {
    ...stage,
    required: stage.required ?? true,
    rejectToStage: stage.rejectToStage ?? '',
  };
  const error = routingNameError(newStage.label, newStage.id, templates[trade] ?? []);
  if (error) throw new Error(error);
  if ((templates[trade] ?? []).some(t => t.id === newStage.id)) throw new Error('Routing ID already exists.');
  if (newStage.classification === 'added') {
    newStage.lifecycle = 'ordinary';
    newStage.status = 'draft';
  }
  templates[trade] = [...(templates[trade] ?? []), newStage];
  persistTemplates(templates);
}

export function updateStageTemplate(trade: Job['trade'], stageId: string, patch: Partial<StageTemplate>) {
  const templates = getTemplates();
  const list = templates[trade];
  if (!list) return;
  const current = list.find(s => s.id === stageId);
  if (!current) return;
  const next = { ...current, ...patch, classification: current.classification, lifecycle: current.lifecycle };
  const error = routingNameError(next.label, stageId, list);
  if (error) throw new Error(error);
  if (next.classification === 'added' && next.lifecycle === 'ordinary' && next.status === 'active') {
    const setup = addedRoutingSetup(next);
    if (setup.errors.length) throw new Error(setup.errors.join(' '));
  }
  const updated = list.map(s => s.id === stageId ? next : s);
  const insertionErrors = insertionConfigurationErrors(updated);
  if (insertionErrors.length) throw new Error(insertionErrors.join(' '));
  templates[trade] = updated;
  persistTemplates(templates);
}

/* Admin > Routing Settings Order: `ids` is the trade's steps in their new order */
export function reorderStageTemplates(trade: Job['trade'], ids: string[]) {
  const templates = getTemplates();
  const list = templates[trade] ?? [];
  const pos = (id: string) => { const i = ids.indexOf(id); return i < 0 ? ids.length + list.findIndex(s => s.id === id) : i; };
  templates[trade] = [...list].sort((a, b) => pos(a.id) - pos(b.id));
  persistTemplates(templates);
}

export function deleteStageTemplate(trade: Job['trade'], stageId: string) {
  const templates = getTemplates();
  if (templates[trade]?.some(t => t.id === stageId && t.classification === 'added')) throw new Error('Deactivate inserted routings to retain references and history.');
  templates[trade] = (templates[trade] ?? []).filter(s => s.id !== stageId);
  persistTemplates(templates);
}

function persistTemplates(templates: Record<Job['trade'], StageTemplate[]>) {
  saveRoutingSettings(templates);
  invalidateTemplateCache();
}

/* all unique stage ids across all trades (for the admin screen) */
export function allStageIds(): { id: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const templates of Object.values(getTemplates())) {
    for (const t of templates) {
      if (!seen.has(t.id)) seen.set(t.id, t.label);
    }
  }
  return [...seen.entries()].map(([id, label]) => ({ id, label }));
}

/* A numbered round reads the settings of its shared added-routing row. */
export function routingTemplateId(id: string): string {
  return insertedDefinitionId(id) ?? /^(repair|nqc-excavation-ndt|excavation-ndt|engineering-hold)(-\d+)?$/.exec(id)?.[1] ?? id;
}
export function getAddedTemplate(id: string): StageTemplate {
  return getTemplates()['Welding'].find(t => t.id === routingTemplateId(id))!;
}
export function isAddedTemplateId(id: string): boolean {
  return getTemplates()['Welding'].some(t => t.id === id && t.classification === 'added');
}
