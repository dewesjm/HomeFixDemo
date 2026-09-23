import { TestBed } from '@angular/core/testing';
import { addTestJob, Job } from '../../data/jobs';
import { SignoffService } from './signoff.service';
import { WorkflowStore } from './workflow-store.service';

/* addTestJob('Welding') with these overrides yields a minimal, deterministic Welding pipeline:
   pre-fit, fit, tack, fitup-insp, fitup-release (not required), deferred-tack (not required),
   root-weld, root-layer, final-weld, review-o04, sold — no NDT stages (ndt: '') unless noted. */
function weldingJob(overrides: Partial<Job> = {}): Job {
  const job = addTestJob('Welding');
  Object.assign(job, { ndt: '', jointDesign: '', sfff: '', dssAaa: '', ss: '', ...overrides });
  return job;
}

describe('SignoffService', () => {
  let service: SignoffService;
  let store: WorkflowStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SignoffService);
    store = TestBed.inject(WorkflowStore);
  });

  afterEach(() => localStorage.clear());

  it('locks the stage, timestamps it, and records a signoff entry', () => {
    const job = weldingJob();
    service.signStage(job, 'tack');
    const wf = store.workflowFor(job)();
    const tack = wf.stages.find(s => s.id === 'tack')!;
    expect(tack.signed).toBeTrue();
    expect(tack.signedAt).toBeTruthy();
    expect(tack.signoffRecords.at(-1)?.action).toBe('signed');
    expect(wf.history.some(h => h.section === 'Sign-off' && h.action.includes('Signed off'))).toBeTrue();
  });

  it('defers tack: signing Fit with deferTack=yes skips regular Tack and activates Deferred Tack', () => {
    const job = weldingJob();
    store.update(job, wf => ({
      ...wf,
      stages: wf.stages.map(s => s.id === 'fit' ? { ...s, signoffInputs: { ...s.signoffInputs, deferTack: 'yes' } } : s),
    }));

    service.signStage(job, 'fit');

    const wf = store.workflowFor(job)();
    expect(wf.stages.find(s => s.id === 'tack')?.required).toBeFalse();
    expect(wf.stages.find(s => s.id === 'deferred-tack')?.required).toBeTrue();
  });

  it('activates Fit-Up Release when Fit-Up Insp signs without releasing to Welding', () => {
    const job = weldingJob();
    store.update(job, wf => ({
      ...wf,
      stages: wf.stages.map(s => s.id === 'fitup-insp' ? { ...s, inputs: { releaseToWelding: '' } } : s),
    }));

    service.signStage(job, 'fitup-insp');

    expect(store.workflowFor(job)().stages.find(s => s.id === 'fitup-release')?.required).toBeTrue();
  });

  it('on reject (unsat + rejectToStage), re-opens stages back to the reject target', () => {
    const job = weldingJob();
    store.update(job, wf => ({
      ...wf,
      stages: wf.stages.map(s => {
        if (s.id === 'tack') return { ...s, signed: true, signedAt: new Date().toISOString(), result: 'sat' };
        if (s.id === 'fitup-insp') return { ...s, result: 'unsat' };   // fitup-insp's template rejectToStage is 'tack'
        return s;
      }),
    }));

    service.signStage(job, 'fitup-insp');

    const tack = store.workflowFor(job)().stages.find(s => s.id === 'tack')!;
    expect(tack.signed).toBeFalse();
    expect(tack.signoffRecords.at(-1)?.action).toBe('reopened');
  });

  it('on an NDT reject, inserts a Repair stage right after the rejected NDT stage', () => {
    const job = weldingJob({ ndt: 'UT' });   // pulls in the root-ndt-utrt stage
    store.update(job, wf => ({
      ...wf,
      stages: wf.stages.map(s => s.id === 'root-ndt-utrt' ? { ...s, result: 'unsat' } : s),
    }));

    service.signStage(job, 'root-ndt-utrt');

    const stages = store.workflowFor(job)().stages;
    const ndtIdx = stages.findIndex(s => s.id === 'root-ndt-utrt');
    expect(stages[ndtIdx + 1]?.id).toBe('repair');
  });

  it('reopenStage un-signs a stage and logs a reopened signoff record', () => {
    const job = weldingJob();
    service.signStage(job, 'tack');

    service.reopenStage(job, 'tack');

    const tack = store.workflowFor(job)().stages.find(s => s.id === 'tack')!;
    expect(tack.signed).toBeFalse();
    expect(tack.signoffRecords.at(-1)?.action).toBe('reopened');
    expect(store.workflowFor(job)().history.some(h => h.action.includes('re-opened'))).toBeTrue();
  });

  it('releaseFitUp signs the Fit-Up Release stage and logs a Release entry', () => {
    const job = weldingJob();
    service.releaseFitUp(job);
    const wf = store.workflowFor(job)();
    const release = wf.stages.find(s => s.id === 'fitup-release')!;
    expect(release.signed).toBeTrue();
    expect(wf.history.some(h => h.section === 'Release')).toBeTrue();
  });
});
