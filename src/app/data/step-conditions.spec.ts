import { buildStages, applySignedFlags, updateStageTemplate, jobNdtSteps, reorderStageTemplates, getTemplates } from './workflow';
import { JOBS, Job } from './jobs';
import { getJointDesign } from './joint-designs';
import { DEFAULT_STEP_CONDITIONS, describeConditions } from './step-conditions';

/* the step list buildStages() produced before the rules moved to Admin > Routing */
function oldStepIds(job: Job, ids: string[]): string[] {
  const ndt = jobNdtSteps(job);
  const hasO63 = Boolean(job.sfff || job.dssAaa || job.ss);
  return ids.filter(id => {
    const m = /^(root|layer|final)-ndt-(\w+)$/.exec(id);
    if (m) return ndt[m[1] as 'root'].some(st => st.kind === m[2]);
    if (id === 'pre-fit') {
      const jd = getJointDesign(job.jointDesign);
      return job.nInd === '1' || job.nInd === '2' || !!jd?.requiresConsumableInsert || !!jd?.requiresBackingRing;
    }
    if (id === 'review-o63') return hasO63;
    if (id === 'review-o04') return !hasO63;
    return true;
  });
}

const ALL_IDS = ['pre-fit', 'fit', 'tack', 'fitup-insp', 'fitup-release', 'deferred-tack', 'root-weld',
  'root-ndt-vt5x', 'root-ndt-mtpt', 'root-ndt-utrt', 'root-layer', 'layer-ndt-vt5x', 'layer-ndt-mtpt', 'layer-ndt-utrt',
  'final-weld', 'final-ndt-vt5x', 'final-ndt-mtpt', 'final-ndt-utrt', 'review-o63', 'review-o04', 'sold'];

describe('step conditions', () => {
  afterEach(() => updateStageTemplate('Welding', 'pre-fit', { includeWhen: DEFAULT_STEP_CONDITIONS['pre-fit'] }));

  it('built-in rules give every seeded joint the same steps as before', () => {
    for (const job of JOBS.filter(j => j.trade === 'Welding')) {
      expect(buildStages(job).map(s => s.id)).withContext(job.id).toEqual(oldStepIds(job, ALL_IDS));
    }
  });

  it('uses an admin-changed rule', () => {
    const job = { ...JOBS.find(j => j.trade === 'Welding')!, nInd: '3', jointDesign: 'C-24' };
    expect(buildStages(job).some(s => s.id === 'pre-fit')).toBeFalse();
    updateStageTemplate('Welding', 'pre-fit', { includeWhen: [[{ field: 'nInd', op: 'is', values: ['3'] }]] });
    expect(buildStages(job).some(s => s.id === 'pre-fit')).toBeTrue();
    updateStageTemplate('Welding', 'pre-fit', { includeWhen: [] });
    expect(buildStages({ ...job, nInd: '1' }).some(s => s.id === 'pre-fit')).toBeTrue();
  });

  it('Defer Tack and Release to welding switch steps on once signed', () => {
    const job = JOBS.find(j => j.trade === 'Welding')!;
    let stages = buildStages(job);
    const req = (id: string) => stages.find(s => s.id === id)!.required;
    expect([req('tack'), req('deferred-tack'), req('fitup-release')]).toEqual([true, false, false]);
    stages = applySignedFlags(stages.map(s => s.id === 'fit' ? { ...s, signed: true, signoffInputs: { deferTack: 'yes' } } : s), job);
    expect([req('tack'), req('deferred-tack')]).toEqual([false, true]);
    stages = applySignedFlags(stages.map(s => s.id === 'fitup-insp' ? { ...s, signed: true, inputs: { releaseToWelding: '' } } : s), job);
    expect(req('fitup-release')).toBeTrue();
  });

  it('describes rules in plain words', () => {
    expect(describeConditions([])).toBe('Always');
    expect(describeConditions(DEFAULT_STEP_CONDITIONS['root-ndt-utrt']))
      .toBe('NDT Root is UT; or RT Root is 10 or 100 or 360 or 60 or 75');
  });
});

describe('step order (Admin > Routing)', () => {
  it('a saved order is what new joints get, and it survives a reload', () => {
    const original = getTemplates()['Welding'].map(t => t.id);
    const moved = original.filter(id => id !== 'fit');
    moved.splice(moved.indexOf('tack') + 1, 0, 'fit');
    reorderStageTemplates('Welding', moved);
    try {
      const ids = buildStages(JOBS.find(j => j.trade === 'Welding')!).map(s => s.id);
      expect(ids.indexOf('fit')).toBe(ids.indexOf('tack') + 1);
      /* written to storage: a second read (cache cleared by the save) still has it */
      expect(getTemplates()['Welding'].map(t => t.id)).toEqual(moved);
    } finally {
      reorderStageTemplates('Welding', original);
    }
  });
});
