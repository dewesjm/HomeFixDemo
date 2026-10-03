import { TestBed } from '@angular/core/testing';
import { addTestJob, Job } from '../../data/jobs';
import { FabricationDataService } from './fabrication-data.service';
import { WorkflowStore } from './workflow-store.service';
import { setShipLocations } from '../../data/ship-locations';

describe('FabricationDataService', () => {
  let service: FabricationDataService;
  let store: WorkflowStore;
  let job: Job;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(FabricationDataService);
    store = TestBed.inject(WorkflowStore);
    job = addTestJob();
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
    /* a Welding job starts with seeded fabrication data, so the first old value is whatever was seeded */
    const seeded = store.workflowFor(job)().fabricationData['weldMemo'] || '-';
    service.setFabricationData(job, 'weldMemo', 'M-1');
    service.setFabricationData(job, 'weldMemo', 'M-2');
    const wf = store.workflowFor(job)();
    const entries = wf.history.filter(h => h.section === 'Fabrication' && h.action === 'weldMemo');
    expect(entries.length).toBe(2);
    expect(entries[0].from).toBe(seeded);
    expect(entries[0].to).toBe('M-1');
    expect(entries[1].from).toBe('M-1');
    expect(entries[1].to).toBe('M-2');
  });

  it('blanks a Frame/Usage the new Deck no longer offers, and keeps one it still does', () => {
    setShipLocations([
      { hull: job.hull, deck: 'D1', frame: 'F10', pscl: 'P', usage: 'Tank' },
      { hull: job.hull, deck: 'D2', frame: 'F10', pscl: 'P', usage: 'Tank' },
      { hull: job.hull, deck: 'D3', frame: 'F20', pscl: 'P', usage: 'Cargo' },
    ]);
    for (const [k, v] of [['location', 'ship'], ['deck', 'D1'], ['frame', 'F10'], ['pscl', 'P'], ['usage', 'Tank']]) {
      service.setFabricationData(job, k, v);
    }
    service.setFabricationData(job, 'deck', 'D2');
    let fab = store.workflowFor(job)().fabricationData;
    expect(fab['frame']).toBe('F10');
    expect(fab['usage']).toBe('Tank');

    service.setFabricationData(job, 'deck', 'D3');
    fab = store.workflowFor(job)().fabricationData;
    expect(fab['frame']).toBe('');
    expect(fab['usage']).toBe('');
    const cleared = store.workflowFor(job)().history.filter(h => h.section === 'Fabrication' && h.to === '-');
    expect(cleared.map(h => h.action)).toEqual(['frame', 'usage']);
  });
});
