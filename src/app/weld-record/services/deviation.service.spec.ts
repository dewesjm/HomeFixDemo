import { TestBed } from '@angular/core/testing';
import { addTestJob, Job, JOBS } from '../../data/jobs';
import { SignoffService } from './signoff.service';
import { DeviationService } from './deviation.service';
import { RoutingService } from './routing.service';
import { WorkflowStore } from './workflow-store.service';
import { activeStageId, isStageLocked, seededWorkflow, DeviationItem } from '../../data/workflow';

function weldingJob(): Job {
  const job = addTestJob();
  Object.assign(job, { ndt: '', ndtRoot: '', ndtEach: '', ndtFinal: '', jointDesign: '', sfff: '', dssAaa: '', ss: '' });
  return job;
}

const ITEM: DeviationItem = { kind: 'out-of-range', label: 'Actual PH Max', entered: '140', required: '50 to 125' };

describe('DeviationService', () => {
  let service: DeviationService;
  let store: WorkflowStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeviationService);
    store = TestBed.inject(WorkflowStore);
  });

  afterEach(() => localStorage.clear());

  it('records an open deviation, logs it to history and holds the joint', () => {
    const job = addTestJob();
    expect(service.isOnHold(store.workflowFor(job)())).toBeFalse();
    service.record(job, 'tack', [{ kind: 'out-of-range', label: 'Actual PH Min', entered: '40', required: '50 to 300' }], 'Heater failed');
    const wf = store.workflowFor(job)();
    expect(service.openDeviations(wf).length).toBe(1);
    expect(wf.deviations![0]).toEqual(jasmine.objectContaining({ stageId: 'tack', reason: 'Heater failed', status: 'open' }));
    expect(service.isOnHold(wf)).toBeTrue();
    const h = wf.history.at(-1)!;
    expect(h.section).toBe('Deviation');
    expect(h.inputs?.[0]).toEqual({ label: 'Reason', value: 'Heater failed' });
  });

  it('records nothing when there are no items', () => {
    const job = addTestJob();
    service.record(job, 'tack', [], 'n/a');
    expect(service.isOnHold(store.workflowFor(job)())).toBeFalse();
  });
});

describe('Engineering Hold (deviations)', () => {
  let signoff: SignoffService;
  let deviations: DeviationService;
  let routing: RoutingService;
  let store: WorkflowStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    signoff = TestBed.inject(SignoffService);
    deviations = TestBed.inject(DeviationService);
    routing = TestBed.inject(RoutingService);
    store = TestBed.inject(WorkflowStore);
  });
  afterEach(() => localStorage.clear());

  /* Fit signed, then Tack signed with an accepted deviation */
  function holdAtTack(job: Job) {
    signoff.signStage(job, 'fit');
    deviations.record(job, 'tack', [ITEM], 'measured late');
    signoff.signStage(job, 'tack', undefined, true);
  }

  it('a sign-off with a deviation puts the joint on Engineering Hold, right after that step', () => {
    const job = weldingJob();
    holdAtTack(job);
    const stages = store.workflowFor(job)().stages;
    const ids = stages.map(s => s.id);
    expect(ids[ids.indexOf('tack') + 1]).toBe('engineering-hold');
    expect(activeStageId(stages)).toBe('engineering-hold');
    expect(isStageLocked(stages, ids.indexOf('fitup-insp'))).toBeTrue();
    expect(store.workflowFor(job)().deviations![0].holdStageId).toBe('engineering-hold');
  });

  it('Engineering setting the routing forward: hold signed with the comments, joint carries on, history kept', () => {
    const job = weldingJob();
    holdAtTack(job);
    const before = store.workflowFor(job)().history.length;
    deviations.disposition(job, 'Accepted as is', 'fitup-insp');
    const wf = store.workflowFor(job)();
    const hold = wf.stages.find(s => s.id === 'engineering-hold')!;
    expect(hold.signed).toBeTrue();
    expect(hold.inputs['comments']).toBe('Accepted as is');
    expect(hold.signoffRecords.at(-1)?.who).toBe('Engineering');
    expect(wf.deviations![0].status).toBe('dispositioned');
    expect(wf.deviations![0].disposition?.routeToLabel).toBe('Fit-Up Insp');
    expect(activeStageId(wf.stages)).toBe('fitup-insp');
    expect(wf.history.length).toBe(before + 2);
    expect(wf.history.some(h => h.section === 'Deviation' && h.action.includes('Deviation created'))).toBeTrue();
    expect(wf.history.at(-2)?.action).toBe('Tack - Deviation dispositioned');
    expect(wf.history.at(-1)?.action).toBe('Routing set to Fit-Up Insp (Engineering)');
    expect(wf.history.at(-1)?.routing).toBe('Engineering Hold');
    expect(deviations.isOnHold(wf)).toBeFalse();
  });

  it('Engineering setting the routing back: that step comes up blank, records and the hold stay', () => {
    const job = weldingJob();
    holdAtTack(job);
    deviations.disposition(job, 'Redo the tack', 'tack');
    const wf = store.workflowFor(job)();
    const tack = wf.stages.find(s => s.id === 'tack')!;
    expect(activeStageId(wf.stages)).toBe('tack');
    expect(tack.signed).toBeFalse();
    expect(tack.signoffRecords.length).toBe(1);
    expect(wf.stages.find(s => s.id === 'engineering-hold')!.signed).toBeTrue();
    expect(wf.history.at(-1)?.action).toBe('Routed back to Tack (Engineering)');
    /* signing Tack again goes on to Fit-Up Insp, not back to the old hold */
    signoff.signStage(job, 'tack');
    expect(activeStageId(store.workflowFor(job)().stages)).toBe('fitup-insp');
  });

  it('deprogressing the deviation sign-off removes the hold and withdraws the deviation', () => {
    const job = weldingJob();
    holdAtTack(job);
    routing.deprogress(job);
    const wf = store.workflowFor(job)();
    expect(wf.stages.some(s => s.id === 'engineering-hold')).toBeFalse();
    expect(wf.deviations![0].status).toBe('withdrawn');
    expect(wf.stages.find(s => s.id === 'tack')!.signed).toBeFalse();
  });

  it('a few seeded joints wait on Engineering Hold', () => {
    const held = JOBS.map(j => seededWorkflow(j)).filter(wf => wf.deviations?.some(d => d.status === 'open'));
    expect(held.length).toBeGreaterThanOrEqual(2);
    expect(held.length).toBeLessThanOrEqual(8);
    for (const wf of held) expect(activeStageId(wf.stages)).withContext(wf.jobId).toBe('engineering-hold');
  });
});

describe('Engineering Hold from a reject rule (PT failure on a GMAW weld)', () => {
  let signoff: SignoffService;
  let deviations: DeviationService;
  let store: WorkflowStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    signoff = TestBed.inject(SignoffService);
    deviations = TestBed.inject(DeviationService);
    store = TestBed.inject(WorkflowStore);
  });
  afterEach(() => localStorage.clear());

  /* Root welded with `process`, then Root NDT MT/PT signed PT and UNSAT */
  function ptFailure(process: string) {
    const job = addTestJob();
    Object.assign(job, { ndt: '', ndtRoot: 'PT', ndtEach: '', ndtFinal: '', jointDesign: '', sfff: '', dssAaa: '', ss: '' });
    store.update(job, wf => ({ ...wf, stages: wf.stages.map(s =>
      s.id === 'root-weld' ? { ...s, inputs: { ...s.inputs, weldProcess: process } }
      : s.id === 'root-ndt-mtpt' ? { ...s, inspectionType: 'pt', result: 'unsat' } : s) }));
    signoff.signStage(job, 'root-weld');
    signoff.signStage(job, 'root-ndt-mtpt');
    return job;
  }

  it('goes to Engineering Hold instead of Repair, with the reason kept on the hold', () => {
    const job = ptFailure('gmaw');
    const stages = store.workflowFor(job)().stages;
    expect(activeStageId(stages)).toBe('engineering-hold');
    expect(stages.some(s => s.id === 'repair')).toBeFalse();
    expect(stages.find(s => s.id === 'engineering-hold')!.inputs['holdReason'])
      .toBe('Root NDT MT/PT was UNSAT (Type is PT, and Root: Weld Process is GMAW)');
  });

  it('any other weld process still adds a Repair', () => {
    const job = ptFailure('smaw');
    expect(activeStageId(store.workflowFor(job)().stages)).toBe('repair');
  });

  it('Engineering releases it without a deviation; the joint carries on from the chosen step', () => {
    const job = ptFailure('gmaw');
    deviations.disposition(job, 'Re-weld the root', 'root-weld');
    const wf = store.workflowFor(job)();
    expect(wf.stages.find(s => s.id === 'engineering-hold')!.signed).toBeTrue();
    expect(activeStageId(wf.stages)).toBe('root-weld');
    expect(wf.history.at(-2)?.action).toBe('Engineering Hold - Signed off');
    expect(wf.history.at(-1)?.action).toBe('Routed back to Root (Engineering)');
  });

  it('at least one seeded joint waits on a PT-failure hold', () => {
    const held = JOBS.map(j => seededWorkflow(j)).filter(wf => wf.stages.some(s => s.id === 'engineering-hold' && s.inputs['holdReason']));
    expect(held.length).toBeGreaterThanOrEqual(1);
    expect(held.length).toBeLessThanOrEqual(6);
    for (const wf of held) {
      expect(activeStageId(wf.stages)).withContext(wf.jobId).toBe('engineering-hold');
      expect(wf.stages.find(s => s.id === 'engineering-hold')!.inputs['holdReason']).withContext(wf.jobId).toContain('Type is PT');
    }
  });
});
