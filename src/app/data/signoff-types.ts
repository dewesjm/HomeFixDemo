/* Admin > Signoff Types: every Type a step can be signed as. A Type is added here first, then
   offered on steps (Admin > Signoff Type to Routing) and given its fields (Admin > Signoff Type
   Forms, one definition per Type, matched by its value). Stored in localStorage, one table per joint
   type: Pipe starts from the seed Types, Structural from Pipe's for the steps it has, plus ET. */
import { signal } from '@angular/core';
import { settingsKey } from './storage-keys';
import type { JointType } from './jobs';
import { FieldCondition } from '../weld-record/conditions-logic/form-conditions';
import { nqcStepId } from './welding-step-ids';

export interface AdditionalSignoff {
  stepId: string;
  type: string;
  when: FieldCondition;
}

/* one rule per routing: the regular Root NDT 5X/VT and its NQC row are named separately */
const ROOT_ADDITIONAL_SIGNOFFS: AdditionalSignoff[] = ['root-ndt-vt5x', nqcStepId('root-ndt-vt5x')].flatMap(stepId => ['5X', 'VT'].map(method => ({
  stepId, type: method.toLowerCase(),
  when: { all: [
    { source: 'field', key: 'performed5x', equals: 'yes' },
    { source: 'jointDetail', key: 'ndtRoot', equals: method },
  ] },
})));

export interface SignoffType {
  label: string;
  /* the stored value: what a step's signoffType holds and what its definition is keyed by */
  value: string;
  /* the routing step this Type signs when it's picked on an earlier step (Layer signed as Final Weld
     signs Final Weld, type-routing.ts); unset = the step it's picked on */
  signsStep?: string;
  alsoSigns?: AdditionalSignoff[];
}

export const WELD_BUILDUP_TYPE = 'weld-buildup';

const type = (label: string, value: string, more: Partial<SignoffType> = {}): SignoffType => ({ label, value, ...more });

/* the Types named after a step use that step's id as their value */
const SEED_TYPES: SignoffType[] = [
  type('Pre-Fit', 'pre-fit'),
  type('Fit', 'fit'),
  type('Weld Build-Up', WELD_BUILDUP_TYPE),
  type('Tack', 'tack'),
  type('Deferred Tack', 'deferred-tack'),
  type('Fit-Up Insp', 'fitup-insp'),
  type('Fit-Up Release', 'fitup-release'),
  type('Root', 'root', { alsoSigns: ROOT_ADDITIONAL_SIGNOFFS }),
  type('VT', 'vt'),
  type('5X', '5x'),
  type('MT', 'mt'),
  type('PT', 'pt'),
  type('UT', 'ut'),
  type('RT', 'rt'),
  type('Interim Layer', 'interim'),
  type('Final Weld', 'final-weld', { signsStep: 'final-weld' }),
  type('Repair', 'repair'),
  type('O63 Records Review', 'review-o63'),
  type('O04 Records Review', 'review-o04'),
  type('Sold', 'sold'),
];

export const seededSignoffTypeIds = SEED_TYPES.map(t => t.value);

/* bumped on every save, so getTemplates() knows its cached options are out of date */
const version = signal(0);
export const signoffTypesVersion = version.asReadonly();

/* Structural's: Pipe's Types for the steps Structural has (no Pre-Fit, Tack, Fit-Up Release or Layer), and ET */
export const ET_TYPE = 'et';
const STRUCTURAL_SEED_TYPES = [
  ...SEED_TYPES.filter(t => !['pre-fit', 'tack', 'deferred-tack', 'fitup-release', 'interim'].includes(t.value)),
  type('ET', ET_TYPE),
];

function seedTypes(jointType: JointType): SignoffType[] {
  return jointType === 'pipe' ? SEED_TYPES : STRUCTURAL_SEED_TYPES;
}

export function getSignoffTypes(jointType: JointType): SignoffType[] {
  version();
  try {
    const raw = localStorage.getItem(settingsKey('signoffTypes', jointType));
    return raw ? JSON.parse(raw) as SignoffType[] : seedTypes(jointType);
  } catch { return seedTypes(jointType); }
}

/* an added Type's stored value is made from its name (e.g. "Weld Build-Up" -> "weld-build-up") */
export function setSignoffTypes(jointType: JointType, types: SignoffType[]) {
  const filled = types.map(t => ({ ...t, value: t.value || valueFromName(t.label) }));
  localStorage.setItem(settingsKey('signoffTypes', jointType), JSON.stringify(filled));
  version.update(value => value + 1);
}

function valueFromName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function findSignoffType(jointType: JointType, value: string): SignoffType | undefined {
  return getSignoffTypes(jointType).find(t => t.value === value);
}

/* a Type's name, or its value when the Type has been removed */
export function typeLabel(jointType: JointType, value: string): string {
  return findSignoffType(jointType, value)?.label ?? value;
}
