import { addedRoutingSetup, routingNameError } from './added-routing-configuration';
import { routingFormFields } from '../signoff-definition/form-fields';
import { stepFieldConfigVersion } from '../signoff-definition/step-field-config';
/* The step templates joints are built from: the built-in Welding steps merged with Admin > Routing Settings's
   saved changes (localStorage), and the functions Admin > Routing Settings saves through. Each step's
   Type options come from Admin > Signoff Types By Routing (signoff-types.ts). */
import { ADDED_STAGE_TEMPLATES } from './added-stage-templates';
import { NDT_KINDS } from './ndt';
import { Job } from '../../data/jobs';
import { STORAGE } from '../../data/storage-keys';
import { DEFAULT_STEP_CONDITIONS, DEFAULT_REJECT_RULES, DEFAULT_THEN_RULES, ConditionRule, RejectRule, registerStepTemplates, registerRoutingFields } from './step-conditions';
import { StageTemplate } from '../model/workflow-types';
import { signoffTypeOptions, signoffTypesVersion } from '../signoff-definition/signoff-types';
import { WELDING_STEPS } from '../../data/welding-steps';
import { lastFabricationEditStep } from './built-in-step-rules';

/* built-in: Fabrication is editable up to and including Fit-Up Insp (either row), locked after it signs */
function withFabricationEditable(list: StageTemplate[]): StageTemplate[] {
  const fitupAt = list.reduce((at, s, i) => lastFabricationEditStep(s.id) ? i : at, -1);
  return list.map((s, i) => ({ ...s, fabricationEditable: fitupAt < 0 || i <= fitupAt }));
}

/* the built-in Welding steps, with their built-in conditions and reject rules */
const STATIC_TEMPLATES: Record<Job['trade'], StageTemplate[]> = {
  Welding: withFabricationEditable(WELDING_STEPS
    .map(s => DEFAULT_STEP_CONDITIONS[s.id] ? { ...s, includeWhen: DEFAULT_STEP_CONDITIONS[s.id] } : s)
    .map(s => ({ ...s, thenRules: DEFAULT_THEN_RULES[s.id] ?? [] }))
    .map(s => DEFAULT_REJECT_RULES[s.id] ? { ...s, rejectRules: DEFAULT_REJECT_RULES[s.id] } : s)).concat(ADDED_STAGE_TEMPLATES),
};

/* ── Saved Admin > Routing Settings changes (localStorage) ── */

/* serialized form — required is always a plain boolean (no functions). Fields belong to Type forms and the catalog, not to routing templates. */
interface SerializedStage {
  classification?: StageTemplate['classification'];
  lifecycle?: StageTemplate['lifecycle'];
  status?: StageTemplate['status'];
  id: string;
  label: string;
  displayName?: string;
  required: boolean;
  rejectToStage: string;
  role?: string;
  roleRules?: StageTemplate['roleRules'];
  includeWhen?: ConditionRule[];
  rejectRules?: RejectRule[];
  thenRules?: RejectRule[];
  rejectRulesEdited?: boolean;
  fabricationEditable?: boolean;
}

function serializeStage(t: StageTemplate): SerializedStage {
  return {
    classification: t.classification ?? 'numbered', lifecycle: t.lifecycle ?? 'ordinary', status: t.status ?? 'active',
    id: t.id,
    label: t.label,
    displayName: t.displayName,
    required: typeof t.required === 'function' ? true : t.required,
    rejectToStage: t.rejectToStage ?? '',
    role: t.role ?? '',
    roleRules: t.roleRules ?? [],
    includeWhen: t.includeWhen ?? [],
    rejectRules: t.rejectRules ?? [],
    thenRules: t.thenRules ?? [],
    rejectRulesEdited: t.rejectRulesEdited,
    fabricationEditable: t.fabricationEditable ?? false,
  };
}

/* Only the settings above are read back, so a setting no longer offered drops out of an older save.
   Reject rules never edited here follow the built-in ones. */
function deserializeStage(s: SerializedStage, builtIn?: StageTemplate): StageTemplate {
  return {
    classification: s.classification ?? builtIn?.classification ?? 'numbered',
    lifecycle: builtIn?.lifecycle ?? 'ordinary', status: s.status ?? 'active',
    id: s.id, label: s.label, displayName: s.displayName, required: s.required, rejectToStage: s.rejectToStage,
    role: s.role ?? '', roleRules: s.roleRules ?? builtIn?.roleRules ?? [], includeWhen: s.includeWhen,
    rejectRules: s.rejectRulesEdited ? s.rejectRules : builtIn?.rejectRules ?? s.rejectRules,
    thenRules: s.thenRules ?? builtIn?.thenRules ?? [],
    rejectRulesEdited: s.rejectRulesEdited, fabricationEditable: s.fabricationEditable ?? false,
  };
}

function loadSavedOverrides(): Record<string, SerializedStage[]> {
  try {
    const raw = localStorage.getItem(STORAGE.stageTemplates);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveOverrides(overrides: Record<string, SerializedStage[]>) {
  try { localStorage.setItem(STORAGE.stageTemplates, JSON.stringify(overrides)); } catch { /* */ }
}

/* ── The merged templates ── */

/* merged view: static defaults + admin overrides (saved to localStorage) */
let _merged: Record<Job['trade'], StageTemplate[]> | null = null;
let _mergedTypesVersion = -1;

export function getTemplates(): Record<Job['trade'], StageTemplate[]> {
  if (_merged && _mergedTypesVersion === signoffTypesVersion()) return _merged;
  _mergedTypesVersion = signoffTypesVersion();
  const saved = loadSavedOverrides();
  _merged = {} as Record<Job['trade'], StageTemplate[]>;
  // Start with static defaults, merge admin overrides by stage ID
  for (const [trade, statics] of Object.entries(STATIC_TEMPLATES) as [Job['trade'], StageTemplate[]][]) {
    const overridden = saved[trade];
    if (overridden) {
      /* saved order wins (Admin > Routing Settings reorders); a built-in step the save doesn't have goes in
         after the built-in step before it */
      const staticMap = new Map(statics.map(s => [s.id, s]));
      const merged = overridden.map(s => deserializeStage(s, staticMap.get(s.id)));
      statics.forEach((st, i) => {
        if (merged.some(m => m.id === st.id)) return;
        const prev = i > 0 ? merged.findIndex(m => m.id === statics[i - 1].id) : -1;
        merged.splice(prev + 1, 0, st);
      });
      _merged[trade] = merged;
    } else {
      _merged[trade] = statics;
    }
    _merged[trade] = _merged[trade].map(s => ({ ...s, classification: s.classification ?? 'numbered', lifecycle: s.lifecycle ?? 'ordinary', status: s.status ?? 'active', typeOptions: s.id === 'excavation-ndt' ? Object.values(NDT_KINDS).flatMap(k => k.options) : signoffTypeOptions(s.id) }));
  }
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
  templates[trade] = list.map(s => s.id === stageId ? next : s);
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
  if (templates[trade]?.some(t => t.id === stageId && t.classification === 'added')) throw new Error('Deactivate added routings to retain references and history.');
  templates[trade] = (templates[trade] ?? []).filter(s => s.id !== stageId);
  persistTemplates(templates);
}

function persistTemplates(templates: Record<Job['trade'], StageTemplate[]>) {
  const serialized: Record<string, SerializedStage[]> = {};
  for (const [trade, list] of Object.entries(templates)) {
    serialized[trade] = list.map(serializeStage);
  }
  saveOverrides(serialized);
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
  return /^(repair|excavation-ndt|engineering-hold)(-\d+)?$/.exec(id)?.[1] ?? id;
}
export function getAddedTemplate(id: string): StageTemplate {
  return getTemplates()['Welding'].find(t => t.id === routingTemplateId(id))!;
}
export function isAddedTemplateId(id: string): boolean {
  return getTemplates()['Welding'].some(t => t.id === id && t.classification === 'added');
}
