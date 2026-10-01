import { TestBed } from '@angular/core/testing';
import { JOBS } from '../../data/jobs';
import { gwpOptionsForMaterials, getProcedureByGwpWtn } from '../../data/procedures';
import { isEngineeringEntryJoint } from '../../data/weld-assignment';
import { detectDeviations } from '../../data/deviations';
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
    const job = JOBS.find(j => !isEngineeringEntryJoint(j) && gwpOptionsForMaterials(j.materialType1 ?? '', j.materialType2 ?? '').length)!;
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

  it('leaves an engineering override joint blank and keeps what is typed, with nothing off-list', () => {
    const job = JOBS.find(j => isEngineeringEntryJoint(j) && store.workflowFor(j)().stages.some(s => !s.signed && s.fields.some(f => f.key === 'weldProcedure')))!;
    service.applyAll(job);
    const stage = store.workflowFor(job)().stages.find(s => !s.signed && s.fields.some(f => f.key === 'weldProcedure'))!;
    expect(stage.engineeringEntry).toBeTrue();
    expect(stage.inputs['weldProcedure']).toBe('');
    expect(stage.inputs['phMin']).toBe('');
    store.update(job, wf => ({ ...wf, stages: wf.stages.map(s => s.id === stage.id
      ? { ...s, inputs: { ...s.inputs, weldProcedure: 'TYPED-1', wtn: 'TYPED-WTN', fillerMetalType: 'ANY' } } : s) }));
    service.applyAll(job);
    const after = store.workflowFor(job)().stages.find(s => s.id === stage.id)!;
    expect(after.inputs['weldProcedure']).toBe('TYPED-1');
    const keys = new Set(after.fields.map(f => f.key));
    expect(detectDeviations(after, keys, [], { type1: job.materialType1 ?? '', type2: job.materialType2 ?? '' })
      .filter(d => d.kind === 'off-list')).toEqual([]);
  });
});
