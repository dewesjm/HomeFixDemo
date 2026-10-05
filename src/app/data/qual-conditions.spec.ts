import { addTestJob } from './jobs';
import { QualCondition, conditionRequirements, qualConditions, setQualConditions, wtnRequirementText } from './qual-conditions';

describe('qual conditions', () => {
  let saved: QualCondition[];
  beforeEach(() => { saved = qualConditions(); });
  afterEach(() => setQualConditions(saved));

  it('matches joint fields always and WTN conditions only once a WTN is given', () => {
    const job = addTestJob();
    setQualConditions([
      { field: 'ss', value: job.ss === 'Yes' ? 'Yes' : 'No', require: { op: 'all', items: ['WELD412'] } },
      { field: 'wtn', value: '01.1-1', require: { op: 'any', items: ['WELD427', 'WELD403'] } },
    ]);
    expect(conditionRequirements(job).length).toBe(1);
    expect(conditionRequirements(job, { inputs: { wtn: '01.1-1' } }).length).toBe(2);
    expect(conditionRequirements(job, { inputs: { wtn: '99.9-9' } }).length).toBe(1);
    expect(conditionRequirements(null, { inputs: { wtn: '01.1-1' } })).toEqual([]);
  });

  it('matches Inspection Type once the step has one picked', () => {
    setQualConditions([{ field: 'inspectionType', value: 'VT', require: { op: 'all', items: ['VTINSP1'] } }]);
    const job = addTestJob();
    expect(conditionRequirements(job, { inspectionType: '' }).length).toBe(0);
    expect(conditionRequirements(job, { inspectionType: 'vt' }).length).toBe(1);
    expect(conditionRequirements(job, { inspectionType: 'mt' }).length).toBe(0);
  });

  it('matches Titanium from either Material Type', () => {
    setQualConditions([{ field: 'titanium', value: 'Yes', require: { op: 'all', items: ['TIWELD1'] } }]);
    const job = addTestJob();
    expect(conditionRequirements({ ...job, materialType1: '02-CS', materialType2: '61-TI64' }).length).toBe(1);
    expect(conditionRequirements({ ...job, materialType1: '02-CS', materialType2: '02-CS' }).length).toBe(0);
  });

  it('seeds controlled material, SS, VT and titanium conditions, and no WTN ones', () => {
    setQualConditions(saved);
    expect(qualConditions().map(c => c.field)).toEqual(['controlledMaterial', 'ss', 'inspectionType', 'titanium']);
  });

  it('describes a WTN requirement, joining several conditions by AND', () => {
    setQualConditions([
      { field: 'wtn', value: '01.1-1', require: { op: 'any', items: ['WELD427', 'WELD403'] } },
      { field: 'wtn', value: '01.1-1', require: { op: 'all', items: ['WELD412'] } },
    ]);
    expect(wtnRequirementText('01.1-1')).toBe('(WELD427 OR WELD403) AND WELD412');
    expect(wtnRequirementText('02.2-2')).toBe('');
  });
});
