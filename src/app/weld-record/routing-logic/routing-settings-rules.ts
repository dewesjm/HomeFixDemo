/* Rules for the Admin > Routing Settings rows (stored in data/routing-settings.ts): the live rows joints are
   built from, each with its Type options from Admin > Signoff Type to Routing (signoff-type-routing-rules.ts), and the
   checks a Routing Settings change must pass before it is saved. */
import { insertedDefinitionId } from './inserted-routing/instance-identity';
import { insertionConfigurationErrors } from './inserted-routing/insertion-validation';
import { addedRoutingSetup, routingNameError } from './inserted-routing/added-routing-configuration';
import { routingFormFields } from '../signoff-forms-logic/form-fields';
import { stepFieldConfigVersion } from '../../data/signoff-type-forms';
import { loadRoutingSettings, saveRoutingSettings } from '../../data/routing-settings';
import { registerStepTemplates, registerRoutingFields } from '../catalogs/field-choices';
import { StageTemplate } from '../model/stage-template';
import { excavationPossibleTypes, signoffTypeOptions } from '../signoff-forms-logic/signoff-type-routing-rules';
import { signoffTypeRoutingVersion } from '../../data/signoff-type-routing';

/* ── The live rows ── */

/* Routing Settings rows with each row's Type options (Admin > Signoff Type to Routing); cached until a save or a Type change */
let _merged: StageTemplate[] | null = null;
let _mergedTypesVersion = -1;

export function getTemplates(): StageTemplate[] {
  if (_merged && _mergedTypesVersion === signoffTypeRoutingVersion()) return _merged;
  _mergedTypesVersion = signoffTypeRoutingVersion();
  const rows = loadRoutingSettings();
  /* an Excavation can follow any routing whose rejection adds a Repair */
  const repairSources = rows.filter(s => s.rejectToStage === 'repair').map(s => s.id);
  _merged = rows.map(s => ({ ...s, typeOptions: s.lifecycle === 'excavation'
    ? excavationPossibleTypes(s.id, repairSources) : signoffTypeOptions(s.id) }));
  return _merged;
}

/* step-answer conditions (any step's own fields) read the live templates */
registerStepTemplates(() => getTemplates());
registerRoutingFields(routingFormFields, stepFieldConfigVersion);

/* invalidate the merged cache so next read re-loads from localStorage */
function invalidateTemplateCache() { _merged = null; }

/* ── Admin > Routing Settings edits ── */

export function addStageTemplate(stage: Omit<StageTemplate, 'required'> & { required?: boolean }) {
  const templates = getTemplates();
  const newStage: StageTemplate = {
    ...stage,
    required: stage.required ?? true,
    rejectToStage: stage.rejectToStage ?? '',
  };
  const error = routingNameError(newStage.label, newStage.id, templates);
  if (error) throw new Error(error);
  if (templates.some(t => t.id === newStage.id)) throw new Error('Routing ID already exists.');
  if (newStage.classification === 'added') {
    newStage.lifecycle = 'ordinary';
    newStage.status = 'draft';
  }
  persistTemplates([...templates, newStage]);
}

export function updateStageTemplate(stageId: string, patch: Partial<StageTemplate>) {
  const list = getTemplates();
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
  persistTemplates(updated);
}

/* Admin > Routing Settings Order: `ids` is the routings in their new order */
export function reorderStageTemplates(ids: string[]) {
  const list = getTemplates();
  const pos = (id: string) => { const i = ids.indexOf(id); return i < 0 ? ids.length + list.findIndex(s => s.id === id) : i; };
  persistTemplates([...list].sort((a, b) => pos(a.id) - pos(b.id)));
}

export function deleteStageTemplate(stageId: string) {
  const templates = getTemplates();
  if (templates.some(t => t.id === stageId && t.classification === 'added')) throw new Error('Deactivate inserted routings to retain references and history.');
  persistTemplates(templates.filter(s => s.id !== stageId));
}

function persistTemplates(templates: StageTemplate[]) {
  saveRoutingSettings(templates);
  invalidateTemplateCache();
}

/* every routing's id and label (for the admin screen) */
export function allStageIds(): { id: string; label: string }[] {
  return getTemplates().map(t => ({ id: t.id, label: t.label }));
}

/* A numbered round reads the settings of its shared added-routing row. */
export function routingTemplateId(id: string): string {
  return insertedDefinitionId(id) ?? /^(repair|nqc-excavation-ndt|excavation-ndt|engineering-hold)(-\d+)?$/.exec(id)?.[1] ?? id;
}
export function getAddedTemplate(id: string): StageTemplate {
  return getTemplates().find(t => t.id === routingTemplateId(id))!;
}
export function isAddedTemplateId(id: string): boolean {
  return getTemplates().some(t => t.id === id && t.classification === 'added');
}
