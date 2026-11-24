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
import type { JointType } from '../../data/jobs';

/* ── The live rows ── */

/* a joint type's Routing Settings rows with each row's Type options (Admin > Signoff Type to Routing);
   cached per joint type until a save or a Type change */
const _merged = new Map<JointType, { rows: StageTemplate[]; version: number }>();

export function getTemplates(jointType: JointType): StageTemplate[] {
  const cached = _merged.get(jointType);
  if (cached && cached.version === signoffTypeRoutingVersion()) return cached.rows;
  const rows = loadRoutingSettings(jointType);
  /* an Excavation can follow any routing whose rejection adds a Repair */
  const repairSources = rows.filter(s => s.rejectToStage === 'repair').map(s => s.id);
  const merged = rows.map(s => ({ ...s, typeOptions: s.lifecycle === 'excavation'
    ? excavationPossibleTypes(jointType, s.id, repairSources) : signoffTypeOptions(jointType, s.id) }));
  _merged.set(jointType, { rows: merged, version: signoffTypeRoutingVersion() });
  return merged;
}

/* step-answer conditions (any step's own fields) read the live templates */
registerStepTemplates(getTemplates);
registerRoutingFields(routingFormFields, stepFieldConfigVersion);

/* invalidate the merged cache so next read re-loads from localStorage */
function invalidateTemplateCache(jointType: JointType) { _merged.delete(jointType); }

/* ── Admin > Routing Settings edits ── */

export function addStageTemplate(jointType: JointType, stage: Omit<StageTemplate, 'required'> & { required?: boolean }) {
  const templates = getTemplates(jointType);
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
  persistTemplates(jointType, [...templates, newStage]);
}

export function updateStageTemplate(jointType: JointType, stageId: string, patch: Partial<StageTemplate>) {
  const list = getTemplates(jointType);
  const current = list.find(s => s.id === stageId);
  if (!current) return;
  const next = { ...current, ...patch, classification: current.classification, lifecycle: current.lifecycle };
  const error = routingNameError(next.label, stageId, list);
  if (error) throw new Error(error);
  if (next.classification === 'added' && next.lifecycle === 'ordinary' && next.status === 'active') {
    const setup = addedRoutingSetup(jointType, next);
    if (setup.errors.length) throw new Error(setup.errors.join(' '));
  }
  const updated = list.map(s => s.id === stageId ? next : s);
  const insertionErrors = insertionConfigurationErrors(updated);
  if (insertionErrors.length) throw new Error(insertionErrors.join(' '));
  persistTemplates(jointType, updated);
}

/* Admin > Routing Settings Order: `ids` is the routings in their new order */
export function reorderStageTemplates(jointType: JointType, ids: string[]) {
  const list = getTemplates(jointType);
  const pos = (id: string) => { const i = ids.indexOf(id); return i < 0 ? ids.length + list.findIndex(s => s.id === id) : i; };
  persistTemplates(jointType, [...list].sort((a, b) => pos(a.id) - pos(b.id)));
}

export function deleteStageTemplate(jointType: JointType, stageId: string) {
  const templates = getTemplates(jointType);
  if (templates.some(t => t.id === stageId && t.classification === 'added')) throw new Error('Deactivate inserted routings to retain references and history.');
  persistTemplates(jointType, templates.filter(s => s.id !== stageId));
}

function persistTemplates(jointType: JointType, templates: StageTemplate[]) {
  saveRoutingSettings(jointType, templates);
  invalidateTemplateCache(jointType);
}

/* every routing's id and label (for the admin screen) */
export function allStageIds(jointType: JointType): { id: string; label: string }[] {
  return getTemplates(jointType).map(t => ({ id: t.id, label: t.label }));
}

/* A numbered round reads the settings of its shared added-routing row. */
export function routingTemplateId(id: string): string {
  return insertedDefinitionId(id) ?? /^(repair|nqc-excavation-ndt|excavation-ndt|engineering-hold)(-\d+)?$/.exec(id)?.[1] ?? id;
}
export function getAddedTemplate(jointType: JointType, id: string): StageTemplate {
  return getTemplates(jointType).find(t => t.id === routingTemplateId(id))!;
}
export function isAddedTemplateId(jointType: JointType, id: string): boolean {
  return getTemplates(jointType).some(t => t.id === id && t.classification === 'added');
}
