import { TestBed } from '@angular/core/testing';
import { JOBS } from '../../data/jobs';
import { gwpOptionsForMaterials, getProcedureByGwpWtn } from '../../data/procedures';
import { WeldAssignmentService } from './weld-assignment.service';
import { WorkflowStore } from './workflow-store.service';

describe('WeldAssignmentService', () => {
  let service: WeldAssignmentService;
  let store: WorkflowStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(WeldAssignmentService);
    store = TestBed.inject(WorkflowStore);
  });

  it('fills unsigned welding steps with a valid GWP, WTN and filler, the same every time', () => {
    const job = JOBS.find(j => gwpOptionsForMaterials(j.materialType1 ?? '', j.materialType2 ?? '').length)!;
    service.applyAll(job);
    const wf = store.workflowFor(job)();
    const stage = wf.stages.find(s => !s.signed && s.fields.some(f => f.key === 'weldProcedure'))!;
    const proc = getProcedureByGwpWtn(stage.inputs['weldProcedure'], stage.inputs['wtn'])!;
    expect(proc).toBeTruthy();
    expect(gwpOptionsForMaterials(job.materialType1!, job.materialType2!).some(o => o.value === proc.gwp)).toBeTrue();
    if (stage.inputs['consumableInsertOnly'] !== 'yes') {
      expect(proc.fillerMetalTypes).toContain(stage.inputs['fillerMetalType']);
      expect(proc.fillerMetalSizes).toContain(stage.inputs['fillerMetalSize']);
    }
    const before = { ...stage.inputs };
    service.applyAll(job);
    expect(store.workflowFor(job)().stages.find(s => s.id === stage.id)!.inputs).toEqual(before);
  });
});
