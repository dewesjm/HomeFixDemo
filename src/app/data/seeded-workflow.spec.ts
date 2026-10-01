import { seededWorkflow, activeStageId } from './workflow';
import { JOBS } from './jobs';

describe('seeded joints', () => {
  it('every seeded joint has at least one sign-off in its history', () => {
    const empty = JOBS.filter(j => !seededWorkflow(j).history.some(e => e.section === 'Sign-off')).map(j => j.id);
    expect(empty).toEqual([]);
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
      expect(wf.stages.find(s => s.id === 'excavation-ndt')!.inspectionType).toBe(repair.inputs['originInspectionType']);
    }
  });
});
