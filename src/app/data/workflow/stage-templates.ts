/* The step templates joints are built from: the built-in Welding steps merged with Admin > Routing Settings's
   saved changes (localStorage), and the functions Admin > Routing Settings saves through. Each step's
   Type options come from Admin > Signoff Type Availability (signoff-types.ts). */
import { Job } from '../jobs';
import { STORAGE } from '../storage-keys';
import { DEFAULT_STEP_CONDITIONS, DEFAULT_REJECT_RULES, ConditionRule, RejectRule, registerStepTemplates } from '../step-conditions';
import { SignoffField, StageField, StageTemplate } from './types';
import { signoffTypeOptions, signoffTypesVersion } from './signoff-types';
import { WELDING_STEPS } from './welding-steps';

/* sign-off fields a new step starts with in Admin > Routing Settings */
export const DEFAULT_SIGNOFF_FIELDS: SignoffField[] = [
  { key: 'inspectorName', label: 'Inspector name', type: 'text', required: true },
  { key: 'licenseNo',     label: 'License #',      type: 'text', required: false },
  { key: 'permitVerified', label: 'Permit verified', type: 'select', required: false,
    options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }, { label: 'N/A', value: 'na' }] },
  { key: 'testMethod',    label: 'Test method',    type: 'select', required: false,
    options: [
      { label: 'Visual + functional', value: 'visual-functional' },
      { label: 'Pressure test', value: 'pressure' },
      { label: 'Meter reading', value: 'meter' },
      { label: 'Load test', value: 'load' }
    ] },
  { key: 'crewSize',      label: 'Crew size',      type: 'number', required: false, placeholder: 'e.g. 2' },
  { key: 'safetyCheck',   label: 'Safety check',   type: 'select', required: false,
    options: [{ label: 'Passed', value: 'passed' }, { label: 'Passed w/ notes', value: 'passed-notes' }, { label: 'N/A', value: 'na' }] },
  { key: 'reworkNeeded',  label: 'Rework needed',  type: 'select', required: false,
    options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
  { key: 'customerSignature', label: 'Customer signature', type: 'select', required: false,
    options: [{ label: 'On file', value: 'on-file' }, { label: 'Verbal', value: 'verbal' }, { label: 'Pending', value: 'pending' }] },
  { key: 'notes',         label: 'Notes',          type: 'text', required: false, placeholder: 'Additional notes…' },
];

export function defaultSignoffFields(): SignoffField[] {
  return DEFAULT_SIGNOFF_FIELDS.map(f => ({ ...f }));
}

/* built-in: Fabrication is editable up to and including Fit-Up Insp, locked after it signs */
function withFabricationEditable(list: StageTemplate[]): StageTemplate[] {
  const fitupAt = list.findIndex(s => s.id === 'fitup-insp');
  return list.map((s, i) => ({ ...s, fabricationEditable: fitupAt < 0 || i <= fitupAt }));
}

/* the built-in Welding steps, with their built-in conditions and reject rules */
const STATIC_TEMPLATES: Record<Job['trade'], StageTemplate[]> = {
  Welding: withFabricationEditable(WELDING_STEPS
    .map(s => DEFAULT_STEP_CONDITIONS[s.id] ? { ...s, includeWhen: DEFAULT_STEP_CONDITIONS[s.id] } : s)
    .map(s => DEFAULT_REJECT_RULES[s.id] ? { ...s, rejectRules: DEFAULT_REJECT_RULES[s.id] } : s)),
};

/* ── Saved Admin > Routing Settings changes (localStorage) ── */

/* serialized form — required is always a plain boolean (no functions) */
interface SerializedStage {
  id: string;
  label: string;
  displayName?: string;
  required: boolean;
  fields: StageField[];
  signoffFields: SignoffField[];
  rejectToStage: string;
  repeatable?: boolean;
  role?: string;
  includeWhen?: ConditionRule[];
  rejectRules?: RejectRule[];
  rejectRulesEdited?: boolean;
  fabricationEditable?: boolean;
}

function serializeStage(t: StageTemplate): SerializedStage {
  return {
    id: t.id,
    label: t.label,
    displayName: t.displayName,
    required: typeof t.required === 'function' ? true : t.required,
    fields: t.fields,
    signoffFields: t.signoffFields ?? DEFAULT_SIGNOFF_FIELDS,
    rejectToStage: t.rejectToStage ?? '',
    repeatable: t.repeatable ?? false,
    role: t.role ?? '',
    includeWhen: t.includeWhen ?? [],
    rejectRules: t.rejectRules ?? [],
    rejectRulesEdited: t.rejectRulesEdited,
    fabricationEditable: t.fabricationEditable ?? false,
  };
}

/* saves from before step conditions / Fabrication editable existed: keep the built-in values for those */
function deserializeStage(s: SerializedStage, builtIn?: StageTemplate): StageTemplate {
  return { ...s, signoffFields: s.signoffFields, rejectToStage: s.rejectToStage, repeatable: s.repeatable ?? false, role: s.role ?? '',
    includeWhen: s.includeWhen ?? builtIn?.includeWhen,
    rejectRules: s.rejectRulesEdited ? s.rejectRules : builtIn?.rejectRules ?? s.rejectRules,
    fabricationEditable: s.fabricationEditable ?? builtIn?.fabricationEditable ?? false };
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
    _merged[trade] = _merged[trade].map(s => ({ ...s, routingOptions: signoffTypeOptions(s.id) }));
  }
  /* not routing steps: Fabrication is a cross-stage data section, and Prep/Handover are generic
     steps from before this was a Welding-only app (older saves still have them; trades other than
     Welding in older saves are ignored) */
  for (const trade of Object.keys(_merged) as Job['trade'][]) {
    _merged[trade] = _merged[trade].filter(s => !['fabrication', 'prep', 'handover'].includes(s.id));
  }
  return _merged;
}

/* step-answer conditions (any step's own fields) read the live templates */
registerStepTemplates(() => getTemplates());

/* invalidate the merged cache so next read re-loads from localStorage */
function invalidateTemplateCache() { _merged = null; }

/* ── Admin > Routing Settings edits ── */

export function addStageTemplate(trade: Job['trade'], stage: Omit<StageTemplate, 'required'> & { required?: boolean }) {
  const templates = getTemplates();
  const newStage: StageTemplate = {
    ...stage,
    required: stage.required ?? true,
    signoffFields: stage.signoffFields ?? DEFAULT_SIGNOFF_FIELDS,
    rejectToStage: stage.rejectToStage ?? '',
  };
  templates[trade] = [...(templates[trade] ?? []), newStage];
  persistTemplates(templates);
}

export function updateStageTemplate(trade: Job['trade'], stageId: string, patch: Partial<StageTemplate>) {
  const templates = getTemplates();
  const list = templates[trade];
  if (!list) return;
  templates[trade] = list.map(s => s.id === stageId ? { ...s, ...patch } : s);
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
