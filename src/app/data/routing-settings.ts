/* Admin > Routing Settings rows: the starting rows (welding-steps.ts) with the saved changes (localStorage)
   applied, and saving them. Checks before a save and the Type options each row offers are in
   weld-record/routing-logic/routing-settings-rules.ts. */
import { STORAGE } from './storage-keys';
import { WELDING_STEPS, DEFAULT_STEP_CONDITIONS, DEFAULT_REJECT_RULES, DEFAULT_THEN_RULES, ADDED_STAGE_TEMPLATES } from './welding-steps';
import { StageTemplate } from '../weld-record/model/stage-template';
import { ConditionRule } from '../weld-record/conditions-logic/joint-conditions';
import { RouteToRule } from '../weld-record/routing-logic/route-to-rules';
import { isFitupInspId } from './welding-step-ids';

/* built-in: Fabrication is editable up to and including Fit-Up Insp (either row), locked after it signs */
function withFabricationEditable(list: StageTemplate[]): StageTemplate[] {
  const fitupAt = list.reduce((at, s, i) => isFitupInspId(s.id) ? i : at, -1);
  return list.map((s, i) => ({ ...s, fabricationEditable: fitupAt < 0 || i <= fitupAt }));
}

/* the built-in routings, with their built-in conditions and reject rules */
const STATIC_TEMPLATES: StageTemplate[] = withFabricationEditable(WELDING_STEPS
  .map(s => DEFAULT_STEP_CONDITIONS[s.id] ? { ...s, includeWhen: DEFAULT_STEP_CONDITIONS[s.id] } : s)
  .map(s => ({ ...s, thenRules: DEFAULT_THEN_RULES[s.id] ?? [] }))
  .map(s => DEFAULT_REJECT_RULES[s.id] ? { ...s, rejectRules: DEFAULT_REJECT_RULES[s.id] } : s)).concat(ADDED_STAGE_TEMPLATES);

/* ── Saved Admin > Routing Settings changes (localStorage) ── */

/* serialized form — required is always a plain boolean (no functions). Fields belong to Type forms and the catalog, not to routing templates. */
interface SerializedStage {
  description?: string;
  classification?: StageTemplate['classification'];
  lifecycle?: StageTemplate['lifecycle'];
  status?: StageTemplate['status'];
  id: string;
  label: string;
  displayName?: string;
  required: boolean;
  rejectToStage: string;
  persona?: string;
  personaRules?: StageTemplate['personaRules'];
  includeWhen?: ConditionRule[];
  rejectRules?: RouteToRule[];
  thenRules?: RouteToRule[];
  rejectRulesEdited?: boolean;
  fabricationEditable?: boolean;
}

function serializeStage(t: StageTemplate): SerializedStage {
  return {
    description: t.description,
    classification: t.classification ?? 'numbered', lifecycle: t.lifecycle ?? 'ordinary', status: t.status ?? 'active',
    id: t.id,
    label: t.label,
    displayName: t.displayName,
    required: typeof t.required === 'function' ? true : t.required,
    rejectToStage: t.rejectToStage ?? '',
    persona: t.persona ?? '',
    personaRules: t.personaRules ?? [],
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
    description: s.description ?? builtIn?.description,
    classification: s.classification ?? builtIn?.classification ?? 'numbered',
    lifecycle: builtIn?.lifecycle ?? 'ordinary', status: s.status ?? 'active',
    id: s.id, label: s.label, displayName: s.displayName, required: s.required, rejectToStage: s.rejectToStage,
    persona: s.persona ?? '', personaRules: s.personaRules ?? builtIn?.personaRules ?? [], includeWhen: s.includeWhen,
    rejectRules: s.rejectRulesEdited ? s.rejectRules : builtIn?.rejectRules ?? s.rejectRules,
    thenRules: s.thenRules ?? builtIn?.thenRules ?? [],
    rejectRulesEdited: s.rejectRulesEdited, fabricationEditable: s.fabricationEditable ?? false,
  };
}

function loadSavedOverrides(): SerializedStage[] | null {
  try {
    const raw = localStorage.getItem(STORAGE.stageTemplates);
    const saved = raw ? JSON.parse(raw) : null;
    return Array.isArray(saved) ? saved : null;
  } catch { return null; }
}

function saveOverrides(overrides: SerializedStage[]) {
  try { localStorage.setItem(STORAGE.stageTemplates, JSON.stringify(overrides)); } catch { /* */ }
}

/* starting rows with the saved changes: saved order wins (Admin > Routing Settings reorders); a built-in
   row the save doesn't have goes in after the built-in row before it */
export function loadRoutingSettings(): StageTemplate[] {
  const statics = STATIC_TEMPLATES;
  const saved = loadSavedOverrides();
  let list = statics;
  if (saved) {
    const staticMap = new Map(statics.map(s => [s.id, s]));
    list = saved.map(s => deserializeStage(s, staticMap.get(s.id)));
    statics.forEach((st, i) => {
      if (list.some(m => m.id === st.id)) return;
      const prev = i > 0 ? list.findIndex(m => m.id === statics[i - 1].id) : -1;
      list.splice(prev + 1, 0, st);
    });
  }
  return list.map(s => ({ ...s, classification: s.classification ?? 'numbered', lifecycle: s.lifecycle ?? 'ordinary', status: s.status ?? 'active' }));
}

export function saveRoutingSettings(rows: StageTemplate[]) {
  saveOverrides(rows.map(serializeStage));
}
