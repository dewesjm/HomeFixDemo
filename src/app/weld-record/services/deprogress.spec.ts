/* Deprogress (RoutingService.deprogress): reverses the joint's most recent signoff and everything it did, one
   signoff at a time, keeps every History entry and leaves Corrections on earlier signoffs alone. The single-signoff
   cases (NDT UNSAT -> Repair, Cut, self return, Root's additional signoff, deviation hold, inserted routings)
   are in signoff.service.spec, deviation.service.spec and the routing-logic specs. */
import { TestBed } from '@angular/core/testing';
import { Job, JOBS } from '../../data/jobs';
import { SignoffService } from './signoff.service';
import { RoutingService } from './routing.service';
import { DeviationService } from './deviation.service';
import { WorkflowStore } from './workflow-store.service';
import { JobWorkflow, WorkflowStage } from '../model/workflow-types';
import { activeStageId } from '../routing-logic/current-routing';
import { deprogressableKey, historyRows } from '../history-page/rules/history-rows';
import { getSignoffTypes, setSignoffTypes } from '../../data/signoff-types';
import { typeValues } from '../signoff-forms-logic/stage-rules';
import { useFixedClock } from '../../testing/test-job';

/* same minimal pipeline as signoff.service.spec: pre-fit, fit, tack, fitup-insp, root-weld, VT per phase,
   layer, final, review-o04, sold */
function weldingJob(overrides: Partial<Job> = {}): Job {
  const job = { ...JOBS[0], id: 'deprogress-test', _fresh: true, refitNumber: '', repairNumber: '' };
  Object.assign(job, { nInd: '3', ndt: '', ndtRoot: '', ndtEach: '', ndtFinal: '', rtRoot: '', rtFinal: '', ut: '', jointDesign: 'C-18', sfff: '', dssAaa: '', ss: 'SS', attributeCode1: '', attributeCode2: '', attributeCode3: '', attributeCode4: '', ...overrides });
  return job;
}

describe('Deprogress', () => {
  /* each action a second apart: History finds a signoff's row by its time */
  useFixedClock();
  const later = () => jasmine.clock().tick(1000);
  let signoff: SignoffService;
  let routing: RoutingService;
  let store: WorkflowStore;

  beforeEach(() => {
    localStorage.clear();
    setSignoffTypes(getSignoffTypes());
    TestBed.configureTestingModule({});
    signoff = TestBed.inject(SignoffService);
    routing = TestBed.inject(RoutingService);
    store = TestBed.inject(WorkflowStore);
  });
  afterEach(() => { localStorage.clear(); setSignoffTypes(getSignoffTypes()); });

  const wf = (job: Job) => store.workflowFor(job)();
  const stage = (job: Job, id: string) => wf(job).stages.find(s => s.id === id)!;
  const current = (job: Job) => activeStageId(wf(job).stages);
  const patch = (job: Job, id: string, p: Partial<WorkflowStage>) =>
    store.update(job, w => ({ ...w, stages: w.stages.map(s => s.id === id ? { ...s, ...p } : s) }));
  /* where History offers Deprogress: the stage id of that row */
  const offeredOn = (job: Job, w: JobWorkflow = wf(job)) => {
    const rows = historyRows(w, job);
    const key = deprogressableKey(w, rows);
    return rows.find(r => r.key === key)?.stageId;
  };
  /* signs the current routing SAT with its first Type (Layer as Final Weld), as the joint page would */
  const signCurrent = (job: Job) => {
    later();
    const id = current(job)!;
    const type = id === 'root-layer' ? 'final-weld' : stage(job, id).typeOptions?.[0]?.value;
    if (type) patch(job, id, { result: 'sat', ...typeValues(type) });
    signoff.signStage(job, id);
    return id;
  };
  const signUpTo = (job: Job, id: string) => { while (current(job) !== id) signCurrent(job); };
  const failNdt = (job: Job, id: string) => {
    later();
    const type = stage(job, id).typeOptions?.[0]?.value ?? '';
    patch(job, id, { result: 'unsat', inspectionType: type, signoffType: type });
    signoff.signStage(job, id);
  };
  const signRepair = (job: Job, id: string, repairType: string) => {
    later();
    patch(job, id, { inputs: { ...stage(job, id).inputs, repairType } });
    signoff.signStage(job, id);
  };
  const deprogress = (job: Job, reason: string) => { later(); routing.deprogress(job, reason); };

  it('several in a row walk back one signoff each, newest first, then there is nothing left to deprogress', () => {
    const job = weldingJob();
    const signed = [signCurrent(job), signCurrent(job), signCurrent(job)];
    expect(signed).toEqual(['pre-fit', 'fit', 'tack']);

    for (const id of [...signed].reverse()) {
      expect(offeredOn(job)).withContext(`offered on ${id}`).toBe(id);
      deprogress(job, `undo ${id}`);
      expect(stage(job, id).signed).withContext(id).toBeFalse();
      expect(current(job)).withContext(`current after undoing ${id}`).toBe(id);
    }
    expect(wf(job).undo).toEqual([]);
    expect(offeredOn(job)).toBeUndefined();

    const historyBefore = wf(job).history.length;
    deprogress(job, 'nothing to undo');
    expect(wf(job).history.length).toBe(historyBefore);

    const actions = wf(job).history.filter(h => h.section === 'Sign-off').map(h => h.action);
    expect(actions.filter(a => a.endsWith('Signed off')).length).toBe(3);
    expect(actions.filter(a => /Deprogressed: undo /.test(a)).length).toBe(3);
  });

  it('the deprogressed routing and every routing after it come up blank; earlier signoffs keep their values', () => {
    const job = weldingJob();
    patch(job, 'pre-fit', { inputs: { ppe: 'gloves' } });
    signCurrent(job);
    signCurrent(job);
    patch(job, 'tack', { inputs: { ...stage(job, 'tack').inputs, tackNote: 'typed, not signed' } });
    deprogress(job, 'wrong Fit');
    expect(stage(job, 'fit').signed).toBeFalse();
    expect(stage(job, 'fit').signedAt).toBeFalsy();
    expect(stage(job, 'tack').inputs['tackNote']).toBeUndefined();
    expect(stage(job, 'pre-fit').signed).toBeTrue();
    expect(stage(job, 'pre-fit').inputs['ppe']).toBe('gloves');
  });

  it('a Correction made after a signoff survives deprogressing a later one', () => {
    const job = weldingJob();
    patch(job, 'pre-fit', { inputs: { ppe: 'gloves' } });
    signCurrent(job);
    later();
    signoff.correctStage(job, 'pre-fit', { inputs: { ppe: 'boots' } }, 'typo');
    expect(stage(job, 'pre-fit').inputs['ppe']).toBe('boots');
    signCurrent(job);
    deprogress(job, 'wrong Fit');
    expect(stage(job, 'pre-fit').signed).toBeTrue();
    expect(stage(job, 'pre-fit').inputs['ppe']).toBe('boots');
    expect(offeredOn(job)).toBe('pre-fit');
  });

  it('Defer Tack: deprogressing Fit puts regular Tack back and drops Deferred Tack', () => {
    const job = weldingJob();
    signCurrent(job);
    later();
    patch(job, 'fit', { signoffInputs: { ...stage(job, 'fit').signoffInputs, deferTack: 'yes' } });
    signoff.signStage(job, 'fit');
    expect(stage(job, 'tack').required).toBeFalse();
    expect(stage(job, 'deferred-tack').required).toBeTrue();

    deprogress(job, 'tack was done');
    expect(stage(job, 'tack').required).toBeTrue();
    expect(stage(job, 'deferred-tack').required).toBeFalse();
    expect(stage(job, 'fit').signoffInputs['deferTack'] ?? '').toBe('');
    expect(current(job)).toBe('fit');
  });

  it('Fit-Up Release: deprogress takes the release back and History offers it on the release row', () => {
    const job = weldingJob();
    for (let i = 0; i < 4; i++) signCurrent(job);
    later();
    signoff.releaseFitUp(job);
    expect(stage(job, 'fitup-release').signed).toBeTrue();
    const release = wf(job).history.at(-1)!;
    expect(release.section).toBe('Release');
    const rows = historyRows(wf(job), job);
    expect(rows.find(r => r.key === deprogressableKey(wf(job), rows))?.action).toBe('Fit-Up Release - Released to Welding');

    deprogress(job, 'not ready');
    expect(stage(job, 'fitup-release').signed).toBeFalse();
    expect(stage(job, 'fitup-insp').signed).toBeTrue();
    expect(wf(job).history.at(-1)!.action).toBe('Fit-Up Release - Deprogressed: not ready');
  });

  it('Grind Only: deprogressing the Repair brings the joint back to that Repair, the UNSAT NDT stays on record', () => {
    const job = weldingJob({ ndtRoot: 'UT' });
    signUpTo(job, 'root-ndt-utrt');
    failNdt(job, 'root-ndt-utrt');
    signRepair(job, 'repair', 'grind');
    expect(current(job)).toBe('root-ndt-utrt');
    expect(job.repairNumber).toBe('01');

    deprogress(job, 'it was a weld repair');
    expect(current(job)).toBe('repair');
    expect(stage(job, 'repair').signed).toBeFalse();
    expect(stage(job, 'repair').inputs['repairType']).toBeUndefined();
    expect(stage(job, 'root-ndt-utrt').signed).toBeTrue();
    expect(stage(job, 'root-ndt-utrt').result).toBe('unsat');
    expect(job.repairNumber).toBe('01');

    /* and once more takes the UNSAT and its Repair away */
    deprogress(job, 'NDT was SAT');
    expect(wf(job).stages.some(s => s.id === 'repair')).toBeFalse();
    expect(current(job)).toBe('root-ndt-utrt');
    expect(job.repairNumber || '').toBe('');
  });

  it('a second Repair round: deprogress removes only that round', () => {
    const job = weldingJob({ ndtRoot: 'UT' });
    signUpTo(job, 'root-ndt-utrt');
    failNdt(job, 'root-ndt-utrt');
    signRepair(job, 'repair', 'grind');
    failNdt(job, 'root-ndt-utrt');
    expect(job.repairNumber).toBe('02');
    expect(wf(job).stages.some(s => s.id === 'repair-2')).toBeTrue();

    deprogress(job, 'second reading was wrong');
    expect(wf(job).stages.some(s => s.id === 'repair-2')).toBeFalse();
    expect(stage(job, 'repair').signed).toBeTrue();
    expect(job.repairNumber).toBe('01');
    expect(current(job)).toBe('root-ndt-utrt');
  });

  it('Sold: deprogress reopens only Sold; Records Review stays signed', () => {
    const job = weldingJob();
    for (let i = 0; i < 40 && current(job); i++) signCurrent(job);
    expect(current(job)).toBeNull();
    expect(stage(job, 'sold').signed).toBeTrue();

    deprogress(job, 'not sold yet');
    expect(current(job)).toBe('sold');
    expect(stage(job, 'review-o04').signed).toBeTrue();
  });

  it('is saved: a new store reading localStorage sees the deprogressed joint and its remaining undo', () => {
    const job = weldingJob();
    signCurrent(job);
    signCurrent(job);
    deprogress(job, 'wrong Fit');
    /* the store saves at once when the page is hidden */
    window.dispatchEvent(new Event('pagehide'));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const reloaded = TestBed.inject(WorkflowStore).workflowFor(job)();
    expect(reloaded.stages.find(s => s.id === 'fit')!.signed).toBeFalse();
    expect(reloaded.stages.find(s => s.id === 'pre-fit')!.signed).toBeTrue();
    expect(reloaded.undo?.length).toBe(1);
    expect(reloaded.history.some(h => h.action === 'Fit - Deprogressed: wrong Fit')).toBeTrue();
  });

  describe('a routing set by hand (Admin > Routing Override, Engineering release) is as far back as it goes', () => {
    /* nothing offered and nothing undone; a signoff made after it can be deprogressed, back to the routing set by hand */
    const expectFloorAt = (job: Job, routingId: string) => {
      expect(wf(job).undo).toEqual([]);
      expect(current(job)).toBe(routingId);
      expect(offeredOn(job)).toBeUndefined();
      const before = JSON.stringify(wf(job));
      deprogress(job, 'reach past it');
      expect(JSON.stringify(wf(job))).toBe(before);

      const signed = signCurrent(job);
      expect(offeredOn(job)).toBe(signed);
      deprogress(job, 'undo the new signoff');
      expect(stage(job, signed).signed).toBeFalse();
      expect(current(job)).toBe(routingId);
      expect(offeredOn(job)).toBeUndefined();
    };

    it('Routing Override forward: the signoffs before it stay signed', () => {
      const job = weldingJob();
      signUpTo(job, 'tack');
      later();
      routing.setRouting(job, 'root-weld', 'signed on paper');
      expectFloorAt(job, 'root-weld');
      expect(stage(job, 'fit').signed).toBeTrue();
    });

    it('Routing Override back', () => {
      const job = weldingJob();
      signUpTo(job, 'fitup-insp');
      later();
      routing.setRouting(job, 'fit', 'Fit redone');
      expectFloorAt(job, 'fit');
      expect(stage(job, 'pre-fit').signed).toBeTrue();
    });

    it('Engineering release of a deviation hold: the signoff that accepted the deviation stays signed', () => {
      const job = weldingJob();
      const deviations = TestBed.inject(DeviationService);
      signUpTo(job, 'tack');
      later();
      deviations.record(job, 'tack', [{ kind: 'out-of-range', label: 'Actual PH Max', entered: '140', required: '50 to 125' }], 'late');
      signoff.signStage(job, 'tack', undefined, true);
      later();
      deviations.disposition(job, 'Accepted as is', 'fitup-insp');
      expectFloorAt(job, 'fitup-insp');
      expect(stage(job, 'tack').signed).toBeTrue();
      expect(stage(job, 'engineering-hold').signed).toBeTrue();
      expect(wf(job).deviations![0].status).toBe('dispositioned');
    });
  });
});
