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
    expect(conditionRequirements(job, '01.1-1').length).toBe(2);
    expect(conditionRequirements(job, '99.9-9').length).toBe(1);
    expect(conditionRequirements(null, '01.1-1')).toEqual([]);
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
