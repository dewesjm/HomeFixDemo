import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { addTestJob, JOBS, Job } from '../../data/jobs';
import { WorkflowStore } from '../services/workflow-store.service';
import { SignoffService } from '../services/signoff.service';
import { RoutingService } from '../services/routing.service';
import { getSignoffTypeRows, setSignoffTypeRows } from '../signoff-definition/signoff-types';
import { newWorkflow } from './build-stages';
import { activeStage } from './current-routing';
import { excavationNdtStageFor } from './added-steps';
import { excavationDefinition } from './excavation-definition';
import { getTemplates, routingTemplateId, updateStageTemplate } from './stage-templates';
import { routingBarSteps } from './routing-bar';
import { routeBack } from './route-changes';
import { isExcavationNdtStageId } from './step-ids';

describe('Configured regular and NQC Excavation', () => {
  let store: WorkflowStore;
  let signoff: SignoffService;
  let job: Job;
  const wf = () => store.workflowFor(job)();
  const current = () => activeStage(wf().stages)!;
  function patch(id: string, inputs: Record<string, string>, result: 'sat' | 'unsat' = 'sat', type = '') {
    store.update(job, w => ({ ...w, stages: w.stages.map(s => s.id === id
      ? { ...s, inputs: { ...s.inputs, ...inputs }, result, ...(type ? { signoffType: type, inspectionType: type } : {}) } : s) }));
  }
  function rejectOriginal() {
    const source = (job.nInd === '3' ? '' : 'nqc-') + 'root-ndt-mtpt';
    patch(source, {}, 'unsat', 'pt');
    expect(signoff.signStage(job, source)).toBeTrue();
    return source;
  }
  function weldRepair() {
    const repair = current().id;
    patch(repair, { repairType: 'weld-repair' });
    const preview = signoff.previewSignoff(wf(), job, repair);
    expect(signoff.signStage(job, repair)).toBeTrue();
    expect(current().id).toBe(preview.target!.id);
    expect(current().role).toBe(preview.target!.role);
    return current().id;
  }
  beforeEach(() => {
    localStorage.clear();
    setSignoffTypeRows(getSignoffTypeRows());
    store = TestBed.inject(WorkflowStore);
    signoff = TestBed.inject(SignoffService);
    job = Object.assign(addTestJob(), { nInd: '3', ndtRoot: 'PT', ndtEach: '', ndtFinal: '',
      materialType1: '12-SS304', materialType2: '02-CS', jointDesign: 'C-18', refitNumber: '', repairNumber: '' });
    store.update(job, () => newWorkflow(job));
  });
  afterEach(() => {
    window.dispatchEvent(new Event('pagehide'));
    JOBS.splice(JOBS.indexOf(job), 1);
    localStorage.clear();
    setSignoffTypeRows(getSignoffTypeRows());
  });
  for (const indicator of ['1', '2', '3']) {
    it(`keeps round returns, original inspection and undo for indicator ${indicator}`, () => {
      job.nInd = indicator;
      store.update(job, () => newWorkflow(job));
      const source = rejectOriginal();
      const id = weldRepair();
      expect(id).toBe((indicator === '3' ? '' : 'nqc-') + 'excavation-ndt');
      expect(current().role).toBe(indicator === '3' ? 'Inspector' : 'NQC Inspector');
      expect(current().typeOptions?.map(o => o.value)).toEqual(['5x']);
      expect(current().inputs['typeChangedFromPtTo5x']).toBe('yes');
      expect(wf().stages.find(s => s.id === 'repair')!.inputs['originStageId']).toBe(source);
      expect(routingBarSteps(wf().stages).filter(s => s.label === 'Excavation NDT').length).toBe(1);
      patch(id, {}, 'unsat', '5x');
      expect(signoff.signStage(job, id)).toBeTrue();
      expect(current().id).toBe('repair');
      expect(wf().stages.find(s => s.id === id)!.required).toBeFalse();
      expect(current().inputs['originInspectionType']).toBe('pt');
      expect(job.repairNumber).toBe('01');
      weldRepair();
      patch(id, {}, 'sat', '5x');
      expect(signoff.signStage(job, id)).toBeTrue();
      expect(current().id).toBe((indicator === '3' ? '' : 'nqc-') + 'root-ndt-vt5x');
      TestBed.inject(RoutingService).deprogress(job, 'Undo excavation acceptance');
      expect(current().id).toBe(id);
      expect(current().signed).toBeFalse();
      expect(wf().history.some(h => h.stageId === id && h.section === 'Sign-off')).toBeTrue();
      const reset = routeBack(wf(), job, 'repair').wf;
      expect(reset.stages.find(s => s.id === id)!.required).toBeFalse();
    });
  }
  it('selects by editable applicability rather than fixed nuclear checks and rejects ambiguity', () => {
    updateStageTemplate('Welding', 'excavation-ndt', { includeWhen: [[{ field: 'nInd', op: 'is', values: ['1'] }]] });
    updateStageTemplate('Welding', 'nqc-excavation-ndt', { includeWhen: [[{ field: 'nInd', op: 'is', values: ['2', '3'] }]] });
    expect(excavationDefinition(job).id).toBe('nqc-excavation-ndt');
    updateStageTemplate('Welding', 'excavation-ndt', { includeWhen: [] });
    rejectOriginal();
    patch('repair', { repairType: 'weld-repair' });
    const before = structuredClone(wf());
    expect(signoff.signStage(job, 'repair')).toBeFalse();
    expect(wf()).toEqual(before);
    expect(signoff.previewSignoff(wf(), job, 'repair').reasons.join(' ')).toContain('found 2');
    updateStageTemplate('Welding', 'excavation-ndt', { includeWhen: [[{ field: 'nInd', op: 'is', values: ['1'] }]] });
    updateStageTemplate('Welding', 'nqc-excavation-ndt', { status: 'inactive' });
    expect(signoff.signStage(job, 'repair')).toBeFalse();
    expect(wf()).toEqual(before);
  });
  it('uses independently saved Type options and enable conditions, and keeps existing instances', () => {
    setSignoffTypeRows(getSignoffTypeRows().map(r => r.stepId === 'nqc-excavation-ndt'
      ? { stepId: r.stepId, types: [{ type: 'ut', enableWhen: [[{ field: 'nInd', op: 'is', values: ['1'] }]] }] } : r));
    expect(excavationNdtStageFor({ ...job, nInd: '1' }, 'pt', 'repair-2').typeOptions?.map(o => o.value)).toEqual(['ut']);
    expect(excavationNdtStageFor({ ...job, nInd: '2' }, 'pt', 'repair-2').typeOptions).toEqual([]);
    const regular = excavationNdtStageFor(job, 'pt', 'repair-2');
    expect(regular.typeOptions?.map(o => o.value)).toEqual(['5x']);
    updateStageTemplate('Welding', 'excavation-ndt', { label: 'Regular excavation', role: 'Engineering' });
    expect(regular.label).toBe('Excavation NDT 2');
    expect(regular.role).toBe('Inspector');
    expect(routingTemplateId('nqc-excavation-ndt-2')).toBe('nqc-excavation-ndt');
    expect(getTemplates()['Welding'].find(t => t.id === 'nqc-excavation-ndt')!.role).toBe('NQC Inspector');
  });
  it('retains variant identities and multiple rounds after persistence and reload', fakeAsync(() => {
    job.nInd = '2';
    store.update(job, () => newWorkflow(job));
    const source = rejectOriginal();
    patch('repair', { repairType: 'grind' });
    signoff.signStage(job, 'repair');
    patch(source, {}, 'unsat', 'pt');
    signoff.signStage(job, source);
    expect(current().id).toBe('repair-2');
    const id = weldRepair();
    expect(id).toBe('nqc-excavation-ndt-2');
    expect(wf().stages.find(s => s.id === 'repair')!.signed).toBeTrue();
    tick(1200);
    window.dispatchEvent(new Event('pagehide'));
    TestBed.resetTestingModule();
    store = TestBed.inject(WorkflowStore);
    expect(current().id).toBe(id);
    expect(wf().stages.filter(s => isExcavationNdtStageId(s.id)).length).toBe(1);
    expect(current().role).toBe('NQC Inspector');
    expect(current().typeOptions?.map(o => o.value)).toEqual(['5x']);
    expect(job.repairNumber).toBe('02');
  }));
});
