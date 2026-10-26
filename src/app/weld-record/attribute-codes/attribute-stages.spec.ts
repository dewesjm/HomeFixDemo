import { addTestJob, Job, JOBS } from '../../data/jobs';
import { WorkflowStage, JobWorkflow } from '../model/workflow-types';
import { buildStages, newWorkflow } from '../routing/build-stages';
import { routeSignoff } from '../routing/signoff-routing';
import { activeStageId, setRoutingFrom } from '../routing/current-routing';
import { deprogressWorkflow, routeBack, signoffUndo } from '../routing/route-changes';
import { getSignoffTypeRows, setSignoffTypeRows } from '../signoff-definition/signoff-types';
import { conditionsMatch } from '../routing/step-conditions';
import { attributeInspectionError } from './inspection-validation';
import { attributeTemplateId, baseStepId } from '../routing/step-ids';
import { updateStageTemplate } from '../routing/stage-templates';
import { signProblems, stageFieldErrors } from '../joint-page/rules/sign-validation';

describe('Attribute inspection workflow integration', () => {
  let job: Job;
  beforeEach(() => {
    localStorage.clear(); setSignoffTypeRows(getSignoffTypeRows());
    job = { ...addTestJob(), nInd: '3', attributeCode1: 'PU', ndtRoot: 'VT', ndtEach: 'PT', ndtFinal: 'VT', rtRoot: '', rtFinal: '100',
      materialType1: '02-CS', materialType2: '02-CS', attributeLocation: 'Shop', attributeGtaWeld: 'Yes' };
  });
  afterEach(() => { localStorage.clear(); setSignoffTypeRows(getSignoffTypeRows()); });
  const pick = (stage: WorkflowStage, type: string, result: 'sat' | 'unsat' = 'sat', inputs = {}): WorkflowStage =>
    ({ ...stage, inspectionType: type, signoffType: type, result, inputs: { ...stage.inputs, ...inputs } });
  const focus = (wf: JobWorkflow, id: string) => ({ ...wf, stages: setRoutingFrom(wf.stages, id) });
  function sign(wf: JobWorkflow, stage: WorkflowStage): JobWorkflow {
    const input = { ...wf, stages: wf.stages.map(s => s.id === stage.id ? { ...stage, routingFrom: s.routingFrom } : s) };
    const result = routeSignoff(input, job, stage.id);
    return { ...input, stages: result.stages, fabricationData: result.fabricationData };
  }
  it('retains distinct Final PT, RT and UT signoffs, with unique IDs and blank Type choices', () => {
    const stages = buildStages(job).filter(s => s.attributeInspection?.phase === 'final');
    expect(new Set(stages.map(s => s.id)).size).toBe(stages.length);
    expect(stages.map(s => s.inspectionType).every(type => type === '')).toBeTrue();
    const rt = stages.find(s => s.typeOptions?.some(o => o.value === 'rt'))!;
    const ut = stages.find(s => s.typeOptions?.some(o => o.value === 'ut'))!;
    const pt = stages.find(s => s.typeOptions?.some(o => o.value === 'pt'))!;
    expect(rt.id).not.toBe(ut.id);
    let wf = focus(newWorkflow(job), pt.id);
    wf = sign(wf, pick(pt, 'pt'));
    expect(activeStageId(wf.stages)).toBe(rt.id);
    wf = sign(wf, pick(rt, 'rt', 'sat', { degreeRt: '100' }));
    expect(activeStageId(wf.stages)).toBe(ut.id);
    expect(wf.stages.find(s => s.id === ut.id)?.signed).toBeFalse();
  });
  it('rejects invalid methods and insufficient or nonnumeric RT in execution and UI validation', () => {
    const wf = newWorkflow(job);
    const rt = wf.stages.find(s => s.typeOptions?.some(o => o.value === 'rt'))!;
    for (const degreeRt of ['60', 'NA', 'invalid']) {
      const attempted = pick(rt, 'rt', 'sat', { degreeRt });
      expect(attributeInspectionError(attempted)).toContain('100');
      expect(() => sign(wf, attempted)).toThrowError(/at least 100/);
    }
    expect(() => sign(wf, pick(rt, 'mt'))).toThrowError(/permitted/);
    const bad = pick(rt, 'rt', 'sat', { degreeRt: '60' });
    const ctx = { job, fab: {}, fabErrors: {}, visibleFields: [] };
    expect(signProblems(bad, ctx).some(r => r.includes('100'))).toBeTrue();
    expect(stageFieldErrors(bad, ctx)[bad.id + ':degreeRt']).toContain('100');
  });
  it('uses configured NQC persona on added inspections and resolves additional IDs to the same template', () => {
    job.nInd = '1';
    const stages = buildStages(job).filter(s => s.attributeInspection?.phase === 'final');
    expect(stages.every(s => s.role === 'NQC Inspector' && s.id.startsWith('nqc-'))).toBeTrue();
    const extra = stages.find(s => s.id.includes('--attribute-'))!;
    expect(attributeTemplateId(extra.id)).toBe('nqc-final-ndt-utrt');
    expect(baseStepId(extra.id)).toBe('final-ndt-utrt');
  });
  it('returns a failed second UT/RT obligation to its exact instance after Grind Only', () => {
    let wf = newWorkflow(job);
    const ut = wf.stages.find(s => s.typeOptions?.some(o => o.value === 'ut'))!;
    wf = focus(wf, ut.id);
    wf = sign(wf, pick(ut, 'ut', 'unsat'));
    const repair = wf.stages.find(s => s.id === 'repair')!;
    expect(repair.inputs['originStageId']).toBe(ut.id);
    wf = sign(wf, { ...repair, inspectionType: 'repair', signoffType: 'repair', inputs: { ...repair.inputs, repairType: 'grind' } });
    expect(activeStageId(wf.stages)).toBe(ut.id);
    expect(wf.stages.find(s => s.id === ut.id)?.typeOptions?.map(o => o.value)).toEqual(['ut']);
  });
  it('rebuilds alternatives on route-back and restores the pre-signoff path on Deprogress', () => {
    job.attributeCode1 = 'PM'; job.ndtFinal = 'MT';
    let wf = newWorkflow(job);
    const mtpt = wf.stages.find(s => s.id === 'final-ndt-mtpt')!;
    wf = focus(wf, mtpt.id);
    const undo = signoffUndo(wf, job, mtpt.id);
    wf = sign(wf, pick(mtpt, 'pt'));
    wf.undo = [undo];
    const undone = deprogressWorkflow(wf, job)!;
    expect(undone.wf.stages.find(s => s.id === mtpt.id)?.signed).toBeFalse();
    expect(undone.wf.stages.find(s => s.id === mtpt.id)?.typeOptions?.map(o => o.value)).toEqual(['mt', 'pt']);
    const reset = routeBack(wf, job, 'fit').wf;
    expect(reset.stages.find(s => s.id === mtpt.id)?.inspectionType).toBe('');
  });
  it('allows LR PT or RT60 on every interim layer and returns to Layer after the inspection', () => {
    job.attributeCode1 = 'LR';
    let wf = newWorkflow(job);
    const layer = wf.stages.find(s => s.id === 'root-layer')!;
    wf = focus(wf, layer.id);
    wf = sign(wf, pick(layer, 'interim'));
    const ndt = wf.stages.find(s => s.id === 'layer-ndt-mtpt')!;
    expect(ndt.typeOptions?.map(o => o.value)).toEqual(['pt', 'rt']);
    wf = sign(wf, pick(ndt, 'rt', 'sat', { degreeRt: '60' }));
    expect(activeStageId(wf.stages)).toBe('root-layer');
    wf = sign(wf, pick(wf.stages.find(s => s.id === 'root-layer')!, 'interim'));
    expect(wf.stages.find(s => s.id === ndt.id)?.typeOptions?.map(o => o.value)).toEqual(['pt', 'rt']);
    expect(wf.stages.find(s => s.id === ndt.id)?.inspectionType).toBe('');
  });
  it('blocks attribute conflicts in preview execution and UI blockers before any signoff', () => {
    job.attributeCode2 = 'FC';
    const wf = newWorkflow(job);
    const fit = wf.stages.find(s => s.id === 'fit')!;
    expect(() => sign(wf, fit)).toThrowError(/Attribute conflict/);
    expect(signProblems(fit, { job, fab: {}, fabErrors: {}, visibleFields: [] }).some(r => r.includes('Attribute conflict'))).toBeTrue();
    expect(wf.stages.every(s => !s.signed)).toBeTrue();
  });
  it('prevents configured forward rules from skipping a pending inspection obligation', () => {
    updateStageTemplate('Welding', 'final-ndt-mtpt', { thenRules: [{ when: [], to: 'review-o04' }] });
    const wf = newWorkflow(job);
    const pt = wf.stages.find(s => s.id === 'final-ndt-mtpt')!;
    expect(() => sign(wf, pick(pt, 'pt'))).toThrowError(/intervening attribute/);
  });
  it('matches any attribute slot exactly in shared conditions', () => {
    job.attributeCode4 = 'PM';
    expect(conditionsMatch([[{ field: 'attributeCodes', op: 'is', values: ['PM'] }]], job)).toBeTrue();
    expect(conditionsMatch([[{ field: 'attributeCodes', op: 'isNot', values: ['PU'] }]], job)).toBeFalse();
    expect(conditionsMatch([[{ field: 'attributeCodes', op: 'is', values: ['P'] }]], job)).toBeFalse();
  });
  it('supplies a fresh uniquely identified example for every progression code', () => {
    const examples = JOBS.filter(j => /^AC\d{3}$/.test(j.id));
    expect(examples.length).toBe(13);
    expect(new Set(examples.map(j => j.attributeCode1)).size).toBe(13);
    expect(examples.every(j => j._fresh)).toBeTrue();
  });
});
