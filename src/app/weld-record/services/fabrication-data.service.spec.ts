import { TestBed } from '@angular/core/testing';
import { addTestJob, Job } from '../../data/jobs';
import { FabricationDataService } from './fabrication-data.service';
import { WorkflowStore } from './workflow-store.service';

describe('FabricationDataService', () => {
  let service: FabricationDataService;
  let store: WorkflowStore;
  let job: Job;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(FabricationDataService);
    store = TestBed.inject(WorkflowStore);
    job = addTestJob('FabTestTrade');
  });

  afterEach(() => localStorage.clear());

  it('sets a fabrication field without touching others', () => {
    service.setFabricationData(job, 'weldMemo', 'M-42');
    service.setFabricationData(job, 'drawingRev', 'C');
    const wf = store.workflowFor(job)();
    expect(wf.fabricationData['weldMemo']).toBe('M-42');
    expect(wf.fabricationData['drawingRev']).toBe('C');
  });

  it('logs a Fabrication history entry with the field key as the action and old/new values', () => {
    service.setFabricationData(job, 'weldMemo', 'M-1');
    service.setFabricationData(job, 'weldMemo', 'M-2');
    const wf = store.workflowFor(job)();
    const entries = wf.history.filter(h => h.section === 'Fabrication' && h.action === 'weldMemo');
    expect(entries.length).toBe(2);
    expect(entries[0].from).toBe('-');
    expect(entries[0].to).toBe('M-1');
    expect(entries[1].from).toBe('M-1');
    expect(entries[1].to).toBe('M-2');
  });
});
