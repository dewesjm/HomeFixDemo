import { addTestJob } from '../../data/jobs';
import '../routing/stage-templates';
import {
  QualCondition, SELF, conditionFields, conditionTypesText, conditionWhenText, conditionRequirements, heldBy, heldQuals, liftTypes,
  notOnCheckForm, qualConditions, setQualConditions, signoffTypeChoices, wtnRequirementText,
} from './qual-conditions';
import { WhenClause, WhenGroup, normalizeWhen, whenComplete } from './qual-when';

const c = (field: string, value: string): WhenClause => ({ field, op: 'is', values: [value] });
const w = (field: string, value: string): WhenGroup => ({ op: 'all', items: [c(field, value)] });
const clause = (cond: Partial<WhenClause> & { field: string }): WhenGroup => ({ op: 'all', items: [{ op: 'is', values: [], ...cond }] });
const REQ = { op: 'all' as const, items: ['TIWELD1'] };

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
      { when: w('ss', job.ss === 'Yes' ? 'Yes' : 'No'), require: { op: 'all', items: ['WELD412'] } },
      { when: w('step:wtn', '01.1-1'), require: { op: 'any', items: ['WELD427', 'WELD403'] } },
      { when: w('step:inspectionType', 'vt'), require: { op: 'all', items: ['VTINSP1'] } },
      { when: w('step:id', 'root-weld'), require: { op: 'all', items: ['WELD458'] } },
    ]);
    expect(conditionRequirements(job).length).toBe(1);
    expect(conditionRequirements(job, { inputs: { wtn: '01.1-1' } }).length).toBe(2);
    expect(conditionRequirements(job, { inputs: { wtn: '99.9-9' } }).length).toBe(1);
    expect(conditionRequirements(job, { inspectionType: 'vt' }).length).toBe(2);
    expect(conditionRequirements(job, { inspectionType: 'mt' }).length).toBe(1);
    expect(conditionRequirements(job, { id: 'root-weld' }).length).toBe(2);
    expect(conditionRequirements(null, { inputs: { wtn: '01.1-1' } })).toEqual([]);
  });

  it('matches Titanium from either Material Type', () => {
    setQualConditions([{ when: w('material.titanium', 'Yes'), require: { op: 'all', items: ['TIWELD1'] } }]);
    const job = addTestJob();
    expect(conditionRequirements({ ...job, materialType1: '02-CS', materialType2: '61-TI64' }).length).toBe(1);
    expect(conditionRequirements({ ...job, materialType1: '02-CS', materialType2: '02-CS' }).length).toBe(0);
  });

  it('User rows give quals and are never requirements; the check runs as SELF', () => {
    setQualConditions([
      { when: w('user', SELF), require: { op: 'all', items: ['SSWELD1'] } },
      { when: w('user', SELF), require: { op: 'all', items: ['VTINSP1', 'SSWELD1'] } },
      { when: w('user', 'Mike Rourke'), require: { op: 'all', items: ['TIWELD1'] } },
    ]);
    expect(heldQuals()).toEqual(['SSWELD1', 'VTINSP1']);
    expect(heldBy('Mike Rourke')).toEqual(['TIWELD1']);
    expect(conditionRequirements(addTestJob())).toEqual([]);
  });

  it('seeds SELF plus controlled material, SS, VT and titanium requirements, all met by SELF', () => {
    setQualConditions(saved);
    expect(qualConditions().map(conditionWhenText))
      .toEqual(['User is SELF', 'Controlled Material is Yes', 'SS is Yes', 'Always', 'Either material is titanium is Yes']);
    expect(qualConditions().map(conditionTypesText)).toEqual(['All', 'All', 'All', 'VT', 'All']);
  });

  it('limits a row to its Signoff Types; none = all, and an empty When then matches every joint', () => {
    const job = addTestJob();
    setQualConditions([
      { when: w('material.titanium', 'Yes'), types: ['vt', 'mt'], require: { op: 'all', items: ['TIWELD1'] } },
      { when: { op: 'all', items: [] }, types: ['rt'], require: { op: 'all', items: ['WELD412'] } },
      { when: { op: 'all', items: [] }, types: [], require: { op: 'all', items: ['WELD427'] } },
    ]);
    const ti = { ...job, materialType1: '61-TI64' };
    expect(conditionRequirements(ti, { inspectionType: 'vt' }).length).toBe(1);
    expect(conditionRequirements(ti, { inspectionType: 'ut' }).length).toBe(0);
    expect(conditionRequirements(job, { inspectionType: 'rt' }).length).toBe(1);
    expect(conditionRequirements(job).length).toBe(0);
    expect(conditionTypesText(qualConditions()[0])).toBe('VT, MT');
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

  it('matches a When of AND and OR clauses, with nested groups', () => {
    const job = addTestJob();
    setQualConditions([{
      when: { op: 'all', items: [
        c('step:inspectionType', 'vt'),
        { op: 'any', items: [c('step:weldColor', 'straw'), c('step:weldColor', 'light-blue')] },
      ] },
      require: { op: 'all', items: ['TIWELD1'] },
    }]);
    expect(conditionRequirements(job, { inspectionType: 'vt' }).length).toBe(0);
    expect(conditionRequirements(job, { inspectionType: 'vt', inputs: { weldColor: 'straw' } }).length).toBe(1);
    expect(conditionRequirements(job, { inspectionType: 'vt', inputs: { weldColor: 'light-blue' } }).length).toBe(1);
    expect(conditionRequirements(job, { inspectionType: 'mt', inputs: { weldColor: 'straw' } }).length).toBe(0);
    expect(conditionWhenText(qualConditions()[0])).toBe('Type is VT AND (Weld Color is Straw OR Weld Color is Light Blue)');
  });

  it('a When with no clauses matches nothing', () => {
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
      setQualConditions([{ when, require: REQ }]);
      expect(conditionRequirements(job, { inspectionType: 'vt' })).toEqual([]);
    }
    expect(notOnCheckForm({ when: w('step:verifyMcl1', 'No'), types: ['fit'], require: REQ }).length).toBe(2);
    expect(notOnCheckForm({ when: w('ss', 'Yes'), types: ['vt'], require: REQ })).toEqual([]);
  });

  it('compares is, is not, several values and contains like Routing Settings', () => {
    const job = { ...addTestJob(), nInd: '2', drawing: 'ABC-123' };
    const matches = (when: WhenGroup) => { setQualConditions([{ when, require: REQ }]); return conditionRequirements(job).length === 1; };
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
    setQualConditions([{ when: clause({ field: 'step:weldColor', op: 'isNot', values: ['straw'] }), require: REQ }]);
    expect(conditionRequirements(job, { inspectionType: 'vt' })).toEqual([]);
    expect(conditionRequirements(job, { inspectionType: 'vt', inputs: { weldColor: 'light-blue' } }).length).toBe(1);
    expect(conditionRequirements(job, { inspectionType: 'vt', inputs: { weldColor: 'straw' } })).toEqual([]);
  });

  it('matches any attribute code slot', () => {
    const job = { ...addTestJob(), attributeCode1: 'GV', attributeCode2: 'PR' };
    setQualConditions([{ when: clause({ field: 'attributeCodes', values: ['PR'] }), require: REQ }]);
    expect(conditionRequirements(job).length).toBe(1);
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
});
