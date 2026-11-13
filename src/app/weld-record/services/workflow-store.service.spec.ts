import { TestBed } from '@angular/core/testing';
import { STORAGE } from '../../data/storage-keys';
import { Job } from '../../data/jobs';
import { buildStages } from '../routing-logic/build-stages';
import { isFitupInspId } from '../../data/welding-step-ids';
import { keepLocalStorage, testJob, useFixedClock } from '../../testing/test-job';
import { WorkflowStore } from './workflow-store.service';

describe('WorkflowStore', () => {
  let store: WorkflowStore;
  let job: Job;
  keepLocalStorage();

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(WorkflowStore);
    job = testJob({ id: 'workflow-store-test', _fresh: true, nInd: '1' });
  });

  describe('on a fixed clock', () => {
    useFixedClock('2026-01-15T12:00:00.000Z');

    it('a reload keeps values that are not fields, such as Release to welding', () => {
      store.update(job, wf => ({ ...wf, stages: wf.stages.map(s => isFitupInspId(s.id) ? { ...s, inputs: { ...s.inputs, verifyMic1: 'yes' } } : s) }));
      jasmine.clock().tick(300);
      TestBed.resetTestingModule();
      const reloaded = TestBed.inject(WorkflowStore).workflowFor(job)().stages.find(s => isFitupInspId(s.id))!;
      expect(reloaded.inputs['releaseToWelding']).toBe('yes');
      expect(reloaded.inputs['verifyMic1']).toBe('yes');
    });

    it('debounces persistence: an update is written to localStorage once the 250 ms window ends', () => {
      store.update(job, wf => ({ ...wf, technician: 'Persisted Tech' }));
      jasmine.clock().tick(249);
      expect(localStorage.getItem(STORAGE.workflows) ?? '').not.toContain('Persisted Tech');
      jasmine.clock().tick(1);
      expect(localStorage.getItem(STORAGE.workflows)).toContain('Persisted Tech');
    });

    it('withHistory stamps the entry with the current time', () => {
      const prev = store.workflowFor(job)();
      const next = store.withHistory(prev, { ...prev, technician: 'X' }, {
        section: 'Stages', who: 'Nobody', action: 'did a thing', from: 'a', to: 'b',
      });
      expect(next.history[next.history.length - 1].when).toBe('2026-01-15T12:00:00.000Z');
    });
  });

  it('returns the same signal instance for repeated calls on the same job', () => {
    expect(store.workflowFor(job)).toBe(store.workflowFor(job));
  });

  it('seeds a fresh job with its Welding routing and no history', () => {
    const wf = store.workflowFor(job)();
    expect(wf.jobId).toBe(job.id);
    expect(wf.stages.map(s => s.id)).toEqual(buildStages(job).map(s => s.id));
    expect(wf.stages[0].id).toBe('pre-fit');
    expect(wf.history).toEqual([]);
  });

  it('allWorkflows reflects live (unflushed) edits, not just what was persisted', () => {
    store.update(job, wf => ({ ...wf, technician: 'Changed Tech' }));
    const found = store.allWorkflows().find(w => w.jobId === job.id);
    expect(found?.technician).toBe('Changed Tech');
  });

  it('withHistory appends an entry using the routing active before the change', () => {
    const prev = store.workflowFor(job)();
    const next = store.withHistory(prev, { ...prev, technician: 'X' }, {
      section: 'Stages', who: 'Nobody', action: 'did a thing', from: 'a', to: 'b',
    });
    expect(next.history.length).toBe(prev.history.length + 1);
    const entry = next.history[next.history.length - 1];
    expect(entry.action).toBe('did a thing');
    expect(entry.routing).toBe('Pre-Fit');       // first required, unsigned stage at the time
  });
});
