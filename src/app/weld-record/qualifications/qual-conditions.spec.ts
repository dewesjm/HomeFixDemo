import { addTestJob } from '../../data/jobs';
import {
  QualCondition, SELF, conditionFields, conditionTypesText, conditionWhenText, conditionRequirements, heldBy, heldQuals, liftTypes,
  qualConditions, setQualConditions, wtnRequirementText,
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
      .toEqual(['User is SELF', 'Controlled Material is Yes', 'SS is Yes', 'Always', 'Titanium is Yes']);
    expect(qualConditions().map(conditionTypesText)).toEqual(['All', 'All', 'All', 'VT', 'All']);
  });

  it('limits a row to its Signoff Types; none = all, and an empty When then matches every joint', () => {
    const job = addTestJob();
    setQualConditions([
      { when: w('titanium', 'Yes'), types: ['vt', 'mt'], require: { op: 'all', items: ['TIWELD1'] } },
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
    expect(liftTypes({ when: { op: 'all', items: [{ field: 'step:inspectionType', value: 'vt' }, { field: 'ss', value: 'Yes' }] }, require: req }))
      .toEqual({ when: w('ss', 'Yes'), require: req, types: ['vt'] });
    expect(liftTypes({ when: { op: 'any', items: [{ field: 'step:inspectionType', value: 'vt' }, { field: 'step:inspectionType', value: '5x' }] }, require: req }))
      .toEqual({ when: { op: 'all', items: [] }, require: req, types: ['vt', '5x'] });
    const mixed: QualCondition = { when: { op: 'any', items: [{ field: 'step:inspectionType', value: 'vt' }, { field: 'ss', value: 'Yes' }] }, require: req };
    expect(liftTypes(mixed)).toEqual({ ...mixed, types: [] });
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
