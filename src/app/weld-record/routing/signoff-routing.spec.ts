import { addTestJob, Job } from '../../data/jobs';
import { JobWorkflow, WorkflowStage } from '../model/workflow-types';
import { routeSignoff } from './signoff-routing';
import { newWorkflow } from './build-stages';
import { activeStageId } from './current-routing';
import { updateStageTemplate } from './stage-templates';
import { getSignoffTypeRows, setSignoffTypeRows } from '../signoff-definition/signoff-types';
import { typeChange } from '../joint-page/rules/type-change';
import { getActivationForStep, setStepFieldConfig, resetStepFieldConfig } from '../signoff-definition/step-field-config';

describe('Inserted routing table decisions', () => {
  let job: Job;
  let wf: JobWorkflow;
  beforeEach(() => {
    localStorage.clear();
    setSignoffTypeRows(getSignoffTypeRows());
    job = Object.assign(addTestJob(), { nInd: '3', ndtRoot: 'PT', ndtEach: 'PT', ndtFinal: 'PT', materialType1: '02-CS', materialType2: '02-CS' });
    wf = newWorkflow(job);
  });
  afterEach(() => { localStorage.clear(); setSignoffTypeRows(getSignoffTypeRows()); resetStepFieldConfig(); });
  const stage = (wf: JobWorkflow, id: string) => wf.stages.find(s => s.id === id)!;
  function sign(id: string, patch: Partial<WorkflowStage> = {}) {
    wf = { ...wf, stages: wf.stages.map(s => s.id === id ? { ...s, ...patch } : s) };
    const routed = routeSignoff(wf, job, id);
    wf = { ...wf, stages: routed.stages, fabricationData: routed.fabricationData };
    return routed;
  }
  function repair(ndt = 'root-ndt-mtpt') {
    sign(ndt, { inspectionType: 'pt', signoffType: 'pt', result: 'unsat' });
    expect(activeStageId(wf.stages)).toBe('repair');
  }
  function weldRepair() { sign('repair', { inputs: { ...stage(wf, 'repair').inputs, repairType: 'weld-repair' } }); }
  function selectExcavation(type: string) {
    const exc = stage(wf, 'excavation-ndt');
    Object.assign(exc, typeChange(job.trade, exc, type));
  }
  it('excludes added templates from every new joint', () => {
    expect(wf.stages.some(s => ['repair', 'excavation-ndt', 'engineering-hold'].includes(s.id))).toBeFalse();
  });
  for (const nInd of ['1', '2', '3']) {
    it(`routes the indicator ${nInd} thickness confirmation to UT/RT before the Repair Code`, () => {
      job.nInd = nInd;
      job.rtRoot = '360';
      wf = newWorkflow(job);
      repair(`${nInd === '3' ? '' : 'nqc-'}root-ndt-mtpt`);
      const key = nInd === '1' ? 'allowableThicknessExceededN1' : 'allowableThicknessExceededN23';
      sign('repair', { inputs: { ...stage(wf, 'repair').inputs, repairType: 'cut', [key]: 'yes' } });
      expect(activeStageId(wf.stages)).toBe(`${nInd === '3' ? '' : 'nqc-'}root-ndt-utrt`);
      expect(wf.stages.some(s => s.id === 'excavation-ndt')).toBeFalse();
    });
  }

  it('an edited Repair rule changes the destination for numbered rounds', () => {
    repair();
    updateStageTemplate(job.trade, 'repair', { thenRules: [{ when: [], to: 'tack' }] });
    sign('repair', { inputs: { ...stage(wf, 'repair').inputs, repairType: 'grind' } });
    expect(activeStageId(wf.stages)).toBe('tack');
    expect(stage(wf, 'root-ndt-mtpt').signed).toBeFalse();
  });
  it('removing the Repair rules removes the coded repair branching', () => {
    repair();
    updateStageTemplate(job.trade, 'repair', { thenRules: [] });
    weldRepair();
    expect(wf.stages.some(s => s.id === 'excavation-ndt')).toBeFalse();
  });
  for (const phase of ['root', 'layer', 'final']) {
    for (const nInd of ['1', '3']) {
      it(`resolves ${phase} rejecting NDT for Nuclear Indicator ${nInd}`, () => {
        job.nInd = nInd;
        wf = newWorkflow(job);
        const ndt = `${nInd === '1' ? 'nqc-' : ''}${phase}-ndt-mtpt`;
        repair(ndt);
        sign('repair', { inputs: { ...stage(wf, 'repair').inputs, repairType: 'grind' } });
        expect(activeStageId(wf.stages)).toBe(ndt);
      });
    }
  }
  it('preserves the Type exception outcome through picking a Type and routes to phase VT/5X', () => {
    job.materialType2 = '12-SS304';
    repair(); weldRepair();
    expect(stage(wf, 'excavation-ndt').typeOptions?.map(t => t.value)).toEqual(['5x']);
    expect(getActivationForStep(stage(wf, 'excavation-ndt')).fields.map(f => f.key)).toEqual(['type']);
    selectExcavation('5x');
    expect(stage(wf, 'excavation-ndt').inputs['typeChangedFromPtTo5x']).toBe('yes');
    sign('excavation-ndt', { result: 'sat' });
    expect(activeStageId(wf.stages)).toBe('root-ndt-vt5x');
    expect(stage(wf, 'root-ndt-vt5x').typeOptions?.map(t => t.value)).toContain('5x');
  });
  it('returning from Excavation cannot restore a Type removed in configuration', () => {
    job.materialType2 = '12-SS304';
    repair(); weldRepair(); selectExcavation('5x');
    setSignoffTypeRows(getSignoffTypeRows().map(r => r.stepId === 'root-ndt-vt5x'
      ? { ...r, types: r.types.filter(t => t.type !== '5x') } : r));
    sign('excavation-ndt', { result: 'sat' });
    expect(stage(wf, 'root-ndt-vt5x').typeOptions?.map(t => t.value)).toEqual(['vt']);
  });
  it('applies enable conditions to added Repair routings', () => {
    setSignoffTypeRows(getSignoffTypeRows().map(r => r.stepId === 'repair'
      ? { ...r, types: r.types.map(t => ({ ...t, enableWhen: [[{ field: 'nInd', op: 'is' as const, values: ['1'] }]] })) } : r));
    repair();
    expect(stage(wf, 'repair').typeOptions).toEqual([]);
    expect(stage(wf, 'repair').inspectionType).toBe('');
  });
  it('an edited Excavation rule replaces the default return to rejecting NDT', () => {
    repair(); weldRepair(); selectExcavation('pt');
    updateStageTemplate(job.trade, 'excavation-ndt', { thenRules: [{ when: [], to: 'fit' }] });
    sign('excavation-ndt', { result: 'sat' });
    expect(activeStageId(wf.stages)).toBe('fit');
  });
  it('an Excavation reject rule can add Engineering Hold instead of returning to Repair', () => {
    repair(); weldRepair(); selectExcavation('pt');
    updateStageTemplate(job.trade, 'excavation-ndt', { rejectRules: [{ when: [], to: 'engineering-hold' }], rejectRulesEdited: true });
    sign('excavation-ndt', { result: 'unsat' });
    expect(activeStageId(wf.stages)).toBe('engineering-hold');
  });
  it('an accepted signoff can add Repair or Engineering Hold', () => {
    updateStageTemplate(job.trade, 'root-ndt-mtpt', { thenRules: [{ when: [], to: 'repair' }] });
    sign('root-ndt-mtpt', { inspectionType: 'pt', signoffType: 'pt', result: 'sat' });
    expect(activeStageId(wf.stages)).toBe('repair');
    updateStageTemplate(job.trade, 'repair', { thenRules: [{ when: [], to: 'engineering-hold' }] });
    sign('repair');
    expect(activeStageId(wf.stages)).toBe('engineering-hold');
  });
  it('Excavation reads edits to the shared inspection form', () => {
    repair(); weldRepair(); selectExcavation('pt');
    setStepFieldConfig([{ typeId: 'pt', fields: [{ key: 'procedureUsed', line: 1 }] }]);
    expect(getActivationForStep(stage(wf, 'excavation-ndt')).fields.map(f => f.key)).toEqual(['procedureUsed']);
  });
});
