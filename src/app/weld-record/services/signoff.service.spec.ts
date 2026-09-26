import { TestBed } from '@angular/core/testing';
import { addTestJob, Job, JOBS } from '../../data/jobs';
import { SignoffService } from './signoff.service';
import { RoutingService } from './routing.service';
import { WorkflowStore } from './workflow-store.service';
import { activeStageId, discardUnsignedEdits, seededWorkflow } from '../../data/workflow';

/* addTestJob('Welding') with these overrides yields a minimal, deterministic Welding pipeline:
   pre-fit, fit, tack, fitup-insp, fitup-release (not required), deferred-tack (not required),
   root-weld, root-layer, final-weld, review-o04, sold — plus a VT step per phase (NDT Root/Each/Final blank counts as VT only) unless noted. */
function weldingJob(overrides: Partial<Job> = {}): Job {
  const job = addTestJob('Welding');
  Object.assign(job, { ndt: '', ndtRoot: '', ndtEach: '', ndtFinal: '', jointDesign: '', sfff: '', dssAaa: '', ss: '', ...overrides });
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
    service.signStage(job, 'pre-fit');
    store.update(job, wf => ({
      ...wf,
      stages: wf.stages.map(s => s.id === 'fit' ? { ...s, signoffInputs: { ...s.signoffInputs, deferTack: 'yes' } } : s),
    }));

    service.signStage(job, 'fit');

    const wf = store.workflowFor(job)();
    expect(wf.stages.find(s => s.id === 'tack')?.required).toBeFalse();
    expect(wf.stages.find(s => s.id === 'deferred-tack')?.required).toBeTrue();
    expect(activeStageId(wf.stages)).toBe('fitup-insp');
  });

  it('defers tack through the joint page: checkbox, sign, then leaving the page keeps it deferred', () => {
    const job = weldingJob();
    service.signStage(job, 'pre-fit');
    /* the joint page snapshots the workflow when it opens and discards unsigned edits when it's left */
    const opened = store.workflowFor(job)();
    const snapshot = { fabricationData: { ...opened.fabricationData }, stages: Object.fromEntries(opened.stages.map(s => [s.id, s])) };
    const fit = opened.stages.find(s => s.id === 'fit')!;
    service.updateStageSignoff(job, 'fit', { signoffInputs: { ...fit.signoffInputs, deferTack: 'yes' } }, { action: 'Fit - Defer Tack' });
    service.signStage(job, 'fit');
    store.update(job, wf => discardUnsignedEdits(wf, snapshot));

    const wf = store.workflowFor(job)();
    expect(wf.stages.find(s => s.id === 'tack')?.required).toBeFalse();
    expect(wf.stages.find(s => s.id === 'deferred-tack')?.required).toBeTrue();
    expect(activeStageId(wf.stages)).toBe('fitup-insp');
  });

  it('leaving the page after a route-back keeps the route-back (does not restore signed stages)', () => {
    const job = weldingJob();
    ['pre-fit', 'fit', 'tack'].forEach(id => service.signStage(job, id));
    const opened = store.workflowFor(job)();
    const snapshot = { fabricationData: { ...opened.fabricationData }, stages: Object.fromEntries(opened.stages.map(s => [s.id, s])) };
    store.update(job, wf => ({ ...wf, stages: wf.stages.map(s => s.id === 'fitup-insp' ? { ...s, result: 'unsat' } : s) }));
    service.signStage(job, 'fitup-insp');
    store.update(job, wf => discardUnsignedEdits(wf, snapshot));

    expect(activeStageId(store.workflowFor(job)().stages)).toBe('fit');
  });

  it('seeded joints never sign a skipped step (Deferred Tack, Fit-Up Release) or defer their Tack', () => {
    for (const job of JOBS.filter(j => j.trade === 'Welding')) {
      const stages = seededWorkflow(job).stages;
      expect(stages.filter(s => s.signed && !s.required).map(s => s.id)).withContext(job.id).toEqual([]);
      expect(stages.find(s => s.id === 'fit')?.signoffInputs['deferTack'] ?? '').withContext(job.id).not.toBe('yes');
    }
  });

  it('leaving the page discards what was typed on an unsigned stage', () => {
    const job = weldingJob();
    const opened = store.workflowFor(job)();
    const snapshot = { fabricationData: { ...opened.fabricationData }, stages: Object.fromEntries(opened.stages.map(s => [s.id, s])) };
    service.updateStageSignoff(job, 'pre-fit', { signoffInputs: { comments: 'typed, never signed' } }, { action: 'x' });
    store.update(job, wf => discardUnsignedEdits(wf, snapshot));

    expect(store.workflowFor(job)().stages.find(s => s.id === 'pre-fit')?.signoffInputs['comments']).toBeUndefined();
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

  it('Fit-Up Insp UNSAT routes back to Fit: Fit onward comes up blank, records and Pre-Fit kept, fit-up data blanked', () => {
    const job = weldingJob({ nInd: '1' });   // pulls in Pre-Fit
    store.update(job, wf => ({ ...wf, fabricationData: { ...wf.fabricationData, specificLocation: 'Bay 3' } }));
    for (const id of ['pre-fit', 'fit', 'tack']) service.signStage(job, id);
    store.update(job, wf => ({ ...wf, stages: wf.stages.map(s => s.id === 'fitup-insp' ? { ...s, result: 'unsat' } : s) }));

    service.signStage(job, 'fitup-insp');

    const wf = store.workflowFor(job)();
    const stage = (id: string) => wf.stages.find(s => s.id === id)!;
    expect(stage('pre-fit').signed).toBeTrue();
    for (const id of ['fit', 'tack', 'fitup-insp']) {
      expect(stage(id).signed).withContext(id).toBeFalse();
      expect(stage(id).signoffRecords.at(-1)?.action).withContext(id).toBe('signed');
    }
    expect(stage('fitup-insp').result).toBeNull();
    expect(stage('fitup-insp').inputs['releaseToWelding']).toBe('yes');
    expect(wf.fabricationData['specificLocation']).toBe('');
    const entry = wf.history.find(h => h.section === 'Routing')!;
    expect(entry.action).toBe('Fit-Up Insp - Routed back to Fit');
    expect(entry.fabInputs?.some(i => i.value === 'Bay 3')).toBeTrue();
  });

  it('on an NDT reject, inserts a Repair stage right after the rejected NDT stage', () => {
    const job = weldingJob({ ndtRoot: 'UT' });   // NDT Root = UT pulls in the root-ndt-utrt stage
    store.update(job, wf => ({
      ...wf,
      stages: wf.stages.map(s => s.id === 'root-ndt-utrt' ? { ...s, result: 'unsat' } : s),
    }));

    service.signStage(job, 'root-ndt-utrt');

    const stages = store.workflowFor(job)().stages;
    const ndtIdx = stages.findIndex(s => s.id === 'root-ndt-utrt');
    expect(stages[ndtIdx + 1]?.id).toBe('repair');
  });

  describe('repeated repairs', () => {
    const patch = (job: Job, id: string, p: Record<string, unknown>) =>
      store.update(job, wf => ({ ...wf, stages: wf.stages.map(s => s.id === id ? { ...s, ...p } : s) }));
    const failNdt = (job: Job, id: string) => { patch(job, id, { result: 'unsat' }); service.signStage(job, id); };
    const signRepair = (job: Job, id: string, repairType: string) => {
      const st = store.workflowFor(job)().stages.find(s => s.id === id)!;
      patch(job, id, { inputs: { ...st.inputs, repairType } });
      service.signStage(job, id);
    };
    const ids = (job: Job) => store.workflowFor(job)().stages.map(s => s.id);
    const stage = (job: Job, id: string) => store.workflowFor(job)().stages.find(s => s.id === id)!;

    it('every NDT reject adds a new Repair, and earlier rounds stay signed', () => {
      const job = weldingJob({ ndtRoot: 'UT' });
      failNdt(job, 'root-ndt-utrt');
      signRepair(job, 'repair', 'grind');
      failNdt(job, 'root-ndt-utrt');

      expect(ids(job).filter(id => id.startsWith('repair'))).toEqual(['repair-2', 'repair']);
      expect(stage(job, 'repair-2').label).toBe('Repair 2');
      expect(stage(job, 'repair-2').signed).toBeFalse();
      expect(stage(job, 'repair').signed).toBeTrue();
    });

    it("a later round's Weld Repair adds its own Excavation NDT, whose UNSAT goes back to that round's Repair", () => {
      const job = weldingJob({ ndtRoot: 'UT' });
      failNdt(job, 'root-ndt-utrt');
      signRepair(job, 'repair', 'grind');
      failNdt(job, 'root-ndt-utrt');
      signRepair(job, 'repair-2', 'weld-repair');

      const exc = stage(job, 'excavation-ndt-2');
      expect(exc.rejectToStage).toBe('repair-2');
      expect(ids(job).indexOf('excavation-ndt-2')).toBe(ids(job).indexOf('repair-2') + 1);

      failNdt(job, 'excavation-ndt-2');
      expect(stage(job, 'repair-2').signed).toBeFalse();
      expect(stage(job, 'repair-2').inputs['repairType']).toBeUndefined();
      expect(stage(job, 'repair-2').inputs['originStageId']).toBe('root-ndt-utrt');
      expect(stage(job, 'excavation-ndt-2').signed).toBeFalse();
      expect(ids(job).some(id => id === 'repair-3')).toBeFalse();

      /* Weld Repair again: the same Excavation NDT is required again */
      signRepair(job, 'repair-2', 'weld-repair');
      expect(stage(job, 'excavation-ndt-2').required).toBeTrue();
      expect(ids(job).filter(id => id.startsWith('excavation-ndt')).length).toBe(1);
    });

    it('Cut starts the joint over from Fit: nothing re-opened, records kept, Refit # up by one', () => {
      const job = weldingJob({ ndtRoot: 'UT' });
      for (const id of ['pre-fit', 'fit', 'tack', 'fitup-insp', 'root-weld']) service.signStage(job, id);
      failNdt(job, 'root-ndt-utrt');
      signRepair(job, 'repair', 'grind');
      failNdt(job, 'root-ndt-utrt');
      signRepair(job, 'repair-2', 'cut');

      for (const id of ['fit', 'tack', 'fitup-insp', 'root-weld', 'root-ndt-utrt']) {
        expect(stage(job, id).signed).withContext(id).toBeFalse();
      }
      for (const id of ['fit', 'tack', 'fitup-insp', 'root-weld', 'root-ndt-utrt']) {
        expect(stage(job, id).signoffRecords.every(r => r.action === 'signed')).withContext(id).toBeTrue();
      }
      expect(stage(job, 'fit').signoffRecords.length).toBe(1);   /* the first fit's record is kept */
      expect(stage(job, 'pre-fit').signed).toBeTrue();
      expect(stage(job, 'repair').signed).toBeTrue();
      expect(stage(job, 'repair-2').signed).toBeTrue();

      const wf = store.workflowFor(job)();
      expect(wf.refitNumber).toBe('01');
      expect(job.refitNumber).toBe('01');
      expect(wf.history.some(h => h.section === 'Refit' && h.to === 'Refit 01')).toBeTrue();
    });

    it('Cut resets fit-up data and keeps what it was on the Refit History entry', () => {
      const job = weldingJob({ ndtRoot: 'UT' });
      store.update(job, wf => ({ ...wf, fabricationData: { ...wf.fabricationData, specificLocation: 'Bay 3' } }));
      failNdt(job, 'root-ndt-utrt');
      signRepair(job, 'repair', 'cut');

      const wf = store.workflowFor(job)();
      expect(wf.fabricationData['specificLocation']).toBe('');
      const refit = wf.history.find(h => h.section === 'Refit')!;
      expect(refit.fabInputs?.some(i => i.value === 'Bay 3')).toBeTrue();
    });

    it('Repair # goes up with each repair', () => {
      const job = weldingJob({ ndtRoot: 'UT' });
      failNdt(job, 'root-ndt-utrt');
      expect(job.repairNumber).toBe('01');
      signRepair(job, 'repair', 'grind');
      failNdt(job, 'root-ndt-utrt');
      expect(job.repairNumber).toBe('02');
      expect(store.workflowFor(job)().repairNumber).toBe('02');
    });

    it('PT on austenitic material: Excavation NDT SAT goes back to that phase VT/5X with 5X allowed', () => {
      const job = weldingJob({ ndtRoot: 'PT', materialType1: '12-SS304' });
      patch(job, 'root-ndt-mtpt', { inspectionType: 'pt' });
      failNdt(job, 'root-ndt-mtpt');
      signRepair(job, 'repair', 'weld-repair');
      patch(job, 'excavation-ndt', { result: 'sat' });
      service.signStage(job, 'excavation-ndt');

      const vt = stage(job, 'root-ndt-vt5x');
      expect(vt.signed).toBeFalse();
      expect(vt.routingOptions?.map(o => o.value)).toEqual(['vt', '5x']);
      expect(vt.inspectionType).toBe('5x');
    });

    it('Grind Only on Layer goes back to the Layer NDT that failed', () => {
      const job = weldingJob({ ndtEach: 'MT' });
      failNdt(job, 'layer-ndt-mtpt');
      signRepair(job, 'repair', 'grind');
      const ndt = stage(job, 'layer-ndt-mtpt');
      expect(ndt.signed).toBeFalse();
      expect(ndt.result).toBeNull();
      expect(ndt.signoffRecords.at(-1)?.action).toBe('signed');
      expect(stage(job, 'repair').signed).toBeTrue();
      expect(store.workflowFor(job)().history.some(h => h.section === 'Routing' && h.to === ndt.label)).toBeTrue();
    });

    it('Deprogress undoes what the signoff triggered: an NDT UNSAT loses its Repair and Repair #', () => {
      const job = weldingJob({ ndtRoot: 'UT' });
      failNdt(job, 'root-ndt-utrt');
      expect(ids(job)).toContain('repair');
      TestBed.inject(RoutingService).deprogress(job, 'wrong result');
      expect(ids(job)).not.toContain('repair');
      expect(job.repairNumber || '').toBe('');
      const ndt = stage(job, 'root-ndt-utrt');
      expect(ndt.signed).toBeFalse();
      expect(ndt.result).toBeNull();
      expect(ndt.signoffRecords.map(r => r.action)).toEqual(['signed', 'deprogressed']);
    });

    it('Deprogress of a Cut brings back the earlier signoffs, fit-up data and Refit #; the Repair comes up blank', () => {
      const job = weldingJob({ ndtRoot: 'UT' });
      store.update(job, wf => ({ ...wf, fabricationData: { ...wf.fabricationData, specificLocation: 'Bay 3' } }));
      for (const id of ['fit', 'tack', 'fitup-insp', 'root-weld']) service.signStage(job, id);
      failNdt(job, 'root-ndt-utrt');
      signRepair(job, 'repair', 'cut');
      TestBed.inject(RoutingService).deprogress(job, 'not a cut');

      for (const id of ['fit', 'tack', 'fitup-insp', 'root-weld', 'root-ndt-utrt']) {
        expect(stage(job, id).signed).withContext(id).toBeTrue();
      }
      expect(stage(job, 'repair').signed).toBeFalse();
      expect(stage(job, 'repair').inputs['repairType']).toBeUndefined();
      expect(store.workflowFor(job)().fabricationData['specificLocation']).toBe('Bay 3');
      expect(job.refitNumber || '').toBe('');
    });
  });

  describe('NDT steps follow the Joint Details NDT and RT values', () => {
    const ndtStages = (job: Job, phase: string) =>
      store.workflowFor(job)().stages.filter(s => s.id.startsWith(`${phase}-ndt-`));
    const summary = (job: Job, phase: string) =>
      ndtStages(job, phase).map(s => `${s.id}:${(s.routingOptions ?? []).map(o => o.value).join('/')}`);

    it('VT is always required: a VT value gives only the VT step, locked to VT', () => {
      expect(summary(weldingJob({ ndtEach: 'VT' }), 'layer')).toEqual(['layer-ndt-vt5x:vt']);
    });

    it('5X replaces VT', () => {
      const [st] = ndtStages(weldingJob({ ndtRoot: '5X' }), 'root');
      expect(st.routingOptions?.map(o => o.value)).toEqual(['5x']);
      expect(st.inspectionType).toBe('5x');
    });

    it('MT adds the MT/PT step locked to MT, after VT', () => {
      const job = weldingJob({ ndtEach: 'MT' });
      expect(summary(job, 'layer')).toEqual(['layer-ndt-vt5x:vt', 'layer-ndt-mtpt:mt']);
      expect(ndtStages(job, 'layer')[1].inspectionType).toBe('mt');
    });

    it('MT/PT leaves the inspector to choose', () => {
      const job = weldingJob({ ndtFinal: 'MT/PT' });
      expect(summary(job, 'final')).toEqual(['final-ndt-vt5x:vt', 'final-ndt-mtpt:mt/pt']);
      expect(ndtStages(job, 'final')[1].inspectionType).toBe('');
    });

    it('UT adds the UT/RT step locked to UT', () => {
      expect(summary(weldingJob({ ndtRoot: 'UT' }), 'root')).toEqual(['root-ndt-vt5x:vt', 'root-ndt-utrt:ut']);
    });

    it('an RT degree adds the UT/RT step locked to RT; NA does not', () => {
      expect(summary(weldingJob({ ndtRoot: 'MT', rtRoot: '100' }), 'root'))
        .toEqual(['root-ndt-vt5x:vt', 'root-ndt-mtpt:mt', 'root-ndt-utrt:rt']);
      expect(summary(weldingJob({ ndtFinal: 'VT', rtFinal: 'NA' }), 'final')).toEqual(['final-ndt-vt5x:vt']);
    });

    it('the general NDT field no longer changes anything', () => {
      expect(summary(weldingJob({ ndt: 'VT + UT + MT', ndtRoot: 'VT' }), 'root')).toEqual(['root-ndt-vt5x:vt']);
    });
  });

  it('Records Review UNSAT is recorded but the joint stays in Records Review', () => {
    const job = weldingJob();
    store.update(job, wf => ({ ...wf, stages: wf.stages.map(s => s.id === 'review-o04' ? { ...s, result: 'unsat' } : s) }));
    service.signStage(job, 'review-o04');
    const review = store.workflowFor(job)().stages.find(s => s.id === 'review-o04')!;
    expect(review.signed).toBeFalse();
    expect(review.signoffRecords.at(-1)?.result).toBe('unsat');
    expect(store.workflowFor(job)().stages.find(s => s.id === 'final-ndt-vt5x')?.signed).toBeFalse();
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
