import { TestBed } from '@angular/core/testing';
import { addTestJob } from '../../data/jobs';
import { ForemanOverrideService } from './foreman-override.service';
import { DeviationService } from './deviation.service';
import { WorkflowStore } from './workflow-store.service';

describe('ForemanOverrideService', () => {
  let service: ForemanOverrideService;
  let store: WorkflowStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ForemanOverrideService);
    store = TestBed.inject(WorkflowStore);
  });

  afterEach(() => localStorage.clear());

  it('logs the override and its off-list values to history without holding the joint', () => {
    const job = addTestJob('Welding');
    service.record(job, 'tack', ['Used a different GWP'], [{ kind: 'off-list', label: 'GWP', entered: 'X1', required: 'A1, A2' }]);
    const wf = store.workflowFor(job)();
    const h = wf.history.at(-1)!;
    expect(h.section).toBe('Foreman Override');
    expect(h.inputs).toEqual([
      { label: 'Override', value: 'Used a different GWP' },
      { label: 'GWP', value: 'X1 (allowed: A1, A2)' },
    ]);
    expect(TestBed.inject(DeviationService).isOnHold(wf)).toBeFalse();
  });

  it('records nothing when there are no overrides', () => {
    const job = addTestJob('Welding');
    const before = store.workflowFor(job)().history.length;
    service.record(job, 'tack', [], []);
    expect(store.workflowFor(job)().history.length).toBe(before);
  });
});
