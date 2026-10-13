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

  it('blanks a Frame/P-S-CL/Usage the new Deck no longer offers, and keeps one it still does', () => {
    setShipLocations([
      { hull: job.hull, deck: '1', frame: '110', pscl: '2', usage: 'L' },
      { hull: job.hull, deck: '2', frame: '110', pscl: '2', usage: 'L' },
      { hull: job.hull, deck: '3', frame: '120', pscl: '2', usage: 'Q' },
    ]);
    for (const [k, v] of [['location', 'ship'], ['deck', '1'], ['frame', '110'], ['pscl', '2'], ['usage', 'L']]) {
      service.setFabricationData(job, k, v);
    }
    service.setFabricationData(job, 'deck', '2');
    let fab = store.workflowFor(job)().fabricationData;
    expect(fab['frame']).toBe('110');
    expect(fab['pscl']).toBe('2');
    expect(fab['usage']).toBe('L');

    service.setFabricationData(job, 'deck', '3');
    fab = store.workflowFor(job)().fabricationData;
    expect(fab['frame']).toBe('');
    expect(fab['pscl']).toBe('');
    expect(fab['usage']).toBe('');
    const cleared = store.workflowFor(job)().history.filter(h => h.section === 'Fabrication' && h.to === '-');
    expect(cleared.map(h => h.action)).toEqual(['frame', 'pscl', 'usage']);
  });

  it('blanks a P/S/CL the new Frame has nothing set up on', () => {
    setShipLocations([
      { hull: job.hull, deck: '1', frame: '110', pscl: '0', usage: 'L' },
      { hull: job.hull, deck: '1', frame: '120', pscl: '2', usage: 'Q' },
    ]);
    for (const [k, v] of [['location', 'ship'], ['deck', '1'], ['frame', '110'], ['pscl', '0'], ['usage', 'L']]) {
      service.setFabricationData(job, k, v);
    }
    service.setFabricationData(job, 'frame', '120');
    const fab = store.workflowFor(job)().fabricationData;
    expect(fab['pscl']).toBe('');
    expect(fab['usage']).toBe('');
  });
});
