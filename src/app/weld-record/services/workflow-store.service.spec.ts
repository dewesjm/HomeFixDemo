import { TestBed } from '@angular/core/testing';
import { STORAGE } from '../../data/storage-keys';
import { addTestJob, Job } from '../../data/jobs';
import { WorkflowStore } from './workflow-store.service';

describe('WorkflowStore', () => {
  let store: WorkflowStore;
  let job: Job;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(WorkflowStore);
    job = addTestJob('StoreTestTrade');
  });

  afterEach(() => localStorage.clear());

  it('returns the same signal instance for repeated calls on the same job', () => {
    expect(store.workflowFor(job)).toBe(store.workflowFor(job));
  });

  it('seeds a fresh job with prep + handover and no history', () => {
    const wf = store.workflowFor(job)();
    expect(wf.jobId).toBe(job.id);
    expect(wf.stages.map(s => s.id)).toEqual(['prep', 'handover']);
    expect(wf.history).toEqual([]);
  });

  it('allWorkflows reflects live (unflushed) edits, not just what was persisted', () => {
    store.update(job, wf => ({ ...wf, technician: 'Changed Tech' }));
    const found = store.allWorkflows().find(w => w.jobId === job.id);
    expect(found?.technician).toBe('Changed Tech');
  });

  it('withHistory appends a stamped entry using the routing active before the change', () => {
    const prev = store.workflowFor(job)();
    const next = store.withHistory(prev, { ...prev, technician: 'X' }, {
      section: 'Stages', who: 'Nobody', action: 'did a thing', from: 'a', to: 'b',
    });
    expect(next.history.length).toBe(prev.history.length + 1);
    const entry = next.history[next.history.length - 1];
    expect(entry.action).toBe('did a thing');
    expect(entry.routing).toBe('Prep');       // first required, unsigned stage at the time
    expect(entry.when).toBeTruthy();
  });

  it('debounces persistence: a single update is written to localStorage once, after the debounce window', () => {
    jasmine.clock().install();
    try {
      store.update(job, wf => ({ ...wf, technician: 'Persisted Tech' }));
      expect(localStorage.getItem(STORAGE.workflows)).not.toContain('Persisted Tech');
      jasmine.clock().tick(300);
      const raw = localStorage.getItem(STORAGE.workflows);
      expect(raw).toContain('Persisted Tech');
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
