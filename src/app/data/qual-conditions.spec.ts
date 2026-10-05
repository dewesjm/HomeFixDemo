import { addTestJob } from './jobs';
import {
  QualCondition, SELF, conditionFields, conditionWhenText, conditionRequirements, heldBy, heldQuals, qualConditions, setQualConditions,
  wtnRequirementText,
} from './qual-conditions';
import { WhenGroup } from './qual-when';

const w = (field: string, value: string): WhenGroup => ({ op: 'all', items: [{ field, value }] });

describe('qual conditions', () => {
  let saved: QualCondition[];
  beforeEach(() => { saved = qualConditions(); });
  afterEach(() => setQualConditions(saved));

  it('offers Joint Details fields, sign-off fields and User', () => {
    const groups = new Set(conditionFields().map(f => f.group));
    expect([...groups]).toEqual(['Joint Details', 'Sign-off', 'User']);
    const keys = conditionFields().map(f => f.key);
    ['ss', 'controlledMaterial', 'titanium', 'drawing', 'materialType1', 'step:id', 'step:inspectionType', 'step:wtn', 'user']
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
    setQualConditions([{ when: w('titanium', 'Yes'), require: { op: 'all', items: ['TIWELD1'] } }]);
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
      .toEqual(['User is SELF', 'Controlled Material is Yes', 'SS is Yes', 'Type is VT', 'Titanium is Yes']);
  });

  it('matches a When of AND and OR clauses, with nested groups', () => {
    const job = addTestJob();
    setQualConditions([{
      when: { op: 'all', items: [
        { field: 'step:inspectionType', value: 'vt' },
        { op: 'any', items: [{ field: 'step:weldColor', value: 'straw' }, { field: 'step:weldColor', value: 'light-blue' }] },
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

  it('describes a WTN requirement, joining several conditions by AND', () => {
    setQualConditions([
      { when: w('step:wtn', '01.1-1'), require: { op: 'any', items: ['WELD427', 'WELD403'] } },
      { when: w('step:wtn', '01.1-1'), require: { op: 'all', items: ['WELD412'] } },
    ]);
    expect(wtnRequirementText('01.1-1')).toBe('(WELD427 OR WELD403) AND WELD412');
    expect(wtnRequirementText('02.2-2')).toBe('');
  });
});
