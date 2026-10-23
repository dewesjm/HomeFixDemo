/* Admin > Routing Signoff Types: every Type a step can be signed as. A Type is added here first, then
   offered on steps (Admin > Signoff Type Availability) and given its fields (Admin > Signoff Type
   Definition, one definition per Type, matched by its value). Stored in localStorage. */
import { STORAGE } from '../../data/storage-keys';

export interface RoutingSignoffType {
  label: string;
  /* the stored value: what a step's signoffType holds and what its definition is keyed by */
  value: string;
  /* signing with this Type records the signoff, leaves the routing where it is and blanks the step
     for the next signoff. Unset = signing completes the step. */
  repeatable?: boolean;
  /* the routing step this Type signs when it's picked on an earlier step (Layer signed as Final Weld
     signs Final Weld, type-routing.ts); unset = the step it's picked on */
  signsStep?: string;
}

export const WELD_BUILDUP_TYPE = 'weld-buildup';

const type = (label: string, value: string, more: Partial<RoutingSignoffType> = {}): RoutingSignoffType => ({ label, value, ...more });

/* the Types named after a step use that step's id as their value */
const SEED_TYPES: RoutingSignoffType[] = [
  type('Pre-Fit', 'pre-fit'),
  type('Fit', 'fit'),
  type('Weld Build-Up', WELD_BUILDUP_TYPE, { repeatable: true }),
  type('Tack', 'tack'),
  type('Deferred Tack', 'deferred-tack'),
  type('Fit-Up Insp', 'fitup-insp'),
  type('Fit-Up Release', 'fitup-release'),
  type('Root', 'root'),
  type('VT', 'vt'),
  type('5X', '5x'),
  type('MT', 'mt'),
  type('PT', 'pt'),
  type('UT', 'ut'),
  type('RT', 'rt'),
  type('Interim Layer', 'interim', { repeatable: true }),
  type('Final Weld', 'final-weld', { signsStep: 'final-weld' }),
  type('Repair', 'repair'),
  type('O63 Records Review', 'review-o63'),
  type('O04 Records Review', 'review-o04'),
  type('Sold', 'sold'),
];

/* bumped on every save, so getTemplates() knows its cached options are out of date */
let version = 0;
export const routingSignoffTypesVersion = () => version;

export function getRoutingSignoffTypes(): RoutingSignoffType[] {
  try {
    const raw = localStorage.getItem(STORAGE.routingSignoffTypes);
    return raw ? JSON.parse(raw) : SEED_TYPES;
  } catch { return SEED_TYPES; }
}

/* an added Type's stored value is made from its name (e.g. "Weld Build-Up" -> "weld-build-up") */
export function setRoutingSignoffTypes(types: RoutingSignoffType[]) {
  const filled = types.map(t => ({ ...t, value: t.value || valueFromName(t.label) }));
  localStorage.setItem(STORAGE.routingSignoffTypes, JSON.stringify(filled));
  version++;
}

function valueFromName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function routingSignoffType(value: string): RoutingSignoffType | undefined {
  return getRoutingSignoffTypes().find(t => t.value === value);
}

/* a Type's name, or its value when the Type has been removed */
export function typeLabel(value: string): string {
  return routingSignoffType(value)?.label ?? value;
}
