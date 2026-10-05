import { addTestJob } from './jobs';
import {
  QualCondition, SELF, conditionFields, conditionRequirements, heldBy, heldQuals, qualConditions, setQualConditions,
  wtnRequirementText,
} from './qual-conditions';

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
      { field: 'ss', value: job.ss === 'Yes' ? 'Yes' : 'No', require: { op: 'all', items: ['WELD412'] } },
      { field: 'step:wtn', value: '01.1-1', require: { op: 'any', items: ['WELD427', 'WELD403'] } },
      { field: 'step:inspectionType', value: 'vt', require: { op: 'all', items: ['VTINSP1'] } },
      { field: 'step:id', value: 'root-weld', require: { op: 'all', items: ['WELD458'] } },
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
    setQualConditions([{ field: 'titanium', value: 'Yes', require: { op: 'all', items: ['TIWELD1'] } }]);
    const job = addTestJob();
    expect(conditionRequirements({ ...job, materialType1: '02-CS', materialType2: '61-TI64' }).length).toBe(1);
    expect(conditionRequirements({ ...job, materialType1: '02-CS', materialType2: '02-CS' }).length).toBe(0);
  });

  it('User rows give quals and are never requirements; the check runs as SELF', () => {
    setQualConditions([
      { field: 'user', value: SELF, require: { op: 'all', items: ['SSWELD1'] } },
      { field: 'user', value: SELF, require: { op: 'all', items: ['VTINSP1', 'SSWELD1'] } },
      { field: 'user', value: 'Mike Rourke', require: { op: 'all', items: ['TIWELD1'] } },
    ]);
    expect(heldQuals()).toEqual(['SSWELD1', 'VTINSP1']);
    expect(heldBy('Mike Rourke')).toEqual(['TIWELD1']);
    expect(conditionRequirements(addTestJob())).toEqual([]);
  });

  it('seeds SELF plus controlled material, SS, VT and titanium requirements, all met by SELF', () => {
    setQualConditions(saved);
    expect(qualConditions().map(c => c.field)).toEqual(['user', 'controlledMaterial', 'ss', 'step:inspectionType', 'titanium']);
  });

  it('describes a WTN requirement, joining several conditions by AND', () => {
    setQualConditions([
      { field: 'step:wtn', value: '01.1-1', require: { op: 'any', items: ['WELD427', 'WELD403'] } },
      { field: 'step:wtn', value: '01.1-1', require: { op: 'all', items: ['WELD412'] } },
    ]);
    expect(wtnRequirementText('01.1-1')).toBe('(WELD427 OR WELD403) AND WELD412');
    expect(wtnRequirementText('02.2-2')).toBe('');
  });
});
