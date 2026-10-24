import { getSignoffTypeRows, setSignoffTypeRows } from '../signoff-definition/signoff-types';
import { TestBed } from '@angular/core/testing';
import { JOBS, Job } from '../../data/jobs';
import { getRepairCodes, setRepairCodes } from '../../data/repair-codes';
import { WorkflowStore } from '../services/workflow-store.service';
import { SignoffService } from '../services/signoff.service';
import { RoutingService } from '../services/routing.service';
import { newWorkflow } from './build-stages';
import { activeStage } from './current-routing';
import { getTemplates, updateStageTemplate } from './stage-templates';
import { repairCodeError } from '../admin/admin-repair-codes/repair-code-validation';
import { conditionText } from '../signoff-definition/field-rules';

describe('Configured Repair Code routing', () => {
  let store: WorkflowStore;
  let service: SignoffService;
  let job: Job;
  const wf = () => store.workflowFor(job)();
  const current = () => activeStage(wf().stages)!;
  function choose(code = 'extra') {
    const id = current().id;
    store.update(job, w => ({ ...w, stages: w.stages.map(s => s.id === id
      ? { ...s, inputs: { ...s.inputs, repairType: code } } : s) }));
    return id;
  }
  function rule(to: string) {
    const repair = getTemplates()['Welding'].find(t => t.id === 'repair')!;
    updateStageTemplate('Welding', 'repair', { thenRules: [{ when: [{ field: 'self.repairType', op: 'is', values: ['extra'] }], to }, ...(repair.thenRules ?? [])] });
  }
  beforeEach(() => {
    localStorage.clear();
    setSignoffTypeRows(getSignoffTypeRows());
    store = TestBed.inject(WorkflowStore); service = TestBed.inject(SignoffService);
    job = Object.assign({ ...JOBS[0], id: 'repair-code-test', xrefid: 'RCT01', _fresh: true }, { nInd: '3', ndtRoot: 'PT', ndtEach: '', ndtFinal: '', rtRoot: '', rtFinal: '',
      materialType1: '12-SS304', materialType2: '02-CS', jointDesign: 'C-18', refitNumber: '', repairNumber: '' });
    JOBS.push(job);
    store.update(job, () => newWorkflow(job));
    setRepairCodes([...getRepairCodes(), { code: 'extra', name: 'Extra inspection', active: true }]);
    store.update(job, w => ({ ...w, stages: w.stages.map(s => s.id === 'root-ndt-mtpt'
      ? { ...s, result: 'unsat', inspectionType: 'pt', signoffType: 'pt' } : s) }));
    expect(service.signStage(job, 'root-ndt-mtpt')).toBeTrue();
    expect(current().id).toBe('repair');
  });
  afterEach(() => {
    window.dispatchEvent(new Event('pagehide'));
    JOBS.splice(JOBS.indexOf(job), 1); localStorage.clear(); setSignoffTypeRows(getSignoffTypeRows());
  });
  it('blocks missing destination rules and inactive/unknown codes without History or undo mutation', () => {
    for (const code of ['extra', 'missing']) {
      const id = choose(code); const before = structuredClone(wf());
      expect(current().inputs['repairType']).toBe(code);
      expect(current().result).not.toBe('unsat');
      expect(service.previewSignoff(wf(), job, id).blocked).toBeTruthy();
      expect(service.signStage(job, id)).toBeFalse(); expect(wf()).toEqual(before);
    }
    rule('rejecting-ndt'); choose();
    setRepairCodes(getRepairCodes().map(r => r.code === 'extra' ? { ...r, active: false } : r));
    expect(service.previewSignoff(wf(), job, 'repair').blocked).toContain('inactive');
  });
  it('uses configured return destinations with preview parity, stable renames, History and Deprogress', () => {
    rule('rejecting-ndt'); const id = choose();
    setRepairCodes(getRepairCodes().map(r => r.code === 'extra' ? { ...r, name: 'Recheck' } : r));
    expect(conditionText({ all: [{ source: 'field', key: 'repairType', equals: 'extra' }] })).toBe('Repair Code is Recheck');
    const preview = service.previewSignoff(wf(), job, id);
    expect(preview.target?.id).toBe('root-ndt-mtpt');
    expect(service.signStage(job, id, [{ label: 'Repair Code', value: 'Recheck' }])).toBeTrue();
    expect(current().id).toBe(preview.target!.id);
    expect(wf().repairNumber).toBe('01');
    const history = structuredClone(wf().history);
    setRepairCodes(getRepairCodes().map(r => r.code === 'extra' ? { ...r, name: 'Retired', active: false } : r));
    expect(wf().history).toEqual(history);
    window.dispatchEvent(new Event('pagehide'));
    const reloaded = TestBed.runInInjectionContext(() => new WorkflowStore());
    expect(reloaded.workflowFor(job)().history).toEqual(JSON.parse(JSON.stringify(wf().history)));
    TestBed.inject(RoutingService).deprogress(job, 'Undo configured action');
    expect(current().id).toBe(id);
  });
  it('allows configured Excavation insertion and blocks invalid relative targets', () => {
    rule('own-repair'); choose();
    expect(service.previewSignoff(wf(), job, 'repair').blocked).toContain('no routing context');
    rule('add-excavation-ndt');
    const preview = service.previewSignoff(wf(), job, 'repair');
    expect(preview.target?.id).toBe('excavation-ndt');
    expect(service.signStage(job, 'repair')).toBeTrue();
    expect(current().id).toBe(preview.target!.id);
    expect(current().typeOptions?.map(o => o.value)).toEqual(['5x']);
  });
  it("does not grant Cut's Refit increment to a new code routed to Fit", () => {
    rule('fit'); choose();
    expect(service.signStage(job, 'repair')).toBeTrue();
    expect(current().id).toBe('fit'); expect(job.refitNumber).toBe('');
    expect(repairCodeError({ code: 'extra', name: ' CUT ', active: true }, getRepairCodes().filter(r => r.code !== 'extra'))).toBeTruthy();
  });
});
