import { TestBed } from '@angular/core/testing';
import { addTestJob } from '../../data/jobs';
import { EngineeringOverrideService } from './engineering-override.service';
import { WorkflowStore } from './workflow-store.service';

describe('EngineeringOverrideService', () => {
  beforeEach(() => { localStorage.clear(); TestBed.configureTestingModule({}); });

  it('keeps the values on the unsigned step and writes one History entry with the reason and each value', () => {
    const store = TestBed.inject(WorkflowStore);
    const job = addTestJob();
    const stage = store.workflowFor(job)().stages.find(s => s.fields.some(f => f.key === 'weldProcedure'))!;
    TestBed.inject(EngineeringOverrideService).record(job, stage.id, 'No values sent', { weldProcedure: 'G-1', phMin: 'NC' },
      [{ label: 'GWP', value: 'G-1' }, { label: 'PH Min', value: 'NC' }]);
    const wf = store.workflowFor(job)();
    expect(wf.stages.find(s => s.id === stage.id)!.inputs['weldProcedure']).toBe('G-1');
    const entry = wf.history.find(h => h.section === 'Engineering Override')!;
    expect(entry.to).toBe('No values sent');
    expect(entry.inputs!.map(i => i.label)).toEqual(['Reason', 'GWP', 'PH Min']);
  });
});
