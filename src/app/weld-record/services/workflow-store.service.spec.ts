import { TestBed } from '@angular/core/testing';
import { STORAGE } from '../../data/storage-keys';
import { addTestJob, Job } from '../../data/jobs';
import { buildStages } from '../routing/build-stages';
import { isFitupInspId } from '../routing/step-ids';
import { WorkflowStore } from './workflow-store.service';

describe('WorkflowStore', () => {
  let store: WorkflowStore;
  let job: Job;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(WorkflowStore);
    job = addTestJob();
  });

  afterEach(() => localStorage.clear());

  it('a reload keeps values that are not fields, such as Release to welding', () => {
    jasmine.clock().install();
    try {
      store.update(job, wf => ({ ...wf, stages: wf.stages.map(s => isFitupInspId(s.id) ? { ...s, inputs: { ...s.inputs, verifyMic1: 'yes' } } : s) }));
      jasmine.clock().tick(300);
    } finally {
      jasmine.clock().uninstall();
    }
    TestBed.resetTestingModule();
    const reloaded = TestBed.inject(WorkflowStore).workflowFor(job)().stages.find(s => isFitupInspId(s.id))!;
    expect(reloaded.inputs['releaseToWelding']).toBe('yes');
    expect(reloaded.inputs['verifyMic1']).toBe('yes');
  });

  it('a saved workflow from before References were named references keeps them', () => {
    const saved = { ...store.workflowFor(job)(), references: undefined, attachments: [{ id: 'a1', name: 'photo.jpg', addedBy: 'T', addedAt: '2026-01-01T00:00:00Z' }] };
    localStorage.setItem(STORAGE.workflows, JSON.stringify({ [job.id]: saved }));
    TestBed.resetTestingModule();
    const reloaded = TestBed.inject(WorkflowStore).workflowFor(job)();
    expect(reloaded.references.map(r => r.name)).toEqual(['photo.jpg']);
    expect('attachments' in reloaded).toBeFalse();
  });

  it('drops legacy field lists on load while preserving values and History snapshots', () => {
    const wf = store.workflowFor(job)();
    const fit = wf.stages.find(s => s.id === 'fit')!;
    const saved = { ...wf, stages: wf.stages.map(s => s.id === fit.id ? { ...s,
      fields: [{ key: 'old', type: 'text' }], signoffFields: [{ key: 'deferTack', type: 'text' }],
      signoffInputs: { deferTack: 'yes' },
    } : s), history: [{ when: '2026-01-01', who: 'Tester', section: 'Sign-off', action: 'Fit', routing: 'Fit', inputs: [{ label: 'Defer Tack', value: 'Yes' }] }] };
    const undo = { stageId: fit.id, historyWhen: '', stages: saved.stages, fabricationData: {}, refitNumber: '', repairNumber: '' };
    localStorage.setItem(STORAGE.workflows, JSON.stringify({ [job.id]: { ...saved, undo: [undo] } }));
    TestBed.resetTestingModule();
    const reloaded = TestBed.inject(WorkflowStore).workflowFor(job)();
    expect(reloaded.undo?.[0].stages.every(s => !('fields' in s) && !('signoffFields' in s))).toBeTrue();
    const current = reloaded.stages.find(s => s.id === fit.id)!;
    expect('fields' in current).toBeFalse();
    expect('signoffFields' in current).toBeFalse();
    expect(current.signoffInputs['deferTack']).toBe('yes');
    expect(reloaded.history[0].inputs).toEqual(saved.history[0].inputs);
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

  it('withHistory appends a stamped entry using the routing active before the change', () => {
    const prev = store.workflowFor(job)();
    const next = store.withHistory(prev, { ...prev, technician: 'X' }, {
      section: 'Stages', who: 'Nobody', action: 'did a thing', from: 'a', to: 'b',
    });
    expect(next.history.length).toBe(prev.history.length + 1);
    const entry = next.history[next.history.length - 1];
    expect(entry.action).toBe('did a thing');
    expect(entry.routing).toBe('Pre-Fit');       // first required, unsigned stage at the time
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
