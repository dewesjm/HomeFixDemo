import { TestBed } from '@angular/core/testing';
import { addTestJob } from '../../data/jobs';
import { DeviationService } from './deviation.service';
import { WorkflowStore } from './workflow-store.service';

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
    const job = addTestJob('Welding');
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
    const job = addTestJob('Welding');
    service.record(job, 'tack', [], 'n/a');
    expect(service.isOnHold(store.workflowFor(job)())).toBeFalse();
  });
});
