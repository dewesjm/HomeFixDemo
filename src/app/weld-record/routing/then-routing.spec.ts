import { JOBS, Job } from '../../data/jobs';
import { STORAGE } from '../../data/storage-keys';
import { buildStages, newWorkflow } from './build-stages';
import { activeStageId, isStageLocked, setRoutingFrom } from './current-routing';
import { routeSignoff } from './signoff-routing';
import { getTemplates, updateStageTemplate } from './stage-templates';
import { getRoutingSignoffTypes, setRoutingSignoffTypes } from '../signoff-definition/routing-signoff-types';
import { typeValues } from '../signoff-definition/stage-rules';
import { RejectRule } from './step-conditions';

const rule = (to: string, value = 'tack'): RejectRule => ({
  when: [{ field: 'self.inspectionType', op: 'is', values: [value] }], to,
});
const job = (more: Partial<Job> = {}): Job => ({ ...JOBS[0], trade: 'Welding', nInd: '3',
  ndtEach: '', ndtRoot: 'VT', ndtFinal: 'VT', ...more });
const workflowAt = (j: Job, id: string) => {
  const wf = newWorkflow(j);
  const at = wf.stages.findIndex(s => s.id === id);
  return { ...wf, stages: setRoutingFrom(wf.stages.map((s, i) => i < at
    ? { ...s, signed: true, signedAt: '2026-01-01' } : s), id) };
};

describe('Then go to routing', () => {
  beforeEach(() => {
    localStorage.clear();
    setRoutingSignoffTypes(getRoutingSignoffTypes());
  });
  afterEach(() => {
    localStorage.clear();
    setRoutingSignoffTypes(getRoutingSignoffTypes());
  });

  it('uses the first matching rule and passes intervening routings without signing them', () => {
    const j = job();
    updateStageTemplate('Welding', 'tack', { thenRules: [rule('root-layer'), rule('fit')] });
    const wf = workflowAt(j, 'tack');
    const result = routeSignoff(wf, j, 'tack');
    expect(activeStageId(result.stages)).toBe('root-layer');
    expect(result.stages.find(s => s.id === 'fitup-insp')!.signed).toBeFalse();
    expect(isStageLocked(result.stages, result.stages.findIndex(s => s.id === 'fitup-insp'))).toBeTrue();
    expect(result.reasons.join(' ')).toContain('Then go to rule');
    expect(result.reasons.join(' ')).toContain('Type is Tack');
    expect(wf.stages.find(s => s.id === 'tack')!.signed).toBeFalse();
  });

  it('continues in order when no rule matches', () => {
    const j = job();
    updateStageTemplate('Welding', 'tack', { thenRules: [rule('fit', 'other')] });
    expect(activeStageId(routeSignoff(workflowAt(j, 'tack'), j, 'tack').stages)).toBe('fitup-insp');
  });

  it('starts the same routing and everything after it fresh, counting only self returns', () => {
    const j = job();
    let wf = workflowAt(j, 'fit');
    wf.stages = wf.stages.map(s => s.id === 'fit'
      ? { ...s, ...typeValues('weld-buildup'), inputs: { affectedItems: 'joiningItem' }, repeats: 2 }
      : s.id === 'tack' ? { ...s, inputs: { actualPhMin: '75' } } : s);
    const result = routeSignoff(wf, j, 'fit');
    const fit = result.stages.find(s => s.id === 'fit')!;
    expect(activeStageId(result.stages)).toBe('fit');
    expect(fit.signed).toBeFalse();
    expect(fit.signoffType).toBe('fit');
    expect(fit.inputs).toEqual({});
    expect(fit.repeats).toBe(3);
    expect(result.stages.find(s => s.id === 'tack')!.inputs).toEqual({});
    expect(result.signed.signoffType).toBe('weld-buildup');
    expect(result.routedBack?.fabBefore).toBeDefined();
  });

  it('routes to an earlier routing and blanks its fabrication data', () => {
    const j = job();
    updateStageTemplate('Welding', 'tack', { thenRules: [rule('fit')] });
    const wf = workflowAt(j, 'tack');
    wf.fabricationData = { specificLocation: 'Bay 3' };
    const result = routeSignoff(wf, j, 'tack');
    expect(activeStageId(result.stages)).toBe('fit');
    expect(result.stages.find(s => s.id === 'fit')!.signed).toBeFalse();
    expect(result.fabricationData['specificLocation'] || '').toBe('');
    expect(result.routedBack?.label).toBe('Fit');
    expect(result.stages.find(s => s.id === 'fit')!.repeats ?? 0).toBe(0);
  });

  it('leaves UNSAT on the reject path even when a Then go to rule matches', () => {
    const j = job();
    updateStageTemplate('Welding', 'root-ndt-vt5x', { thenRules: [rule('fit', 'vt')] });
    const wf = workflowAt(j, 'root-ndt-vt5x');
    wf.stages = wf.stages.map(s => s.id === 'root-ndt-vt5x' ? { ...s, ...typeValues('vt'), result: 'unsat' } : s);
    const result = routeSignoff(wf, j, 'root-ndt-vt5x');
    expect(activeStageId(result.stages)).toBe('repair');
    expect(result.reasons.join(' ')).not.toContain('Then go to rule');
  });

  for (const nInd of ['1', '3']) {
    for (const ndtEach of ['VT', '5X', 'MT', 'PT', 'MT/PT']) {
      it(`uses only ${ndtEach} on Layer for Nuclear Indicator ${nInd}, then returns after SAT`, () => {
        const j = job({ nInd, ndtEach });
        let wf = workflowAt(j, 'root-layer');
        const layerNdt = wf.stages.filter(s => s.id.includes('layer-ndt-'));
        expect(layerNdt.length).toBe(1);
        const ndt = layerNdt[0];
        const acceptedLayer = routeSignoff(wf, j, 'root-layer');
        expect(activeStageId(acceptedLayer.stages)).toBe(ndt.id);
        wf = { ...wf, stages: acceptedLayer.stages.map(s => s.id === ndt.id
          ? { ...s, ...typeValues(s.typeOptions![0].value), result: 'sat' } : s) };
        const acceptedNdt = routeSignoff(wf, j, ndt.id);
        expect(activeStageId(acceptedNdt.stages)).toBe('root-layer');
        expect(acceptedNdt.stages.find(s => s.id === 'root-layer')!.repeats ?? 0).toBe(0);
      });
    }
    it(`has no Layer RT/UT routing for Nuclear Indicator ${nInd}`, () => {
      expect(buildStages(job({ nInd, ndtEach: 'UT' })).some(s => s.id.includes('layer-ndt-utrt'))).toBeFalse();
    });
  }

  it('returns from Repair to the rejecting Layer NDT, whose SAT then returns to Layer', () => {
    const j = job({ ndtEach: 'MT' });
    let wf = workflowAt(j, 'root-layer');
    wf = { ...wf, stages: routeSignoff(wf, j, 'root-layer').stages };
    wf.stages = wf.stages.map(s => s.id === 'layer-ndt-mtpt' ? { ...s, ...typeValues('mt'), result: 'unsat' } : s);
    wf = { ...wf, stages: routeSignoff(wf, j, 'layer-ndt-mtpt').stages };
    wf.stages = wf.stages.map(s => s.id === 'repair' ? { ...s, inputs: { ...s.inputs, repairType: 'grind' } } : s);
    wf = { ...wf, stages: routeSignoff(wf, j, 'repair').stages };
    expect(activeStageId(wf.stages)).toBe('layer-ndt-mtpt');
    wf.stages = wf.stages.map(s => s.id === 'layer-ndt-mtpt' ? { ...s, ...typeValues('mt'), result: 'sat' } : s);
    expect(activeStageId(routeSignoff(wf, j, 'layer-ndt-mtpt').stages)).toBe('root-layer');
  });

  it('saves, reloads, reorders and removes Then go to rules', () => {
    const rules = [rule('root-layer'), rule('fit')];
    updateStageTemplate('Welding', 'tack', { thenRules: rules });
    const saved = JSON.parse(localStorage.getItem(STORAGE.stageTemplates)!);
    expect(saved.Welding.find((s: { id: string }) => s.id === 'tack').thenRules).toEqual(rules);
    setRoutingSignoffTypes(getRoutingSignoffTypes());
    expect(getTemplates()['Welding'].find(s => s.id === 'tack')!.thenRules).toEqual(rules);
    updateStageTemplate('Welding', 'tack', { thenRules: [...rules].reverse() });
    expect(getTemplates()['Welding'].find(s => s.id === 'tack')!.thenRules![0].to).toBe('fit');
    updateStageTemplate('Welding', 'tack', { thenRules: [] });
    setRoutingSignoffTypes(getRoutingSignoffTypes());
    expect(getTemplates()['Welding'].find(s => s.id === 'tack')!.thenRules).toEqual([]);
  });
});
