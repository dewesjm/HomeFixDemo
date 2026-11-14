import { formInputFields } from '../signoff-forms-logic/form-fields';
import { TestBed } from '@angular/core/testing';
import { JOBS } from '../../data/jobs';
import { getProcedure } from '../../data/procedures';
import {
  getGwpOptions, getWtnFillValue, getFillerMetalTypeOptions, getFillerMetalSizeOptions
} from '../../future/weld-engineering/procedure-service/procedure-usage';
import { isFilledByRule } from '../signoff-forms-logic/field-fill';
import { isEngineeringEntryJoint } from '../weld-assignment-logic/weld-assignment-mock';
import { detectDeviations } from '../joint-page/rules/deviations';
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
    const job = JOBS.find(j => !isEngineeringEntryJoint(j) && getGwpOptions(j.materialType1 ?? '', j.materialType2 ?? '').length)!;
    service.applyAll(job);
    const wf = store.workflowFor(job)();
    const stage = wf.stages.find(s => !s.signed && formInputFields(s).some(f => f.key === 'weldProcedure'))!;
    const proc = getProcedure(stage.inputs['weldProcedure'], stage.inputs['wtn'])!;
    expect(proc).toBeTruthy();
    expect(getGwpOptions(job.materialType1!, job.materialType2!).some(o => o.value === proc.gwp)).toBeTrue();
    /* Weld Process and PH/IP come in by their fill rules, an NC requirement makes its actual NC */
    expect(stage.inputs['weldProcess']).toBe(proc.weldProcess.toLowerCase());
    expect(stage.inputs['phMax']).toBe(getWtnFillValue(proc.gwp, proc.wtn, 'phMax'));
    if (getWtnFillValue(proc.gwp, proc.wtn, 'phMin') === 'NC') expect(stage.inputs['actualPhMin']).toBe('NC');
    if (!isFilledByRule(stage, 'fillerMetalType')) {
      expect(getFillerMetalTypeOptions(proc.gwp, proc.wtn).map(o => o.value)).toContain(stage.inputs['fillerMetalType']);
      expect(getFillerMetalSizeOptions(proc.gwp, proc.wtn).map(o => o.value)).toContain(stage.inputs['fillerMetalSize']);
    }
    const before = { ...stage.inputs };
    service.applyAll(job);
    expect(store.workflowFor(job)().stages.find(s => s.id === stage.id)!.inputs).toEqual(before);
  });

  it('leaves an engineering override joint blank and keeps what is typed, with nothing off-list', () => {
    const job = JOBS.find(j => isEngineeringEntryJoint(j) && store.workflowFor(j)().stages.some(s => !s.signed && formInputFields(s).some(f => f.key === 'weldProcedure')))!;
    service.applyAll(job);
    const stage = store.workflowFor(job)().stages.find(s => !s.signed && formInputFields(s).some(f => f.key === 'weldProcedure'))!;
    expect(stage.engineeringEntry).toBeTrue();
    expect(stage.inputs['weldProcedure']).toBe('');
    expect(stage.inputs['phMin']).toBe('');
    store.update(job, wf => ({ ...wf, stages: wf.stages.map(s => s.id === stage.id
      ? { ...s, inputs: { ...s.inputs, weldProcedure: 'TYPED-1', wtn: 'TYPED-WTN', fillerMetalType: 'ANY' } } : s) }));
    service.applyAll(job);
    const after = store.workflowFor(job)().stages.find(s => s.id === stage.id)!;
    expect(after.inputs['weldProcedure']).toBe('TYPED-1');
    const keys = new Set(formInputFields(after).map(f => f.key));
    expect(detectDeviations(after, keys, [], { type1: job.materialType1 ?? '', type2: job.materialType2 ?? '' })
      .filter(d => d.kind === 'off-list')).toEqual([]);
  });
});
