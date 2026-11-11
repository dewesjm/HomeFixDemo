/* Procedure values: the one way other systems (Weld Record, Weld Planning) read Weld Engineering's
   procedures. Callers pass GWP / WTN codes and get values back; they never hold a Procedure or read
   its fields, so how a procedure stores a value can change here without touching them. Covers the
   GWP / WTN / filler droplists, the values a step fills from its WTN, override values and the
   plain-text descriptions. The procedure rows themselves are data/procedures.ts.
   The values read here are the locked section fields (fixed keys, procedure-sections.ts); a value in
   a section the procedure hasn't ticked reads as blank. */
import {
  Procedure, procedures, getProcedureByGwpWtn, FILLER_METAL_TYPE_OPTIONS, FILLER_METAL_SIZE_OPTIONS,
} from '../../data/procedures';
import type { QualGroup } from '../../weld-record/qualifications-logic/qual-requirements';
import { procedureSections } from './procedure-sections';
import { sectionValue, textValue, listValue, isOverride, isQuals, isBlank } from './procedure-field-values';

const text = (p: Procedure, key: string) => textValue(p, key, procedureSections());
const list = (p: Procedure, key: string) => listValue(p, key, procedureSections());

function overrideOf(p: Procedure) {
  const v = sectionValue(p, 'override', procedureSections());
  return isOverride(v) && !isBlank(v) ? v : undefined;
}

/* true when a GWP+WTN pair matches a WPS */
export function hasProcedure(gwp: string, wtn: string): boolean {
  return !!getProcedureByGwpWtn(gwp, wtn);
}

/* a WPS's preheat/interpass override values, keyed by Weld Record's override field keys;
   undefined when the pair matches no WPS or that WPS has no override */
export interface OverrideValues {
  overridePhMin: string; overridePhMax: string; overrideIpMin: string; overrideIpMax: string; overrideNote: string;
}
export function procedureOverride(gwp: string, wtn: string): OverrideValues | undefined {
  const p = getProcedureByGwpWtn(gwp, wtn);
  const o = p && overrideOf(p);
  if (!o) return undefined;
  return { overridePhMin: o.phMin, overridePhMax: o.phMax, overrideIpMin: o.ipMin, overrideIpMax: o.ipMax, overrideNote: o.note };
}

/* ── GWP/WTN cascade, the source of Weld Record's GWP/WTN step fields (weld-record/
   signoff-validation-logic/stage-form.ts). A GWP groups several Procedure rows, one per WTN. ── */
/* Plain-text description, e.g. "Semiautomatic GTAW of 02-CS and 13-SS316 using MIL-70S-6 for Surface
   Structure". Blank parts are left out. The GWP version drops the filler, which varies per WTN. */
export function procedureDescription(p: Procedure | undefined, includeFiller = true): string {
  if (!p) return '';
  const metals = [text(p, 'baseMetal1Type'), text(p, 'baseMetal2Type')].filter(Boolean).join(' and ');
  const filler = text(p, 'fillerMetalClassification');
  return [
    [p.processType, p.weldProcess].filter(Boolean).join(' '),
    metals && `of ${metals}`,
    includeFiller && filler && `using ${filler}`,
    p.application && `for ${p.application}`,
  ].filter(Boolean).join(' ');
}

/* a GWP's description comes from its first WPS row (seeded rows share process and application) */
export function gwpDescription(gwp: string): string {
  return procedureDescription(procedures().find(p => p.gwp === gwp), false);
}

export function wtnDescription(gwp: string, wtn: string): string {
  return procedureDescription(getProcedureByGwpWtn(gwp, wtn));
}

/* GWP droplist filtered to whichever GWPs are qualified for a job's base metal pair -- a GWP's
   base metal 1/2 (fixed per GWP, see materialCombos() in data/procedures.ts) must match the job's Material Type
   1/2 (Job.materialType1/materialType2, jobs.ts). */
export function gwpOptionsForMaterials(materialType1: string, materialType2: string): { label: string; value: string; detail: string }[] {
  if (!materialType1 || !materialType2) return [];
  const distinct = Array.from(new Set(
    procedures()
      .filter(p => text(p, 'baseMetal1Type') === materialType1 && text(p, 'baseMetal2Type') === materialType2)
      .map(p => p.gwp)
  )).sort();
  return distinct.map(g => ({ label: g, value: g, detail: gwpDescription(g) }));
}

/* What a GWP stands for, for Weld Planning's search. Process, process type and base metals are the
   same across a GWP's WPS rows (first row); filler varies per WTN, so it's every filler any row allows.
   undefined when no WPS has this GWP. */
export interface GwpDetails {
  weldProcess: string;
  processType: string;
  baseMetal1Type: string;
  baseMetal2Type: string;
  fillerMetalTypes: string[];
}
export function gwpDetails(gwp: string): GwpDetails | undefined {
  const rows = gwp ? procedures().filter(p => p.gwp === gwp) : [];
  if (!rows.length) return undefined;
  const { weldProcess, processType } = rows[0];
  const fillerMetalTypes = [...new Set(rows.flatMap(p => list(p, 'fillerMetalTypes')))].sort();
  return {
    weldProcess, processType, baseMetal1Type: text(rows[0], 'baseMetal1Type'), baseMetal2Type: text(rows[0], 'baseMetal2Type'),
    fillerMetalTypes,
  };
}

/* every GWP regardless of base metals -- for a Foreman Override */
export function allGwpOptions(): { label: string; value: string; detail: string }[] {
  const distinct = Array.from(new Set(procedures().map(p => p.gwp))).sort();
  return distinct.map(g => ({ label: g, value: g, detail: gwpDescription(g) }));
}

export function wtnOptionsForGwp(gwp: string): { label: string; value: string; detail: string }[] {
  if (!gwp) return [];
  return procedures()
    .filter(p => p.gwp === gwp)
    .map(p => ({ label: p.wtn, value: p.wtn, detail: procedureDescription(p) }));
}


/* the WPS values a welding step's fields can be filled from (a "Filled from the WTN" rule) */
export const WTN_FILL_FIELDS = [
  { key: 'weldProcess', label: 'Weld Process' },
  { key: 'phMin', label: 'PH Min' }, { key: 'phMax', label: 'PH Max' },
  { key: 'ipMin', label: 'IP Min' }, { key: 'ipMax', label: 'IP Max' },
] as const;

/* one of those values for a GWP+WTN; '' when the pair matches no WPS */
export function wtnFillValue(gwp: string, wtn: string, key: string): string {
  const proc = getProcedureByGwpWtn(gwp, wtn);
  if (!proc || !WTN_FILL_FIELDS.some(f => f.key === key)) return '';
  return key === 'weldProcess' ? proc.weldProcess.toLowerCase() : text(proc, key);
}

/* the quals a welder needs to weld to the WPS a GWP+WTN pair matches (5. Welder Qualifications);
   an empty group (requires nothing) when it matches none */
export function procedureRequiredQuals(gwp: string, wtn: string): QualGroup {
  const p = getProcedureByGwpWtn(gwp, wtn);
  const v = p && sectionValue(p, 'requiredQuals', procedureSections());
  return isQuals(v) ? v : { op: 'all', items: [] };
}

/* Filler Metal Type/Size cascade: the options the WPS a GWP+WTN pair matches allows, empty when it
   matches none. On the weld record the external-system mock (weld-record/weld-assignment-logic/
   weld-assignment-mock.ts) picks one of these; a Foreman Override opens the full lists. */
export function fillerMetalTypeOptions(gwp: string, wtn: string): { label: string; value: string }[] {
  const p = getProcedureByGwpWtn(gwp, wtn);
  return p ? FILLER_METAL_TYPE_OPTIONS.filter(o => list(p, 'fillerMetalTypes').includes(o.value)) : [];
}

export function fillerMetalSizeOptions(gwp: string, wtn: string): { label: string; value: string }[] {
  const p = getProcedureByGwpWtn(gwp, wtn);
  return p ? FILLER_METAL_SIZE_OPTIONS.filter(o => list(p, 'fillerMetalSizes').includes(o.value)) : [];
}
