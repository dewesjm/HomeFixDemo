/* What a procedure offers a welding step, and how it reads: the GWP / WTN / filler droplists, the
   values a step fills from its WTN, and the plain-text descriptions. The procedure rows themselves
   are data/procedures.ts. */
import {
  Procedure, procedures, getProcedureByGwpWtn, FILLER_METAL_TYPE_OPTIONS, FILLER_METAL_SIZE_OPTIONS,
} from '../data/procedures';

/* true when a procedure has any preheat/interpass override values set -- shared by the PDF
   (procedure-pdf.ts) and Weld Record's stage fields (weld-record/signoff/stage-form.ts) */
export function hasOverride(p: Procedure): boolean {
  return !!(p.overridePhMin || p.overridePhMax || p.overrideIpMin || p.overrideIpMax || p.overrideNote);
}

/* ── GWP/WTN cascade, the source of Weld Record's GWP/WTN step fields (weld-record/signoff/
   stage-form.ts). A GWP groups several Procedure rows, one per WTN. ── */
/* Plain-text description, e.g. "Semiautomatic GTAW of 02-CS and 13-SS316 using MIL-70S-6 for Surface
   Structure". Blank parts are left out. The GWP version drops the filler, which varies per WTN. */
export function procedureDescription(p: Procedure | undefined, includeFiller = true): string {
  if (!p) return '';
  const metals = [p.baseMetal1Type, p.baseMetal2Type].filter(Boolean).join(' and ');
  return [
    [p.processType, p.weldProcess].filter(Boolean).join(' '),
    metals && `of ${metals}`,
    includeFiller && p.fillerMetalClassification && `using ${p.fillerMetalClassification}`,
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
   base metal 1/2 (fixed per GWP, see materialCombos() above) must match the job's Material Type
   1/2 (Job.materialType1/materialType2, jobs.ts). */
export function gwpOptionsForMaterials(materialType1: string, materialType2: string): { label: string; value: string; detail: string }[] {
  if (!materialType1 || !materialType2) return [];
  const distinct = Array.from(new Set(
    procedures()
      .filter(p => p.baseMetal1Type === materialType1 && p.baseMetal2Type === materialType2)
      .map(p => p.gwp)
  )).sort();
  return distinct.map(g => ({ label: g, value: g, detail: gwpDescription(g) }));
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
type WtnFillKey = typeof WTN_FILL_FIELDS[number]['key'];

/* one of those values for a GWP+WTN; '' when the pair matches no WPS */
export function wtnFillValue(gwp: string, wtn: string, key: string): string {
  const proc = getProcedureByGwpWtn(gwp, wtn);
  if (!proc || !WTN_FILL_FIELDS.some(f => f.key === key)) return '';
  return key === 'weldProcess' ? proc.weldProcess.toLowerCase() : proc[key as Exclude<WtnFillKey, 'weldProcess'>];
}

/* Filler Metal Type/Size cascade -- same shape as the GWP/WTN cascade above, but keyed off the
   Procedure a GWP+WTN pair already resolved to (getProcedureByGwpWtn), not off GWP/WTN directly.
   On the weld record the external-system mock (weld-record/weld-assignment/weld-assignment-mock.ts) picks one of these; a
   Foreman Override opens the full lists. */
export function fillerMetalTypeOptionsForProcedure(p: Procedure | undefined): { label: string; value: string }[] {
  if (!p) return [];
  return FILLER_METAL_TYPE_OPTIONS.filter(o => p.fillerMetalTypes.includes(o.value));
}

export function fillerMetalSizeOptionsForProcedure(p: Procedure | undefined): { label: string; value: string }[] {
  if (!p) return [];
  return FILLER_METAL_SIZE_OPTIONS.filter(o => p.fillerMetalSizes.includes(o.value));
}
