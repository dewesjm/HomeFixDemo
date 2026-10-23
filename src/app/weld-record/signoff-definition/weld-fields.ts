/* The fields every welding step (Tack, Root, Layer, Final Weld) records, which are typed under an
   engineering override, and how actuals follow their requirements (fill rules in field-catalog.ts
   set Weld Process, PH/IP and NC actuals; field-locks.ts decides what's locked) */


/* Override Requirements fields are kept in the catalog and welding Type forms.
   SWITCHED OFF: hidden and not filled in from the WTN while SHOW_WELD_OVERRIDES is false, since how an
   override applies is unsettled (likely it replaces the requirement shown). This could be turned back
   on one day, so the code is kept working rather than removed, to avoid a rewrite. */
export const SHOW_WELD_OVERRIDES = false;
/* Foreman Override button on welding steps. SWITCHED OFF: blank values come in as an engineering
   override instead. This could be turned back on one day, so the code is kept working rather than
   removed, to avoid a rewrite. */
export const FOREMAN_OVERRIDE_ENABLED = false;
export const FILLER_KEYS = new Set(['fillerMetalType', 'fillerMetalSize', 'fillerMetalMic']);
/* typed by hand on an engineeringEntry step. Weld Process too, since there's no WTN on file for it to follow */
export const ENGINEERING_ENTRY_KEYS = new Set([
  'weldProcedure', 'wtn', 'weldProcess', 'phMin', 'phMax', 'ipMin', 'ipMax', 'fillerMetalType', 'fillerMetalSize',
]);

/* each actual and the requirement it follows: NC there sets the actual to NC and locks it (the
   actual's fill rule, field-catalog.ts) */
export const ACTUAL_REQUIREMENT: Record<string, string> = {
  actualPhMin: 'phMin', actualPhMax: 'phMax', actualIpMin: 'ipMin', actualIpMax: 'ipMax',
};

/* the lowest reading can't be above the highest: an error for the Max field, or '' */
export const ACTUAL_MIN_MAX: { min: string; max: string; minLabel: string; maxLabel: string }[] = [
  { min: 'actualPhMin', max: 'actualPhMax', minLabel: 'Actual PH Min', maxLabel: 'Actual PH Max' },
  { min: 'actualIpMin', max: 'actualIpMax', minLabel: 'Actual IP Min', maxLabel: 'Actual IP Max' },
];
export function actualOrderError(inputs: Record<string, string>, pair: typeof ACTUAL_MIN_MAX[number]): string {
  const lo = Number(inputs[pair.min]), hi = Number(inputs[pair.max]);
  if (!inputs[pair.min] || !inputs[pair.max] || isNaN(lo) || isNaN(hi)) return '';
  return lo > hi ? `${pair.maxLabel} is below ${pair.minLabel}` : '';
}
