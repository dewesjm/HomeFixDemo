/* Qual conditions (Admin > Qualifications). Two kinds of row:
   - "when <field> is <value>, require <group>": the group is an AND/OR group of quals
     (qual-requirements.ts). Joint Details fields are checked on every step with a Qualification
     Check as soon as it opens; sign-off fields are read from the step being checked, so they apply
     once they're filled in.
   - "when User is <person>, holds <quals>": the quals that person holds. There's no login, so the
     check always runs as SELF, the testing entry: give SELF quals to test with. Named people are
     how it would look with real users.
   This is the only place quals are required or held. */
import { computed, signal } from '@angular/core';
import { STORAGE } from './storage-keys';
import { Job } from './jobs';
import { PEOPLE } from './people';
import { isTitaniumJoint } from './material-classification';
import { STEP_CONDITION_FIELDS, tradeSteps } from './step-conditions';
import { QualGroup, cloneGroup, qualsIn, requirementText } from './qual-requirements';

export interface QualCondition {
  field: string;   /* conditionFields() key */
  value: string;
  require: QualGroup;   /* on a User row: the quals held (always an 'all' list) */
}

/* the step being checked; its fields are blank until filled in */
export interface ConditionStep {
  id?: string;
  inputs?: Record<string, string>;
  signoffInputs?: Record<string, string>;
  inspectionType?: string;
}

interface ConditionSubject { job: Job; step: ConditionStep; }

export interface ConditionOption { value: string; label: string; }

export interface ConditionField {
  key: string;
  label: string;
  group: 'Joint Details' | 'Sign-off' | 'User';
  /* none = the value is typed (compared whole, any case) */
  options: () => ConditionOption[];
  get: (s: ConditionSubject) => string;
}

export const USER_FIELD = 'user';
export const SELF = 'SELF';
/* sign-off field keys: 'step:<field key>' ('step:inspectionType' = the step's Type, 'step:id' = the step) */
const STEP_PREFIX = 'step:';
const TRADE = 'Welding';

const plain = (values: string[]): ConditionOption[] => values.map(v => ({ value: v, label: v }));

/* Admin > Routing's Joint Details fields (step-conditions.ts), plus Titanium */
function jointFields(): ConditionField[] {
  const fields = STEP_CONDITION_FIELDS.filter(f => !f.stepAnswer).map((f): ConditionField => ({
    key: f.key, label: f.label, group: 'Joint Details', options: () => plain(f.values), get: s => f.get(s.job, []),
  }));
  fields.push({ key: 'titanium', label: 'Titanium', group: 'Joint Details', options: () => plain(['Yes', 'No']),
    get: s => isTitaniumJoint({ materialType1: s.job.materialType1 ?? '', materialType2: s.job.materialType2 ?? '' }) ? 'Yes' : 'No' });
  return fields;
}

/* a repeated step (e.g. a second Layer, id 'root-layer-r2') counts as its template */
const stepIdOf = (id: string) => id.replace(/-r\d+$/, '');

/* the step itself, then every field any step has (Type, fields, sign-off fields), once per key with
   the first label and the options of every step that has it */
function signoffFields(): ConditionField[] {
  const steps = tradeSteps(TRADE);
  const out: ConditionField[] = [{
    key: `${STEP_PREFIX}id`, label: 'Step', group: 'Sign-off',
    options: () => steps.map(t => ({ value: t.id, label: t.label })),
    get: s => s.step.id ? stepIdOf(s.step.id) : '',
  }];
  const byKey = new Map<string, { label: string; checkbox: boolean; options: Map<string, string> }>();
  const add = (key: string, label: string, type: string, opts: ConditionOption[] = []) => {
    const e = byKey.get(key) ?? { label, checkbox: type === 'checkbox', options: new Map<string, string>() };
    byKey.set(key, e);
    for (const o of opts) if (!e.options.has(o.value)) e.options.set(o.value, o.label);
  };
  for (const t of steps) {
    if (t.routingOptions?.length) add('inspectionType', 'Type', 'select', t.routingOptions);
    for (const f of [...t.fields, ...(t.signoffFields ?? [])]) add(f.key, f.label, f.type, f.options);
  }
  for (const [key, e] of byKey) {
    out.push({
      key: STEP_PREFIX + key, label: e.label, group: 'Sign-off',
      options: () => e.checkbox ? plain(['Yes', 'No']) : [...e.options].map(([value, label]) => ({ value, label })),
      get: s => {
        if (key === 'inspectionType') return s.step.inspectionType ?? '';
        const v = s.step.inputs?.[key] ?? s.step.signoffInputs?.[key] ?? '';
        return e.checkbox ? (v === 'yes' ? 'Yes' : 'No') : v;
      },
    });
  }
  return out;
}

const userField: ConditionField = {
  key: USER_FIELD, label: 'User', group: 'User',
  options: () => plain([SELF, ...new Set(PEOPLE.map(p => `${p.first} ${p.last}`))]),
  get: () => SELF,
};

/* rebuilt whenever the (admin-editable) step templates change, since sign-off fields come from them */
let cache: { steps: unknown; fields: ConditionField[] } | null = null;
export function conditionFields(): ConditionField[] {
  const steps = tradeSteps(TRADE);
  if (cache?.steps !== steps) cache = { steps, fields: [...jointFields(), ...signoffFields(), userField] };
  return cache.fields;
}

export function conditionField(key: string): ConditionField | undefined {
  return conditionFields().find(f => f.key === key);
}

/* SELF holds the seed quals except CNTRLMTL2, so every seed requirement passes (controlled material
   through the OR); one requirement per kind of check: joint flags, the step's Type, the base material */
function defaultConditions(): QualCondition[] {
  return [
    { field: USER_FIELD, value: SELF, require: { op: 'all', items: ['CNTRLMTL1', 'SSWELD1', 'VTINSP1', 'TIWELD1'] } },
    { field: 'controlledMaterial', value: 'Yes', require: { op: 'any', items: ['CNTRLMTL1', 'CNTRLMTL2'] } },
    { field: 'ss', value: 'Yes', require: { op: 'all', items: ['SSWELD1'] } },
    { field: `${STEP_PREFIX}inspectionType`, value: 'vt', require: { op: 'all', items: ['VTINSP1'] } },
    { field: 'titanium', value: 'Yes', require: { op: 'all', items: ['TIWELD1'] } },
  ];
}

function load(): QualCondition[] {
  try {
    const raw = localStorage.getItem(STORAGE.qualConditions);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return defaultConditions();
}

export const qualConditions = signal<QualCondition[]>(load());

export function setQualConditions(conditions: QualCondition[]) {
  qualConditions.set(conditions);
  try { localStorage.setItem(STORAGE.qualConditions, JSON.stringify(conditions)); } catch { /* ignore */ }
}

/* every qual the User rows give this person */
export function heldBy(user: string, conditions: QualCondition[] = qualConditions()): string[] {
  return qualsIn({ op: 'all', items: conditions.filter(c => c.field === USER_FIELD && c.value === user).map(c => c.require) });
}

/* the quals the Qualification Check compares against: SELF's, since there's no login */
export const heldQuals = computed(() => heldBy(SELF));

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/* the requirements of every condition the joint and step match, in table order (User rows aren't requirements) */
export function conditionRequirements(job: Job | undefined | null, step: ConditionStep = {}): QualGroup[] {
  if (!job) return [];
  const subject: ConditionSubject = { job, step };
  const fields = new Map(conditionFields().map(f => [f.key, f]));
  return qualConditions()
    .filter(c => {
      if (c.field === USER_FIELD) return false;
      const v = fields.get(c.field)?.get(subject);
      return !!v && !!c.value && same(v, c.value);
    })
    .map(c => cloneGroup(c.require));
}

/* the requirement of every WTN condition for this WTN, joined by AND; '' when there's none */
export function wtnRequirementText(wtn: string): string {
  const groups = qualConditions().filter(c => c.field === `${STEP_PREFIX}wtn` && same(c.value, wtn) && c.require.items.length);
  if (groups.length === 1) return requirementText(groups[0].require);
  return groups.map(c => requirementText(c.require, true)).join(' AND ');
}
