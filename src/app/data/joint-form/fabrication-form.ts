/* The joint page's Fabrication panel: which fields show, their options, and what's missing */
import { Job } from '../jobs';
import { FABRICATION_FIELDS, FabricationField } from '../workflow';
import { requiresTraceability } from '../mcl-traceability';
import { shopOptions } from '../shops';
import { SHIP_LOCATION_KEYS, shipLocationOptions } from '../ship-locations';
import { jointDesignOptions } from '../joint-designs';

type Fab = Record<string, string>;

/* MIC 1 / MIC 2 only apply when that joint member's MCL (mcl1 / mcl2) requires traceability */
export function micApplies(job: Job | undefined, key: 'id1' | 'id2'): boolean {
  if (!job) return false;
  return requiresTraceability(key === 'id1' ? job.mcl1 : job.mcl2);
}

/* the fields shown, with their options filled in */
export function fabricationFieldsShown(job: Job | undefined, fab: Fab): FabricationField[] {
  return FABRICATION_FIELDS
    .filter(f => !f.showIf || fab[f.showIf.key] === f.showIf.equals)
    .filter(f => (f.key === 'id1' || f.key === 'id2') ? micApplies(job, f.key) : true)
    .map(f => withFabricationOptions(f, job, fab));
}

/* Location, Ship Location and Revised Joint Design get their options at runtime (admin lists); the
   static field definition has none. Anything that shows a fabrication value's label must go through this. */
export function withFabricationOptions(f: FabricationField, job: Job | undefined, fab: Fab): FabricationField {
  if (f.key === 'location') return { ...f, options: shopOptions() };
  if (SHIP_LOCATION_KEYS.includes(f.key) && job) {
    const options = shipLocationOptions(f.key, job.hull, fab);
    /* a saved value that's no longer on the list still shows, rather than a blank box */
    const saved = fab[f.key] ?? '';
    const all = saved && !options.some(o => o.value === saved) ? [{ label: saved, value: saved }, ...options] : options;
    /* an empty list either waits on the field before it (Frame/P-S-CL/Usage) or has nothing set up for this hull */
    const waiting = (f.key === 'frame' && !fab['deck']) || (f.key === 'pscl' && !(fab['deck'] && fab['frame']))
      || (f.key === 'usage' && !(fab['deck'] && fab['frame'] && fab['pscl']));
    return { ...f, options: all, placeholder: waiting ? f.placeholder : 'None set up in Admin' };
  }
  if (f.key === 'revisedJointDesign') return { ...f, options: [{ label: '', value: '' }, ...jointDesignOptions()] };
  return f;
}

/* a fabrication value as shown: a select's value resolved to its label */
export function fabricationDisplayValue(key: string, job: Job | undefined, fab: Fab): string {
  const val = fab[key] ?? '';
  if (!val) return '';
  const field = FABRICATION_FIELDS.find(f => f.key === key);
  const options = field ? withFabricationOptions(field, job, fab).options : undefined;
  if (field?.type === 'select' && options) return options.find(o => o.value === val)?.label ?? val;
  return val;
}

/* live errors on the Fabrication panel, keyed by field */
export function fabricationErrors(job: Job | undefined, fab: Fab): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of FABRICATION_FIELDS) {
    if (f.requiredWhen) {
      const triggerVal = fab[f.requiredWhen.key] ?? '';
      if (f.requiredWhen.notEmpty && triggerVal.trim() && !(fab[f.key] ?? '').trim()) {
        errors[f.key] = `${f.label} is required when ${FABRICATION_FIELDS.find(ff => ff.key === f.requiredWhen!.key)?.label ?? f.requiredWhen.key} is set`;
      }
    }
    if (f.showIf && f.required) {
      if (fab[f.showIf.key] === f.showIf.equals && !(fab[f.key] ?? '').trim()) {
        errors[f.key] = `${f.label} is required`;
      }
    }
    /* plain required fields (no showIf); MIC 1/2 only when they apply */
    if (f.required && !f.showIf) {
      if ((f.key === 'id1' || f.key === 'id2') && !micApplies(job, f.key)) continue;
      if (!(fab[f.key] ?? '').trim()) {
        errors[f.key] = `${f.label} is required`;
      }
    }
  }
  return errors;
}

/* the red * on a conditionally required field */
export function fabricationFieldRequired(f: FabricationField, fab: Fab): boolean {
  if (f.showIf && f.required) return fab[f.showIf.key] === f.showIf.equals;
  if (!f.requiredWhen) return false;
  const val = (fab[f.requiredWhen.key] ?? '').trim();
  return f.requiredWhen.notEmpty ? val.length > 0 : val.length === 0;
}

/* fabrication values that must be present before Fit can be signed */
const FIT_REQUIRED_FABRICATION: Record<string, string> = {
  location: 'Location', id1: 'MIC 1', id2: 'MIC 2', drawingRev: 'Drawing Rev', actualThickness: 'Actual Thickness',
};

/* labels of the Fit-required fabrication values still blank */
export function missingFitFabrication(job: Job | undefined, fab: Fab): string[] {
  return Object.entries(FIT_REQUIRED_FABRICATION)
    .filter(([k]) => (k !== 'id1' && k !== 'id2') || micApplies(job, k))
    .filter(([k]) => !fab[k]?.trim())
    .map(([, label]) => label);
}
