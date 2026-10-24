import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { JointPageComponent } from '../joint-page/joint-page.component';
import { ConfirmService } from '../../shared/confirm.service';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { JOBS, addTestJob, Job } from '../../data/jobs';
import { STORAGE } from '../../data/storage-keys';
import { WorkflowStore } from '../services/workflow-store.service';
import { SignoffService } from '../services/signoff.service';
import { RoutingService } from '../services/routing.service';
import { StageTemplate, WorkflowStage } from '../model/workflow-types';
import { activeStage } from './current-routing';
import { addStageTemplate, getTemplates, updateStageTemplate } from './stage-templates';
import { getSignoffTypeRows, setSignoffTypeRows } from '../signoff-definition/signoff-types';
import { getRoutingSignoffTypes, setRoutingSignoffTypes } from '../signoff-definition/routing-signoff-types';
import { getStepFieldConfig, resetStepFieldConfig, setStepFieldConfig } from '../signoff-definition/step-field-config';
import { routeBack } from './route-changes';
import { insertionTarget } from './instance-identity';
import { newWorkflow } from './build-stages';
import { resolveInsertion } from './generic-insertion';
import { typeChange } from '../joint-page/rules/type-change';

describe('Ordinary insertion execution and preview', () => {
  let job: Job;
  let store: WorkflowStore;
  let signoff: SignoffService;
  const current = () => activeStage(store.workflowFor(job)().stages)!;
  const wf = () => store.workflowFor(job)();
  function definition(id = 'extra', patch: Partial<StageTemplate> = {}) {
    addStageTemplate('Welding', { id, label: id, classification: 'added', role: 'Inspector', ...patch, required: true });
    setSignoffTypeRows([...getSignoffTypeRows(), { stepId: id, types: [{ type: 'extra-type', default: true }] }]);
    updateStageTemplate('Welding', id, { status: 'active' });
  }
  function rule(source: string, to: string) {
    updateStageTemplate('Welding', source, { thenRules: [{ when: [], to }] });
  }
  function sign(id = current().id) { expect(signoff.signStage(job, id)).toBeTrue(); }
  beforeEach(() => {
    localStorage.clear();
    setSignoffTypeRows(getSignoffTypeRows());
    resetStepFieldConfig();
    TestBed.configureTestingModule({ imports: [JointPageComponent], providers: [provideRouter([]), { provide: ActivatedRoute, useFactory: () => ({ snapshot: { paramMap: convertToParamMap({ id: job.id }), queryParamMap: convertToParamMap({}) } }) }] });
    store = TestBed.inject(WorkflowStore);
    signoff = TestBed.inject(SignoffService);
    job = Object.assign(addTestJob(), { jointDesign: 'C-18', nInd: '3', ndtRoot: 'VT', ndtEach: '', ndtFinal: 'VT', rtRoot: '', rtFinal: '', refitNumber: '', repairNumber: '' });
    setRoutingSignoffTypes([...getRoutingSignoffTypes(), { value: 'extra-type', label: 'Extra check' }]);
    setStepFieldConfig([...getStepFieldConfig(), { typeId: 'extra-type', fields: [{ key: 'comments' }] }]);
    store.update(job, () => newWorkflow(job));
  });
  afterEach(() => {
    window.dispatchEvent(new Event('pagehide'));
    JOBS.splice(JOBS.indexOf(job), 1);
    localStorage.clear();
    setSignoffTypeRows(getSignoffTypeRows());
    resetStepFieldConfig();
  });

  it('inserts only the first matching target with blank values, conditional persona and shared form', () => {
    definition('extra', { roleRules: [{ when: [{ field: 'nInd', op: 'is', values: ['3'] }], role: 'Foreman' }] });
    definition('other');
    updateStageTemplate('Welding', 'pre-fit', { thenRules: [{ when: [], to: insertionTarget('extra') }, { when: [], to: insertionTarget('other') }] });
    expect(wf().stages.some(s => s.insertion)).toBeFalse();
    const preview = signoff.previewSignoff(wf(), job, 'pre-fit');
    expect(preview.target?.role).toBe('Foreman');
    expect(preview.target?.typeOptions?.map(t => t.value)).toEqual(['extra-type']);
    expect(wf().history).toEqual([]);
    sign('pre-fit');
    expect(current()).toEqual(preview.target!);
    expect(current().insertion?.sourceId).toBe('pre-fit');
    expect(current().insertion?.continueAt).toBe('fit');
    expect(current().inputs).toEqual({});
    expect(current().signoffInputs).toEqual({});
    expect(current().signed).toBeFalse();
    expect(wf().stages.filter(s => s.insertion).length).toBe(1);
    expect(job.repairNumber).toBe('');
    expect(job.refitNumber).toBe('');
    sign();
    expect(current().id).toBe('fit');
    expect(wf().history.some(h => h.stageId === preview.target!.id && h.action === 'extra 1 - Signed off')).toBeTrue();
  });

  it('nested work continues after its original source; repeated instances keep distinct records', () => {
    definition(); definition('nested');
    rule('pre-fit', insertionTarget('extra'));
    rule('extra', insertionTarget('nested'));
    rule('fit', insertionTarget('extra'));
    sign('pre-fit'); const first = current().id;
    sign(); const nested = current().id;
    expect(current().insertion?.sourceId).toBe(first);
    expect(current().insertion?.continueAt).toBe('fit');
    sign(); expect(current().id).toBe('fit');
    sign(); expect(current().id).not.toBe(first);
    expect(current().label).toBe('extra 2');
    expect(wf().stages.find(s => s.id === first)?.signed).toBeTrue();
    expect(wf().stages.find(s => s.id === nested)?.signed).toBeTrue();
    expect(wf().history.filter(h => h.section === 'Sign-off').map(h => h.stageId)).toContain(first);
  });

  it('shares conditional replacements between preview and execution and freezes existing inserted choices', () => {
    definition(); rule('pre-fit', insertionTarget('extra'));
    setSignoffTypeRows(getSignoffTypeRows().map(r => r.stepId === 'extra' ? { ...r,
      typeExceptions: [{ from: 'extra-type', to: 'vt', when: [[{ field: 'nInd', op: 'is', values: ['3'] }]] }] } : r));
    const preview = signoff.previewSignoff(wf(), job, 'pre-fit');
    expect(preview.target?.typeOptions?.map(o => o.value)).toEqual(['vt']);
    sign('pre-fit');
    expect(current().typeOptions).toEqual(preview.target?.typeOptions);
    setSignoffTypeRows(getSignoffTypeRows().map(r => r.stepId === 'extra' ? { ...r, typeExceptions: [] } : r));
    expect(current().typeOptions?.map(o => o.value)).toEqual(['vt']);
    sign();
    expect(wf().stages.find(s => s.insertion)?.inspectionType).toBe('vt');
  });

  it('inherits original inspection context for ordinary insertions with shared exceptions', () => {
    job.ndtRoot = 'PT';
    store.update(job, () => newWorkflow(job));
    definition();
    updateStageTemplate('Welding', 'root-ndt-mtpt', { rejectRulesEdited: true, rejectRules: [{ when: [], to: insertionTarget('extra') }] });
    setSignoffTypeRows(getSignoffTypeRows().map(r => r.stepId === 'extra' ? { ...r, types: [],
      typeSource: 'rejecting-inspection', typeExceptions: [{ from: 'pt', to: '5x' }] } : r));
    store.update(job, w => ({ ...w, stages: w.stages.map(s => s.id === 'root-ndt-mtpt'
      ? { ...s, result: 'unsat', inspectionType: 'pt', signoffType: 'pt' } : s) }));
    const preview = signoff.previewSignoff(wf(), job, 'root-ndt-mtpt');
    expect(preview.target?.typeOptions?.map(o => o.value)).toEqual(['5x']);
    sign('root-ndt-mtpt');
    expect(current().insertion?.originInspectionType).toBe('pt');
    expect(current().typeOptions).toEqual(preview.target?.typeOptions);
  });

  it('blocks contextual Type source on a source without an original inspection', () => {
    definition(); rule('pre-fit', insertionTarget('extra'));
    setSignoffTypeRows(getSignoffTypeRows().map(r => r.stepId === 'extra'
      ? { ...r, typeSource: 'rejecting-inspection', types: [] } : r));
    const before = structuredClone(wf());
    expect(signoff.previewSignoff(wf(), job, 'pre-fit').blocked).toContain('context is missing');
    expect(signoff.signStage(job, 'pre-fit')).toBeFalse();
    expect(wf()).toEqual(before);
  });

  for (const failure of ['inactive', 'applicability', 'types', 'missing']) {
    it(`blocks ${failure} targets before signing or writing History, consistently with preview`, () => {
      definition(); rule('pre-fit', insertionTarget('extra'));
      if (failure === 'inactive') updateStageTemplate('Welding', 'extra', { status: 'inactive' });
      if (failure === 'applicability') updateStageTemplate('Welding', 'extra', { includeWhen: [[{ field: 'nInd', op: 'is', values: ['1'] }]] });
      if (failure === 'types') setSignoffTypeRows(getSignoffTypeRows().map(r => r.stepId === 'extra' ? { ...r, types: r.types.map(t => ({ ...t, enableWhen: [[{ field: 'nInd', op: 'is' as const, values: ['1'] }]] })) } : r));
      if (failure === 'missing') {
        const templates = getTemplates()['Welding'];
        templates.splice(templates.findIndex(t => t.id === 'extra'), 1);
      }
      const before = wf();
      expect(signoff.previewSignoff(before, job, 'pre-fit').reasons.join(' ')).toContain('Blocked:');
      expect(signoff.signStage(job, 'pre-fit')).toBeFalse();
      expect(wf()).toBe(before);
    });
  }

  it('rejects direct and indirect unconditional cycles but allows explicitly conditional repeat work', () => {
    definition(); definition('nested');
    expect(() => rule('extra', insertionTarget('extra'))).toThrowError(/cycle/);
    rule('extra', insertionTarget('nested'));
    expect(() => rule('nested', insertionTarget('extra'))).toThrowError(/cycle/);
    updateStageTemplate('Welding', 'nested', { thenRules: [{ when: [{ field: 'self.comments', op: 'is', values: ['repeat'] }], to: insertionTarget('extra') }] });
    expect(getTemplates()['Welding'].find(t => t.id === 'nested')!.thenRules!.length).toBe(1);
  });

  it('freezes open instance labels/personas/rules/Types, retaining stable references through rename/deactivation', () => {
    definition(); rule('pre-fit', insertionTarget('extra')); sign('pre-fit');
    const inserted = current();
    updateStageTemplate('Welding', 'extra', { label: 'Renamed', role: 'Foreman', thenRules: [{ when: [], to: 'pre-fit' }], status: 'inactive' });
    setSignoffTypeRows(getSignoffTypeRows().filter(r => r.stepId !== 'extra'));
    expect(current()).toBe(inserted);
    expect(getTemplates()['Welding'].find(t => t.id === 'pre-fit')!.thenRules![0].to).toBe(insertionTarget('extra'));
    sign(); expect(current().id).toBe('fit');
  });

  it('Deprogress removes inserted descendants and preserves corrections; subsequent instance IDs do not reuse History IDs', () => {
    definition(); rule('pre-fit', insertionTarget('extra')); sign('pre-fit');
    const id = current().id;
    TestBed.inject(RoutingService).deprogress(job, 'Undo inserted work');
    expect(wf().stages.some(s => s.insertion)).toBeFalse();
    expect(current().id).toBe('pre-fit');
    sign(); sign();
    const signedId = wf().history.at(-1)!.stageId!;
    signoff.correctStage(job, signedId, { signoffInputs: { comments: 'retained correction' } }, 'Correct record');
    sign('fit');
    TestBed.inject(RoutingService).deprogress(job, 'Undo Fit');
    expect(wf().stages.find(s => s.id === signedId)!.signoffInputs['comments']).toBe('retained correction');
    expect(wf().stages.some(s => s.id === id)).toBeTrue();
  });

  it('route-back keeps signed inserted records and retires other unsigned inserted work', () => {
    definition(); rule('pre-fit', insertionTarget('extra')); sign('pre-fit'); sign();
    rule('fit', insertionTarget('extra')); sign('fit');
    const openId = current().id;
    const back = routeBack(wf(), job, 'fit').wf;
    expect(back.stages.find(s => s.id === 'added:extra:1')!.signed).toBeTrue();
    expect(back.stages.find(s => s.id === openId)!.required).toBeFalse();
    expect(activeStage(back.stages)!.id).toBe('fit');
  });

  it('resolves source inspection/phase context, preserves it on Type changes and uses relative returns', () => {
    definition('extra', { thenRules: [{ when: [], to: 'rejecting-ndt' }] });
    rule('root-ndt-vt5x', insertionTarget('extra'));
    sign('root-ndt-vt5x');
    expect(current().insertion?.originPhase).toBe('root');
    const selected = { ...current(), ...typeChange(job.trade, current(), 'extra-type') };
    expect(selected.insertion?.originStageId).toBe('root-ndt-vt5x');
    sign(); expect(current().id).toBe('root-ndt-vt5x');
    expect(wf().stages.find(s => s.insertion)?.signed).toBeTrue();
  });

  it('blocks an unresolved relative return instead of silently advancing', () => {
    definition('extra', { thenRules: [{ when: [], to: 'own-repair' }] });
    rule('pre-fit', insertionTarget('extra')); sign('pre-fit');
    const before = wf();
    expect(signoff.signStage(job, current().id)).toBeFalse();
    expect(wf()).toBe(before);
  });

  it('inserts on a reject rule and applies an ordinary rejected destination', () => {
    definition('extra', { rejectRules: [{ when: [], to: 'fit' }] });
    updateStageTemplate('Welding', 'root-ndt-vt5x', { rejectRulesEdited: true, rejectRules: [{ when: [], to: insertionTarget('extra') }] });
    store.update(job, w => ({ ...w, stages: w.stages.map(s => s.id === 'root-ndt-vt5x' ? { ...s, result: 'unsat', inspectionType: 'vt', signoffType: 'vt' } : s) }));
    const preview = signoff.previewSignoff(wf(), job, 'root-ndt-vt5x');
    sign('root-ndt-vt5x'); expect(current()).toEqual(preview.target!);
    const id = current().id;
    store.update(job, w => ({ ...w, stages: w.stages.map(s => s.id === id ? { ...s, result: 'unsat' } : s) }));
    sign(); expect(current().id).toBe('fit');
    expect(wf().history.some(h => h.action.includes('Routed back to Fit'))).toBeTrue();
  });

  it('continues to completion when insertion follows the last required routing', () => {
    definition();
    rule('review-o04', insertionTarget('extra'));
    store.update(job, w => ({ ...w, stages: w.stages.filter(s => s.id !== 'sold').map(s => s.id === 'review-o04' ? s : { ...s, signed: true, signedAt: '2026-10-24T12:00:00.000Z' }) }));
    sign('review-o04');
    expect(current().insertion?.continueAt).toBe('');
    sign(); expect(activeStage(wf().stages)).toBeUndefined();
  });

  it('retains signed instance IDs in History across Deprogress and a fresh insertion', () => {
    definition(); rule('pre-fit', insertionTarget('extra')); sign('pre-fit');
    const original = current().id; sign();
    const routing = TestBed.inject(RoutingService);
    routing.deprogress(job, 'Undo extra'); routing.deprogress(job, 'Undo source');
    sign('pre-fit'); expect(current().id).not.toBe(original);
    expect(wf().history.some(h => h.stageId === original)).toBeTrue();
  });

  it('uses the same resolver for seed construction and execution', () => {
    definition();
    const source = wf().stages[0];
    const seeded = resolveInsertion(getTemplates()['Welding'], wf().stages, job, source, insertionTarget('extra'));
    rule(source.id, insertionTarget('extra')); sign(source.id);
    expect(current()).toEqual({ ...seeded, routingFrom: true });
  });


  it('renders inserted work, edits its shared form, cancels and confirms signoff, then reloads the signed outcome', fakeAsync(() => {
    definition(); rule('pre-fit', insertionTarget('extra')); sign('pre-fit');
    const id = current().id;
    spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
    const fixture = TestBed.createComponent(JointPageComponent);
    fixture.detectChanges(); tick(); fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.textContent).toContain('extra 1');
    const comments = Array.from(host.querySelectorAll<HTMLLabelElement>('app-definition-form label')).find(l => l.textContent?.includes('Comments'))!.querySelector('input')!;
    expect(comments.disabled).toBeFalse();
    comments.value = 'Inspection recorded'; comments.dispatchEvent(new Event('input')); comments.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    const button = Array.from(host.querySelectorAll<HTMLButtonElement>('app-signoff-panel button')).find(b => b.textContent?.trim() === 'Signoff')!;
    expect(button.disabled).toBeFalse();
    button.click();
    const confirm = TestBed.inject(ConfirmService);
    expect(confirm.request()?.header).toBe('Confirm sign-off');
    confirm.resolve(false);
    expect(current().signed).toBeFalse();
    button.click(); confirm.resolve(true); fixture.detectChanges(); tick(250);
    expect(wf().stages.find(s => s.id === id)!.signed).toBeTrue();
    expect(wf().history.find(h => h.stageId === id)?.inputs).toContain(jasmine.objectContaining({ label: 'Comments', value: 'Inspection recorded' }));
    fixture.destroy();
    window.dispatchEvent(new Event('pagehide'));
    const reloaded = TestBed.runInInjectionContext(() => new WorkflowStore()).workflowFor(job)();
    expect(reloaded.stages.find(s => s.id === id)!.signoffInputs['comments']).toBe('Inspection recorded');
    expect(activeStage(reloaded.stages)!.id).toBe('fit');
    tick(4000);
  }));

  it('reloads stored inserted context and continues without rebuilding the numbered path', fakeAsync(() => {
    definition(); rule('pre-fit', insertionTarget('extra')); sign('pre-fit'); sign();
    tick(250);
    window.dispatchEvent(new Event('pagehide'));
    const saved = JSON.parse(localStorage.getItem(STORAGE.workflows)!)[job.id];
    const reloaded = TestBed.runInInjectionContext(() => new WorkflowStore()).workflowFor(job)();
    expect(reloaded.stages).toEqual(saved.stages);
    expect(reloaded.history).toEqual(saved.history);
    expect(reloaded.stages.find((s: WorkflowStage) => s.insertion)?.signed).toBeTrue();
    expect(activeStage(reloaded.stages)!.id).toBe('fit');
    tick(4000);
  }));
});

