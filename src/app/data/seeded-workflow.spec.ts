import { seededWorkflow, activeStageId } from './workflow';
import { JOBS } from './jobs';

describe('seeded joints', () => {
  it('only joints still on their first step start with no history, at both Pre-Fit and Fit', () => {
    const empty = JOBS.map(j => seededWorkflow(j)).filter(wf => !wf.history.some(e => e.section === 'Sign-off'));
    for (const wf of empty) {
      expect(activeStageId(wf.stages)).withContext(wf.jobId).toBe(wf.stages.find(s => s.required)!.id);
    }
    expect(empty.some(wf => activeStageId(wf.stages) === 'pre-fit')).toBeTrue();
    expect(empty.some(wf => activeStageId(wf.stages) === 'fit')).toBeTrue();
  });

  it('a handful wait on Repair after an NDT UNSAT, and a couple on Excavation NDT after a Weld Repair', () => {
    const at = (id: RegExp) => JOBS.map(j => seededWorkflow(j)).filter(wf => id.test(activeStageId(wf.stages) ?? ''));
    const onRepair = at(/^repair$/);
    const onExcavation = at(/^excavation-ndt$/);
    expect(onRepair.length).toBeGreaterThanOrEqual(3);
    expect(onExcavation.length).toBeGreaterThanOrEqual(2);
    for (const wf of [...onRepair, ...onExcavation]) {
      const repair = wf.stages.find(s => s.id === 'repair')!;
      const failed = wf.stages.find(s => s.id === repair.inputs['originStageId'])!;
      expect(failed.result).withContext(wf.jobId).toBe('unsat');
      expect(wf.repairNumber).withContext(wf.jobId).toBe('01');
    }
    for (const wf of onExcavation) {
      const repair = wf.stages.find(s => s.id === 'repair')!;
      expect(repair.signed && repair.inputs['repairType']).withContext(wf.jobId).toBe('weld-repair');
      const excavation = wf.stages.find(s => s.id === 'excavation-ndt')!;
      expect(excavation.routingOptions?.map(o => o.value)).withContext(wf.jobId).toEqual([repair.inputs['originInspectionType']]);
      expect(excavation.inspectionType).withContext(wf.jobId).toBe('');
    }
  });
});
