import { seededWorkflow } from './seeded-workflow';
import { activeStageId } from '../weld-record/routing-logic/current-routing';
import { JOBS } from './jobs';

/* joints seeded partway through their routing; the attribute demo joints start fresh */
const seededJobs = () => JOBS.filter(j => !j._fresh);

describe('seeded joints', () => {
  it('only joints still on their first step start with no history, at both Pre-Fit and Fit', () => {
    const empty = seededJobs().map(j => seededWorkflow(j)).filter(wf => !wf.history.some(e => e.section === 'Sign-off'));
    for (const wf of empty) {
      expect(activeStageId(wf.stages)).withContext(wf.jobId).toBe(wf.stages.find(s => s.required)!.id);
    }
    expect(empty.some(wf => activeStageId(wf.stages) === 'pre-fit')).toBeTrue();
    expect(empty.some(wf => activeStageId(wf.stages) === 'fit')).toBeTrue();
  });

  it('Fit-Up Insp is released to welding, except on the few joints waiting at Fit-Up Release', () => {
    const signed = seededJobs().map(j => seededWorkflow(j))
      .map(wf => ({ wf, insp: wf.stages.find(s => /fitup-insp$/.test(s.id) && s.signed) }))
      .filter(x => x.insp);
    const waiting = signed.filter(x => activeStageId(x.wf.stages) === 'fitup-release');
    expect(signed.length).toBeGreaterThan(100);
    expect(waiting.length).toBeGreaterThan(0);
    expect(waiting.length).toBeLessThan(20);
    for (const { wf, insp } of signed) {
      const released = waiting.every(x => x.wf !== wf);
      expect(insp!.inputs['releaseToWelding']).withContext(wf.jobId).toBe(released ? 'yes' : '');
    }
  });

  it('a handful wait on Repair after an NDT UNSAT, and a couple on Excavation NDT after a Weld Repair', () => {
    const at = (id: RegExp) => seededJobs().map(j => seededWorkflow(j)).filter(wf => id.test(activeStageId(wf.stages) ?? ''));
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
      expect(excavation.typeOptions?.map(o => o.value)).withContext(wf.jobId).toEqual([repair.inputs['originInspectionType']]);
      expect(excavation.inspectionType).withContext(wf.jobId).toBe('');
    }
  });
});
