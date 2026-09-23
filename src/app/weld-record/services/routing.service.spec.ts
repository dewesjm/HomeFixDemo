import { TestBed } from '@angular/core/testing';
import { addTestJob, Job } from '../../data/jobs';
import { StageField } from '../../data/workflow';
import { RoutingService } from './routing.service';
import { WorkflowStore } from './workflow-store.service';

describe('RoutingService', () => {
  let service: RoutingService;
  let store: WorkflowStore;
  let job: Job;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoutingService);
    store = TestBed.inject(WorkflowStore);
    job = addTestJob('RoutingTestTrade');   // seeds a plain prep + handover pipeline
  });

  afterEach(() => localStorage.clear());

  describe('setStageInput / setStageInputs', () => {
    const ppeField: StageField = { key: 'ppe', label: 'PPE / safety', type: 'text' };

    it('records a value on the named stage and logs the change', () => {
      service.setStageInput(job, 'prep', ppeField, 'gloves, eyewear');
      const wf = store.workflowFor(job)();
      expect(wf.stages.find(s => s.id === 'prep')?.inputs['ppe']).toBe('gloves, eyewear');
      const entry = wf.history.find(h => h.section === 'Stages' && h.action.includes('PPE / safety'));
      expect(entry?.from).toBe('—');
      expect(entry?.to).toBe('gloves, eyewear');
    });

    it('does nothing when the value is unchanged (no duplicate history entry)', () => {
      service.setStageInput(job, 'prep', ppeField, 'gloves');
      const before = store.workflowFor(job)().history.length;
      service.setStageInput(job, 'prep', ppeField, 'gloves');
      expect(store.workflowFor(job)().history.length).toBe(before);
    });

    it('appends the field unit to the logged value when present', () => {
      const psi: StageField = { key: 'pressure', label: 'Pressure', type: 'number', unit: 'PSI' };
      service.setStageInput(job, 'prep', psi, '150');
      const entry = store.workflowFor(job)().history.find(h => h.action.includes('Pressure'));
      expect(entry?.to).toBe('150 PSI');
    });

    it('setStageInputs applies several field changes as a single history-logged update', () => {
      const before = store.workflowFor(job)().history.length;
      service.setStageInputs(job, 'prep', [
        { field: ppeField, value: 'gloves' },
        { field: { key: 'note', label: 'Note', type: 'text' }, value: 'ok' },
      ]);
      const wf = store.workflowFor(job)();
      expect(wf.stages.find(s => s.id === 'prep')?.inputs).toEqual({ ppe: 'gloves', note: 'ok' });
      expect(wf.history.length).toBe(before + 2);
    });
  });

  describe('forceRouting', () => {
    it('marks every stage before the target as signed/accepted and leaves the target open', () => {
      service.forceRouting(job, 1);   // stages: [prep, handover]
      const wf = store.workflowFor(job)();
      expect(wf.stages[0].signed).toBeTrue();
      expect(wf.stages[0].result).toBe('sat');
      expect(wf.stages[1].signed).toBeFalse();
    });

    it('re-opens a previously signed stage when the target moves backward', () => {
      service.forceRouting(job, 1);              // signs prep
      service.forceRouting(job, 0);               // moves target back to prep
      const wf = store.workflowFor(job)();
      expect(wf.stages[0].signed).toBeFalse();
      const reopened = wf.stages[0].signoffRecords.find(r => r.action === 'reopened');
      expect(reopened).toBeTruthy();
    });
  });

  describe('goBackRouting', () => {
    it('reopens the most recently signed stage, clearing its result and inputs', () => {
      store.update(job, wf => ({
        ...wf,
        stages: wf.stages.map(s => s.id === 'prep'
          ? { ...s, signed: true, signedAt: new Date().toISOString(), result: 'sat', inputs: { ppe: 'gloves' } }
          : s),
      }));

      service.goBackRouting(job, 'reopen for review');

      const wf = store.workflowFor(job)();
      const prep = wf.stages.find(s => s.id === 'prep')!;
      expect(prep.signed).toBeFalse();
      expect(prep.result).toBeNull();
      expect(prep.inputs).toEqual({});
      const entry = wf.history.find(h => h.action.includes('Re-opened'));
      expect(entry?.action).toContain('reopen for review');
    });

    it('is a no-op when nothing has been signed yet', () => {
      const before = store.workflowFor(job)();
      service.goBackRouting(job);
      const after = store.workflowFor(job)();
      expect(after.history.length).toBe(before.history.length);
    });
  });
});
