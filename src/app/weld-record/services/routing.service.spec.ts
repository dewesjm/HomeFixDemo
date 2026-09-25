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

  describe('setRoutingBack', () => {
    it('sets the routing back without marking anything signed; the target comes up blank', () => {
      store.update(job, wf => ({
        ...wf,
        stages: wf.stages.map(s => s.id === 'prep'
          ? { ...s, signed: true, signedAt: new Date().toISOString(), result: 'sat', inputs: { ppe: 'gloves' } }
          : s),
      }));
      service.setRoutingBack(job, 'prep');
      const wf = store.workflowFor(job)();
      expect(wf.stages.every(s => !s.signed)).toBeTrue();
      expect(wf.stages[0].inputs).toEqual({});
      expect(wf.stages[0].signoffRecords.some(r => r.action === 'deprogressed')).toBeFalse();
      expect(wf.history.some(h => h.section === 'Routing' && h.action.startsWith('Routed back to'))).toBeTrue();
    });
  });

  describe('deprogress', () => {
    it('reverses the most recently signed stage, clearing its result and inputs', () => {
      store.update(job, wf => ({
        ...wf,
        stages: wf.stages.map(s => s.id === 'prep'
          ? { ...s, signed: true, signedAt: new Date().toISOString(), result: 'sat', inputs: { ppe: 'gloves' } }
          : s),
      }));

      service.deprogress(job, 'wrong joint');

      const wf = store.workflowFor(job)();
      const prep = wf.stages.find(s => s.id === 'prep')!;
      expect(prep.signed).toBeFalse();
      expect(prep.result).toBeNull();
      expect(prep.inputs).toEqual({});
      expect(prep.signoffRecords.at(-1)?.action).toBe('deprogressed');
      const entry = wf.history.find(h => h.action.includes('Deprogressed'));
      expect(entry?.action).toContain('wrong joint');
    });

    it('is a no-op when nothing has been signed yet', () => {
      const before = store.workflowFor(job)();
      service.deprogress(job);
      const after = store.workflowFor(job)();
      expect(after.history.length).toBe(before.history.length);
    });
  });
});
