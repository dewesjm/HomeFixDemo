import { stepFieldConfigVersion } from '../signoff-definition/step-field-config';
/* Qual conditions (Admin > Qualifications). Two kinds of row:
   - "when <clauses>, signoff type <type>, require <group>": the clauses are an AND/OR group compared
     like Routing Settings (qual-when.ts), the requirement an AND/OR group of quals (qual-requirements.ts).
     Each row applies to exactly one Signoff Type, so a requirement on several Types is one row each,
     and nothing applies until the step's Type is picked. Joint Details fields are checked
     on every step of that Type with a Qualification Check; Fabrication and routing answers
     apply once entered or signed, as in Routing Settings; sign-off fields are read from the step
     being checked, so they apply once they're filled in. Only fields on a form with a Qualification
     Check are offered as sign-off fields; a saved clause on any other one never matches.
   - "when User is <person>, holds <quals>" (a When of just that one clause): the quals that person holds. There's no login, so the
     check always runs as SELF, the testing entry: give SELF quals to test with. Named people are
     how it would look with real users.
   This is the only place quals are required or held. */
import { computed, signal } from '@angular/core';
import { STORAGE } from '../../data/storage-keys';
import { Job } from '../../data/jobs';
import { PEOPLE } from '../../data/people';
import { ConditionCatalogField, JOINT_AND_FABRICATION_FIELDS, StageAnswers, allStepAnswerFields, tradeSteps, routingAnswerFields } from '../catalogs/condition-catalog';
import { QualGroup, cloneGroup, qualsIn, requirementText } from './qual-requirements';
import { WhenClause, WhenGroup, WhenTerm, isWhenGroup, normalizeWhen, whenMatches, whenText } from './qual-when';

export interface QualCondition {
  when: WhenGroup;
  require: QualGroup;   /* on a User row: the quals held (always an 'all' list) */
  type?: string;        /* the Signoff Type value the row applies to. Not used on a User row */
}

/* the step being checked; its fields are blank until filled in */
interface ConditionStep {
  id?: string;
  inputs?: Record<string, string>;
  signoffInputs?: Record<string, string>;
  inspectionType?: string;
}

interface ConditionSubject { job: Job; step: ConditionStep; fab?: Record<string, string>; stages?: StageAnswers[]; }

export interface ConditionOption { value: string; label: string; }

export interface ConditionField {
  key: string;
  label: string;
  group: 'Joint Details' | 'Fabrication' | 'Routing answers' | 'Sign-off' | 'User';
  /* set in its own Signoff Type column, so not offered in the When (old clauses still match) */
  ownColumn?: boolean;
  /* not on any form with a Qualification Check, so not offered and never matched (old clauses still show) */
  unavailable?: boolean;
  /* the values to offer; none = the value is typed (compared whole, any case) */
  options: () => ConditionOption[];
  valueLabel: (value: string) => string;
  get: (s: ConditionSubject) => string;
}

export const USER_FIELD = 'user';
export const SELF = 'SELF';
/* sign-off field keys: 'step:<field key>' ('step:inspectionType' = the step's Type, 'step:id' = the step) */
const STEP_PREFIX = 'step:';
const TYPE_FIELD = `${STEP_PREFIX}inspectionType`;
const TRADE = 'Welding';

const plain = (values: string[]): ConditionOption[] => values.map(v => ({ value: v, label: v }));

/* a condition catalog field as a Qualifications field */
function fromCatalog(f: ConditionCatalogField): ConditionField {
  const valueLabel = (v: string) => f.valueLabel?.(v) ?? v;
  return { key: f.key, label: f.label, group: f.group as ConditionField['group'], valueLabel,
    options: () => f.values.map(value => ({ value, label: valueLabel(value) })), get: s => f.get(s.job, s.stages ?? [], s.fab) };
}

/* the condition catalog: Joint Details, Fabrication and every routing's answers (Fit-Up Insp's Release
   to welding is listed under both its regular and NQC routing, and offered once) */
function catalogFields(): ConditionField[] {
  const answers = new Map(allStepAnswerFields(TRADE).map(f => [f.key, f]));
  return [...JOINT_AND_FABRICATION_FIELDS, ...answers.values()].map(fromCatalog);
}

const QUAL_CHECK_KEY = 'qualificationCheck';
/* not on a Qualification Check form, but Weld Engineering shows each WTN's quals (wtnRequirementText) */
const OFF_FORM_FIELDS = new Set(['wtn']);

/* the step itself, then every field any step has (Type, fields, sign-off fields), once per key with
   the first label. What's offered comes from the steps with a Qualification Check, the only place
   these rows are checked; labels come from every step so old clauses still read properly. */
function signoffFields(): ConditionField[] {
  const steps = tradeSteps(TRADE);
  const hasCheck = (t: typeof steps[number]) => routingAnswerFields(t).some(f => f.key === QUAL_CHECK_KEY);
  const toOptions = (m: Map<string, string>) => [...m].map(([value, label]) => ({ value, label }));
  const out: ConditionField[] = [{
    key: `${STEP_PREFIX}id`, label: 'Routing', group: 'Sign-off',
    options: () => steps.filter(hasCheck).map(t => ({ value: t.id, label: t.label })),
    valueLabel: v => steps.find(t => t.id === v)?.label ?? v,
    get: s => s.step.id ?? '',
  }];
  const byKey = new Map<string, { label: string; checkbox: boolean; onForm: boolean; options: Map<string, string>; offered: Map<string, string> }>();
  const add = (key: string, label: string, type: string, onForm: boolean, opts: ConditionOption[] = []) => {
    const e = byKey.get(key) ?? { label, checkbox: type === 'checkbox', onForm: false, options: new Map<string, string>(), offered: new Map<string, string>() };
    byKey.set(key, e);
    e.onForm ||= onForm;
    for (const o of opts) {
      if (!e.options.has(o.value)) e.options.set(o.value, o.label);
      if (onForm && !e.offered.has(o.value)) e.offered.set(o.value, o.label);
    }
  };
  for (const t of steps) {
    const onForm = hasCheck(t);
    if (t.typeOptions?.length) add('inspectionType', 'Type', 'select', onForm, t.typeOptions);
    for (const f of routingAnswerFields(t)) add(f.key, f.label, f.type, onForm, f.options);
  }
  for (const [key, e] of byKey) {
    out.push({
      key: STEP_PREFIX + key, label: e.label, group: 'Sign-off', ownColumn: key === 'inspectionType',
      unavailable: key === QUAL_CHECK_KEY || (!e.onForm && !OFF_FORM_FIELDS.has(key)),
      options: () => e.checkbox ? plain(['Yes', 'No']) : toOptions(e.onForm ? e.offered : e.options),
      valueLabel: v => e.options.get(v) ?? v,
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
  valueLabel: v => v,
  get: () => SELF,
};

/* rebuilt whenever the (admin-editable) step templates change, since sign-off fields come from them */
let cache: { steps: unknown; version: number; fields: ConditionField[] } | null = null;
export function conditionFields(): ConditionField[] {
  const steps = tradeSteps(TRADE);
  if (cache?.steps !== steps || cache?.version !== stepFieldConfigVersion()) cache = { steps, version: stepFieldConfigVersion(), fields: [...catalogFields(), ...signoffFields(), userField] };
  return cache.fields;
}

export function conditionField(key: string): ConditionField | undefined {
  return conditionFields().find(f => f.key === key);
}

/* the person a User row is for; null on a requirement row */
export function userOf(c: QualCondition): string | null {
  const [t] = c.when.items;
  return c.when.items.length === 1 && !isWhenGroup(t) && t.field === USER_FIELD ? t.values[0] ?? '' : null;
}

/* e.g. "Type is VT", "Weld Color is not Straw or Light Blue", worded like Routing Settings */
function clauseText(c: WhenClause): string {
  const f = conditionField(c.field);
  const label = f?.label ?? c.field;
  if (c.op === 'contains') return `${label} contains "${(c.values[0] ?? '').trim()}"`;
  const values = c.values.length ? c.values.map(v => f?.valueLabel(v) ?? v).join(' or ') : '(nothing)';
  return `${label} ${c.op === 'isNot' ? 'is not' : 'is'} ${values}`;
}

/* an empty When applies to every joint of the row's Type */
export const conditionWhenText = (c: QualCondition) =>
  c.when.items.length ? whenText(c.when, clauseText) : c.type ? 'Always' : '';

/* every Signoff Type a row can apply to */
export const signoffTypeChoices = (): ConditionOption[] => conditionField(TYPE_FIELD)?.options() ?? [];

export const signoffTypeLabel = (value: string) => conditionField(TYPE_FIELD)?.valueLabel(value) ?? value;

export const conditionTypeText = (c: QualCondition) => c.type ? signoffTypeLabel(c.type) : '';

/* what a saved row uses that no form with a Qualification Check has, so that part can never match */
export function notOnCheckForm(c: QualCondition): string[] {
  if (userOf(c) !== null) return [];
  const fields = (g: WhenGroup): string[] => g.items.flatMap(t => {
    if (isWhenGroup(t)) return fields(t);
    const f = conditionField(t.field);
    return !f || f.unavailable ? [f?.label ?? t.field] : [];
  });
  const offered = signoffTypeChoices().some(o => o.value === c.type);
  return [...new Set([...fields(c.when), ...(c.type && !offered ? [signoffTypeLabel(c.type)] : [])])];
}

/* the step's Type must be the row's, and the When must match (an empty one always does) */
function applies(c: QualCondition, valueOf: (field: string) => string | undefined): boolean {
  if (!c.type || c.type !== valueOf(TYPE_FIELD)) return false;
  return !c.when.items.length || whenMatches(c.when, valueOf);
}

const when = (field: string, value: string): WhenGroup => ({ op: 'all', items: [{ field, op: 'is', values: [value] }] });

/* SELF holds the seed quals except CNTRLMTL2, so every seed requirement passes (controlled material
   through the OR); one requirement per kind of check: joint flags, the step's Type, the base material */
function defaultConditions(): QualCondition[] {
  const perType = (w: WhenGroup, require: QualGroup): QualCondition[] => signoffTypeChoices().map(o => ({ when: w, type: o.value, require }));
  return [
    { when: when(USER_FIELD, SELF), require: { op: 'all', items: ['CNTRLMTL1', 'SSWELD1', 'VTINSP1', 'TIWELD1'] } },
    ...perType(when('controlledMaterial', 'Yes'), { op: 'any', items: ['CNTRLMTL1', 'CNTRLMTL2'] }),
    ...perType(when('ss', 'Yes'), { op: 'all', items: ['SSWELD1'] }),
    { when: { op: 'all', items: [] }, type: 'vt', require: { op: 'all', items: ['VTINSP1'] } },
    ...perType(when('material.titanium', 'Yes'), { op: 'all', items: ['TIWELD1'] }),
  ];
}

/* rows saved before a When could have several clauses ({ field, value, require }) */
const PREVIOUS_KEY = 'welding:qual-conditions:v4';
type PreviousCondition = { field: string; value: string; require: QualGroup };

/* rows saved before each row had one Signoff Type: types lists several, and none meant all of them */
type SavedCondition = QualCondition & { types?: string[] };

/* rows saved before the Signoff Type column (no types): a top-level "Type is X" moves into it when
   that means the same thing (one Type clause in an All of, or an Any of only Type clauses); any other
   Type clause stays in the When, where it still matches */
export function liftTypes(c: SavedCondition): SavedCondition {
  if (c.types) return c;
  const isType = (t: WhenTerm): t is WhenClause => !isWhenGroup(t) && t.field === TYPE_FIELD && t.op === 'is';
  const typeItems = c.when.items.filter(isType);
  const rest = c.when.items.filter(t => !isType(t));
  if (userOf(c) === null && typeItems.length) {
    if (c.when.op === 'all' && typeItems.length === 1) return { when: { op: 'all', items: rest }, require: c.require, types: typeItems[0].values };
    if (c.when.op === 'any' && !rest.length) return { when: { op: 'all', items: [] }, require: c.require, types: typeItems.flatMap(t => t.values) };
  }
  return { ...c, types: [] };
}

/* one row per Signoff Type: a row saved with several gets one each, and one saved as all of them gets
   one per offered Type. A row with an empty When and no Types matched nothing, so it's dropped rather
   than starting to apply. */
export function rowsFromSaved(saved: SavedCondition[]): QualCondition[] {
  return saved.flatMap((row): QualCondition[] => {
    if (row.type) return [row];
    const c = liftTypes(row);
    const base = { when: c.when, require: c.require };
    if (userOf(c) !== null) return [base];
    const types = c.types?.length ? c.types : c.when.items.length ? signoffTypeChoices().map(o => o.value) : [];
    return types.map(type => ({ ...base, type }));
  });
}

function load(): QualCondition[] {
  try {
    const raw = localStorage.getItem(STORAGE.qualConditions);
    if (raw) return rowsFromSaved((JSON.parse(raw) as SavedCondition[]).map(c => ({ ...c, when: normalizeWhen(c.when) })));
    const prev = localStorage.getItem(PREVIOUS_KEY);
    if (prev) return rowsFromSaved((JSON.parse(prev) as PreviousCondition[]).map(c => ({ when: normalizeWhen(when(c.field, c.value)), require: c.require })));
  } catch { /* ignore */ }
  return defaultConditions();
}

export const qualConditions = signal<QualCondition[]>(load());

export function setQualConditions(conditions: QualCondition[]) {
  qualConditions.set(conditions);
  try { localStorage.setItem(STORAGE.qualConditions, JSON.stringify(conditions)); } catch { /* ignore */ }
}

/* the requirement rows, counting rows with the same When and Require once, however many Types they're on */
export function distinctRequirements(conditions: QualCondition[] = qualConditions()): QualCondition[] {
  const rows = conditions.filter(c => userOf(c) === null);
  return [...new Map(rows.map(c => [`${conditionWhenText({ ...c, type: 'any' })}|${requirementText(c.require)}`, c])).values()];
}

/* every qual the User rows give this person */
export function heldBy(user: string, conditions: QualCondition[] = qualConditions()): string[] {
  return qualsIn({ op: 'all', items: conditions.filter(c => userOf(c) === user).map(c => c.require) });
}

/* the quals the Qualification Check compares against: SELF's, since there's no login */
export const heldQuals = computed(() => heldBy(SELF));

/* what a clause compares: nothing for a field off the Qualification Check forms, or anything not filled in or signed yet */
function clauseValue(f: ConditionField | undefined, subject: ConditionSubject): string | undefined {
  if (!f || f.unavailable) return undefined;
  const value = f.get(subject);
  return f.group !== 'Joint Details' && !value ? undefined : value;
}

/* the requirements of every condition the joint and step match, in table order (User rows aren't requirements) */
export function conditionRequirements(job: Job | undefined | null, step: ConditionStep = {}, fab: Record<string, string> = {}, stages: StageAnswers[] = []): QualGroup[] {
  if (!job) return [];
  const subject: ConditionSubject = { job, step, fab, stages };
  const fields = new Map(conditionFields().map(f => [f.key, f]));
  const valueOf = (key: string) => clauseValue(fields.get(key), subject);
  return qualConditions()
    .filter(c => userOf(c) === null && applies(c, valueOf))
    .map(c => cloneGroup(c.require));
}

/* the requirement of every condition a step with this WTN matches on the WTN alone, joined by AND;
   '' when there's none. A procedure has no Signoff Type, so the row's Type isn't compared, and a
   requirement repeated across Types is named once. */
export function wtnRequirementText(wtn: string): string {
  const valueOf = (key: string) => key === `${STEP_PREFIX}wtn` ? wtn : undefined;
  const matched = qualConditions().filter(c => c.require.items.length && userOf(c) === null && c.when.items.length && whenMatches(c.when, valueOf));
  const groups = [...new Map(matched.map(c => [requirementText(c.require), c])).values()];
  if (groups.length === 1) return requirementText(groups[0].require);
  return groups.map(c => requirementText(c.require, true)).join(' AND ');
}
