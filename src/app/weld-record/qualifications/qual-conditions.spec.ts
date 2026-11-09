import { addTestJob } from '../../data/jobs';
import '../routing/stage-templates';
import {
  QualCondition, SELF, conditionFields, conditionTypeText, conditionWhenText, conditionRequirements, distinctRequirements, heldBy, heldQuals, liftTypes,
  notOnCheckForm, qualConditions, rowsFromSaved, setQualConditions, signoffTypeChoices, wtnRequirementText,
} from './qual-conditions';
import { WhenClause, WhenGroup, normalizeWhen, whenComplete } from './qual-when';

const c = (field: string, value: string): WhenClause => ({ field, op: 'is', values: [value] });
const w = (field: string, value: string): WhenGroup => ({ op: 'all', items: [c(field, value)] });
const clause = (cond: Partial<WhenClause> & { field: string }): WhenGroup => ({ op: 'all', items: [{ op: 'is', values: [], ...cond }] });
const REQ = { op: 'all' as const, items: ['TIWELD1'] };
const VT = { inspectionType: 'vt' };

describe('qual conditions', () => {
  let saved: QualCondition[];
  beforeEach(() => { saved = qualConditions(); });
  afterEach(() => setQualConditions(saved));

  it('offers Joint Details fields, sign-off fields and User', () => {
    const groups = new Set(conditionFields().map(f => f.group));
    expect([...groups]).toEqual(['Joint Details', 'Fabrication', 'Routing answers', 'Sign-off', 'User']);
    const keys = conditionFields().map(f => f.key);
    ['ss', 'controlledMaterial', 'material.titanium', 'drawing', 'materialType1', 'step:id', 'step:inspectionType', 'step:wtn', 'user']
      .forEach(k => expect(keys).toContain(k));
  });

  it('matches joint fields always and sign-off fields once the step has them', () => {
    const job = addTestJob();
    setQualConditions([
      { when: w('ss', job.ss === 'Yes' ? 'Yes' : 'No'), type: 'vt', require: { op: 'all', items: ['WELD412'] } },
      { when: w('step:wtn', '01.1-1'), type: 'vt', require: { op: 'any', items: ['WELD427', 'WELD403'] } },
      { when: w('step:id', 'root-weld'), type: 'vt', require: { op: 'all', items: ['WELD458'] } },
    ]);
    expect(conditionRequirements(job, VT).length).toBe(1);
    expect(conditionRequirements(job, { ...VT, inputs: { wtn: '01.1-1' } }).length).toBe(2);
    expect(conditionRequirements(job, { ...VT, inputs: { wtn: '99.9-9' } }).length).toBe(1);
    expect(conditionRequirements(job, { ...VT, id: 'root-weld' }).length).toBe(2);
    expect(conditionRequirements(job, { inspectionType: 'mt' }).length).toBe(0);
    expect(conditionRequirements(job).length).toBe(0);
    expect(conditionRequirements(null, { inputs: { wtn: '01.1-1' } })).toEqual([]);
  });

  it('matches Titanium from either Material Type', () => {
    setQualConditions([{ when: w('material.titanium', 'Yes'), type: 'vt', require: { op: 'all', items: ['TIWELD1'] } }]);
    const job = addTestJob();
    expect(conditionRequirements({ ...job, materialType1: '02-CS', materialType2: '61-TI64' }, VT).length).toBe(1);
    expect(conditionRequirements({ ...job, materialType1: '02-CS', materialType2: '02-CS' }, VT).length).toBe(0);
  });

  it('User rows give quals and are never requirements; the check runs as SELF', () => {
    setQualConditions([
      { when: w('user', SELF), require: { op: 'all', items: ['SSWELD1'] } },
      { when: w('user', SELF), require: { op: 'all', items: ['VTINSP1', 'SSWELD1'] } },
      { when: w('user', 'Mike Rourke'), require: { op: 'all', items: ['TIWELD1'] } },
    ]);
    expect(heldQuals()).toEqual(['SSWELD1', 'VTINSP1']);
    expect(heldBy('Mike Rourke')).toEqual(['TIWELD1']);
    expect(conditionRequirements(addTestJob(), VT)).toEqual([]);
  });

  it('seeds SELF, one row per Signoff Type for controlled material, SS and titanium, and VT', () => {
    setQualConditions(saved);
    const typesFor = (text: string) => qualConditions().filter(r => conditionWhenText(r) === text).map(conditionTypeText);
    const every = signoffTypeChoices().map(o => o.label);
    expect(typesFor('User is SELF')).toEqual(['']);
    for (const text of ['Controlled Material is Yes', 'SS is Yes', 'Either material is titanium is Yes']) expect(typesFor(text)).toEqual(every);
    expect(typesFor('Always')).toEqual(['VT']);
  });

  it('applies a row to its one Signoff Type, and an empty When then matches every joint of it', () => {
    const job = addTestJob();
    setQualConditions([
      { when: w('material.titanium', 'Yes'), type: 'vt', require: { op: 'all', items: ['TIWELD1'] } },
      { when: { op: 'all', items: [] }, type: 'rt', require: { op: 'all', items: ['WELD412'] } },
    ]);
    const ti = { ...job, materialType1: '61-TI64' };
    expect(conditionRequirements(ti, { inspectionType: 'vt' }).length).toBe(1);
    expect(conditionRequirements(ti, { inspectionType: 'ut' }).length).toBe(0);
    expect(conditionRequirements(job, { inspectionType: 'rt' }).length).toBe(1);
    expect(conditionRequirements(job).length).toBe(0);
    expect(conditionTypeText(qualConditions()[0])).toBe('VT');
  });

  it('moves a saved top-level Type clause into the Signoff Type column', () => {
    const req = { op: 'all' as const, items: ['VTINSP1'] };
    expect(liftTypes({ when: { op: 'all', items: [c('step:inspectionType', 'vt'), c('ss', 'Yes')] }, require: req }))
      .toEqual({ when: w('ss', 'Yes'), require: req, types: ['vt'] });
    expect(liftTypes({ when: { op: 'any', items: [c('step:inspectionType', 'vt'), c('step:inspectionType', '5x')] }, require: req }))
      .toEqual({ when: { op: 'all', items: [] }, require: req, types: ['vt', '5x'] });
    const mixed: QualCondition = { when: { op: 'any', items: [c('step:inspectionType', 'vt'), c('ss', 'Yes')] }, require: req };
    expect(liftTypes(mixed)).toEqual({ ...mixed, types: [] });
  });

  it('splits saved rows into one row per Signoff Type', () => {
    const when = w('ss', 'Yes');
    const offered = signoffTypeChoices().map(o => o.value);
    const typesOf = (row: Parameters<typeof rowsFromSaved>[0][number]) => rowsFromSaved([row]).map(r => r.type);
    expect(typesOf({ when, require: REQ, types: ['vt', 'mt'] })).toEqual(['vt', 'mt']);
    expect(typesOf({ when, require: REQ, types: [] })).toEqual(offered);
    expect(typesOf({ when, require: REQ })).toEqual(offered);
    expect(rowsFromSaved([{ when, require: REQ, types: ['vt'] }])).toEqual([{ when, require: REQ, type: 'vt' }]);
    expect(rowsFromSaved([{ when, require: REQ, type: 'vt' }])).toEqual([{ when, require: REQ, type: 'vt' }]);
    expect(rowsFromSaved([{ when: w('user', SELF), require: REQ, types: [] }])).toEqual([{ when: w('user', SELF), require: REQ }]);
    /* it matched nothing, and must not start applying */
    expect(rowsFromSaved([{ when: { op: 'all', items: [] }, require: REQ, types: [] }])).toEqual([]);
  });

  it('matches a When of AND and OR clauses, with nested groups', () => {
    const job = addTestJob();
    setQualConditions([{
      when: { op: 'all', items: [
        c('step:inspectionType', 'vt'),
        { op: 'any', items: [c('step:weldColor', 'straw'), c('step:weldColor', 'light-blue')] },
      ] },
      type: 'vt',
      require: { op: 'all', items: ['TIWELD1'] },
    }]);
    expect(conditionRequirements(job, { inspectionType: 'vt' }).length).toBe(0);
    expect(conditionRequirements(job, { inspectionType: 'vt', inputs: { weldColor: 'straw' } }).length).toBe(1);
    expect(conditionRequirements(job, { inspectionType: 'vt', inputs: { weldColor: 'light-blue' } }).length).toBe(1);
    expect(conditionRequirements(job, { inspectionType: 'mt', inputs: { weldColor: 'straw' } }).length).toBe(0);
    expect(conditionWhenText(qualConditions()[0])).toBe('Type is VT AND (Weld Color is Straw OR Weld Color is Light Blue)');
  });

  it('a row with no Signoff Type matches nothing', () => {
    setQualConditions([{ when: { op: 'all', items: [] }, require: { op: 'all', items: ['TIWELD1'] } }]);
    expect(conditionRequirements(addTestJob(), { inspectionType: 'vt' })).toEqual([]);
  });

  it('offers only fields on a form with a Qualification Check, plus WTN', () => {
    const offered = conditionFields().filter(f => f.group === 'Sign-off' && !f.unavailable).map(f => f.key);
    expect(offered).toContain('step:weldColor');
    expect(offered).toContain('step:wtn');
    for (const key of ['step:verifyMic1', 'step:verifyMcl1', 'step:fillerMetalMic', 'step:qualificationCheck']) expect(offered).not.toContain(key);
    expect(conditionFields().some(f => f.key === 'titanium')).toBeFalse();
    const types = signoffTypeChoices().map(o => o.value);
    expect(types).toContain('vt');
    expect(types).not.toContain('fit');
  });

  it('never matches a field off the check forms, whichever comparison it saved', () => {
    const job = addTestJob();
    for (const when of [w('step:verifyMcl1', 'No'), w('step:verifyMcl1', 'Yes'), clause({ field: 'step:verifyMcl1', op: 'isNot', values: ['Yes'] })]) {
      setQualConditions([{ when, type: 'vt', require: REQ }]);
      expect(conditionRequirements(job, { inspectionType: 'vt' })).toEqual([]);
    }
    expect(notOnCheckForm({ when: w('step:verifyMcl1', 'No'), type: 'fit', require: REQ }).length).toBe(2);
    expect(notOnCheckForm({ when: w('ss', 'Yes'), type: 'vt', require: REQ })).toEqual([]);
  });

  it('compares is, is not, several values and contains like Routing Settings', () => {
    const job = { ...addTestJob(), nInd: '2', drawing: 'ABC-123' };
    const matches = (when: WhenGroup) => { setQualConditions([{ when, type: 'vt', require: REQ }]); return conditionRequirements(job, VT).length === 1; };
    expect(matches(clause({ field: 'nInd', values: ['1', '2'] }))).toBeTrue();
    expect(matches(clause({ field: 'nInd', values: ['1', '3'] }))).toBeFalse();
    expect(matches(clause({ field: 'nInd', op: 'isNot', values: ['1', '3'] }))).toBeTrue();
    expect(matches(clause({ field: 'nInd', op: 'isNot', values: ['2'] }))).toBeFalse();
    expect(matches(clause({ field: 'drawing', op: 'contains', values: ['abc'] }))).toBeTrue();
    expect(matches(clause({ field: 'drawing', op: 'contains', values: ['xyz'] }))).toBeFalse();
    expect(matches(clause({ field: 'nInd' }))).toBeFalse();
    setQualConditions([{ when: clause({ field: 'nInd', op: 'isNot', values: ['1', '3'] }), require: REQ }]);
    expect(conditionWhenText(qualConditions()[0])).toBe('N Ind. is not 1 or 3');
    setQualConditions([{ when: clause({ field: 'drawing', op: 'contains', values: ['abc'] }), require: REQ }]);
    expect(conditionWhenText(qualConditions()[0])).toBe('Drawing contains "abc"');
  });

  it('a sign-off field not filled in yet matches nothing, is not included', () => {
    const job = addTestJob();
    setQualConditions([{ when: clause({ field: 'step:weldColor', op: 'isNot', values: ['straw'] }), type: 'vt', require: REQ }]);
    expect(conditionRequirements(job, { inspectionType: 'vt' })).toEqual([]);
    expect(conditionRequirements(job, { inspectionType: 'vt', inputs: { weldColor: 'light-blue' } }).length).toBe(1);
    expect(conditionRequirements(job, { inspectionType: 'vt', inputs: { weldColor: 'straw' } })).toEqual([]);
  });

  it('matches any attribute code slot', () => {
    const job = { ...addTestJob(), attributeCode1: 'GV', attributeCode2: 'PR' };
    setQualConditions([{ when: clause({ field: 'attributeCodes', values: ['PR'] }), type: 'vt', require: REQ }]);
    expect(conditionRequirements(job, VT).length).toBe(1);
  });

  it('a WTN row reads only the WTN, so another field is not leaving it on every WTN', () => {
    setQualConditions([{ when: clause({ field: 'ss', op: 'isNot', values: ['Yes'] }), require: REQ }]);
    expect(wtnRequirementText('01.1-1')).toBe('');
  });

  it('converts rows saved as field and value, and the old Titanium field', () => {
    const old = { op: 'all', items: [{ field: 'titanium', value: 'Yes' }, { op: 'any', items: [{ field: 'ss', value: 'No' }, { field: 'drawing', value: '' }] }] } as unknown as WhenGroup;
    expect(normalizeWhen(old)).toEqual({ op: 'all', items: [c('material.titanium', 'Yes'), { op: 'any', items: [c('ss', 'No'), { field: 'drawing', op: 'is', values: [] }] }] });
    const current = clause({ field: 'nInd', op: 'isNot', values: ['1'] });
    expect(normalizeWhen(current)).toEqual(current);
  });

  it('needs a value on every clause, including nested ones', () => {
    expect(whenComplete(w('ss', 'Yes'))).toBeTrue();
    expect(whenComplete({ op: 'all', items: [] })).toBeTrue();
    expect(whenComplete(clause({ field: 'ss' }))).toBeFalse();
    expect(whenComplete({ op: 'all', items: [c('ss', 'Yes'), clause({ field: 'ss' })] })).toBeFalse();
  });

  it('describes a WTN requirement, joining several conditions by AND', () => {
    setQualConditions([
      { when: w('step:wtn', '01.1-1'), require: { op: 'any', items: ['WELD427', 'WELD403'] } },
      { when: w('step:wtn', '01.1-1'), require: { op: 'all', items: ['WELD412'] } },
    ]);
    expect(wtnRequirementText('01.1-1')).toBe('(WELD427 OR WELD403) AND WELD412');
    expect(wtnRequirementText('02.2-2')).toBe('');
  });

  it('counts a requirement repeated across Signoff Types once, and leaves out User rows', () => {
    const rows: QualCondition[] = [
      { when: w('user', SELF), require: REQ },
      { when: w('ss', 'Yes'), type: 'vt', require: REQ },
      { when: w('ss', 'Yes'), type: 'mt', require: REQ },
      { when: w('ss', 'No'), type: 'vt', require: REQ },
      { when: w('ss', 'Yes'), type: 'rt', require: { op: 'all', items: ['SSWELD1'] } },
    ];
    expect(distinctRequirements(rows).length).toBe(3);
  });

  it('reads a WTN requirement whatever the row\'s Signoff Type, naming one repeated across Types once', () => {
    const require = { op: 'any' as const, items: ['WELD427', 'WELD403'] };
    setQualConditions([{ when: w('step:wtn', '01.1-1'), type: 'vt', require }, { when: w('step:wtn', '01.1-1'), type: 'mt', require }]);
    expect(wtnRequirementText('01.1-1')).toBe('WELD427 OR WELD403');
  });
});
