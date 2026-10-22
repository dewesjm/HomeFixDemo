import { JOBS, Job } from '../jobs';
import { buildStages } from './build-stages';
import { buildConditionContext } from './condition-context';
import { conditionText } from './field-rules';

describe('buildConditionContext jointDetail', () => {
  const job: Job = { ...JOBS.find(j => j.trade === 'Welding')!, ss: 'X', ndtEach: 'mt', nInd: '1' };
  const ctx = buildConditionContext(buildStages(job)[0], job, []);

  it('reads Joint Details fields as Routing Settings shows them', () => {
    expect(ctx.jointDetail('ss')).toBe('Yes');
    expect(ctx.jointDetail('ndtEach')).toBe('MT');
    expect(ctx.jointDetail('nInd')).toBe('1');
  });

  it('names a Joint Details field by its label', () => {
    expect(conditionText({ all: [{ source: 'jointDetail', key: 'ndtEach', equals: 'MT' }] })).toBe('joint NDT Each Layer is MT');
  });
});
