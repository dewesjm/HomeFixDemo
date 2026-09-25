/* Deviations: out-of-spec values a person can accept at sign-off instead of being blocked.
   Accepted kinds (user's decisions, 2026-09-25): Actual PH/IP out of range, a failed Qualification
   Check, a Filler Metal Type/Size the WPS doesn't allow, and a GWP not qualified for the base
   metals (the last two pickable only after a Foreman Override). Everything else stays a hard stop.
   Foreman Override text is typed in ('reported' items). DeviationService records them. */
import { WorkflowStage, DeviationItem, ACTUAL_REQUIREMENT, isFieldLocked, labelFor, isInspectionStage } from './workflow';
import {
  getProcedureByGwpWtn, fillerMetalTypeOptionsForProcedure, fillerMetalSizeOptionsForProcedure,
  FILLER_METAL_TYPE_OPTIONS, FILLER_METAL_SIZE_OPTIONS, gwpOptionsForMaterials
} from './procedures';

export interface BaseMetals { type1: string; type2: string }

const FILLER_KEYS = ['fillerMetalType', 'fillerMetalSize'] as const;

function limit(raw: string | undefined): number {
  return raw && raw !== 'NC' ? Number(raw) : NaN;
}

/* true when an Actual PH/IP value falls outside its requirement pair (NC = no limit) */
export function isActualOutOfRange(stage: WorkflowStage, key: string): boolean {
  if (!(key in ACTUAL_REQUIREMENT)) return false;
  const f = stage.fields.find(ff => ff.key === key);
  const raw = stage.inputs[key];
  if (!f || !raw || raw === 'NC') return false;
  const num = Number(raw);
  const lo = limit(f.minField ? stage.inputs[f.minField] : undefined);
  const hi = limit(f.maxField ? stage.inputs[f.maxField] : undefined);
  return (!isNaN(lo) && num < lo) || (!isNaN(hi) && num > hi);
}

function rangeText(stage: WorkflowStage, key: string): string {
  const f = stage.fields.find(ff => ff.key === key);
  const lo = limit(f?.minField ? stage.inputs[f.minField] : undefined);
  const hi = limit(f?.maxField ? stage.inputs[f.maxField] : undefined);
  if (!isNaN(lo) && !isNaN(hi)) return `${lo} to ${hi}`;
  if (!isNaN(lo)) return `at least ${lo}`;
  return `at most ${hi}`;
}

/* every acceptable deviation on this stage right now; visibleKeys = the fields the person can see.
   baseMetals is the joint's Material Type 1/2; without it the GWP check is skipped. conditionQuals =
   the quals the joint's conditions require (qual-conditions.ts), checked even with no WPS picked. */
export function detectDeviations(stage: WorkflowStage, visibleKeys: ReadonlySet<string>, heldQuals: string[], baseMetals?: BaseMetals, conditionQuals: string[] = []): DeviationItem[] {
  const items: DeviationItem[] = [];
  for (const key of Object.keys(ACTUAL_REQUIREMENT)) {
    if (visibleKeys.has(key) && isActualOutOfRange(stage, key)) {
      items.push({ kind: 'out-of-range', label: labelFor(stage, key), entered: stage.inputs[key], required: rangeText(stage, key) });
    }
  }
  const gwp = stage.inputs['weldProcedure'] ?? '';
  const gwpField = stage.fields.find(ff => ff.key === 'weldProcedure');
  if (gwp && gwpField && baseMetals && visibleKeys.has('weldProcedure')) {
    const allowed = gwpOptionsForMaterials(baseMetals.type1, baseMetals.type2);
    if (!allowed.some(o => o.value === gwp)) {
      items.push({
        kind: 'off-list', label: gwpField.label, entered: gwp,
        required: allowed.map(o => o.value).join(', ') || 'None qualified for these base metals',
      });
    }
  }
  const proc = getProcedureByGwpWtn(stage.inputs['weldProcedure'] ?? '', stage.inputs['wtn'] ?? '');
  /* welding steps check when the field is showing; inspection steps have no field, just the check */
  const checksQuals = stage.fields.some(f => f.key === 'qualificationCheck') ? visibleKeys.has('qualificationCheck') : isInspectionStage(stage);
  if (checksQuals) {
    const required = [...new Set([...conditionQuals, ...(proc?.qualificationsRequired ?? [])])];
    const missing = required.filter(q => !heldQuals.includes(q));
    if (missing.length) {
      items.push({ kind: 'qual', label: 'Qualification Check', entered: `Missing ${missing.join(', ')}`, required: required.join(', ') });
    }
  }
  if (!proc) return items;
  for (const key of FILLER_KEYS) {
    const value = stage.inputs[key] ?? '';
    const f = stage.fields.find(ff => ff.key === key);
    if (!value || !f || !visibleKeys.has(key) || isFieldLocked(stage, f)) continue;
    const allowed = key === 'fillerMetalType' ? fillerMetalTypeOptionsForProcedure(proc) : fillerMetalSizeOptionsForProcedure(proc);
    if (allowed.some(o => o.value === value)) continue;
    const all = key === 'fillerMetalType' ? FILLER_METAL_TYPE_OPTIONS : FILLER_METAL_SIZE_OPTIONS;
    items.push({
      kind: 'off-list', label: f.label,
      entered: all.find(o => o.value === value)?.label ?? value,
      required: allowed.map(o => o.label).join(', ') || 'None listed on the WPS',
    });
  }
  return items;
}
