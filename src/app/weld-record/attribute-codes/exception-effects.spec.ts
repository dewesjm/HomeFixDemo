import { JOBS, Job } from '../../data/jobs';
import { getShops, shopValue } from '../../data/shops';
import { WorkflowStage } from '../model/workflow-types';
import { buildStages, newWorkflow } from '../routing/build-stages';
import { activeStageId, setRoutingFrom } from '../routing/current-routing';
import { applySignedFlags } from '../routing/route-changes';
import { routeSignoff } from '../routing/signoff-routing';
import { rtDegreeRequired } from '../signoff-definition/rt-degree-minimum';
import { DEFAULT_TYPE_DEFINITIONS, setStepFieldConfig, resetStepFieldConfig } from '../signoff-definition/step-field-config';
import { typeValues } from '../signoff-definition/stage-rules';
import { attributeAccessError } from './attribute-validation';
import { SEED_EXCEPTIONS, setAttributeCodeExceptions } from './attribute-code-exceptions';
import { typesForAccessibleAnswer } from './exception-effects';

const job = (code: string, more: Partial<Job> = {}): Job => ({
  ...JOBS[0], trade: 'Welding', nInd: '3', ndtRoot: 'VT', ndtEach: '', ndtFinal: 'VT', rtRoot: 'NA', rtFinal: 'NA',
  attributeCode1: '', attributeCode2: code, attributeCode3: '', attributeCode4: '', ...more,
});
const stage = (stages: WorkflowStage[], id: string) => stages.find(s => s.id === id);
const types = (s: WorkflowStage | undefined) => s?.typeOptions?.map(o => o.value);
const signed = (stages: WorkflowStage[], id: string, inputs: Record<string, string> = {}) =>
  stages.map(s => s.id === id ? { ...s, signed: true, signedAt: '2026-01-01', inputs: { ...s.inputs, ...inputs } } : s);

describe('Attribute Code Exceptions', () => {
  beforeEach(() => { localStorage.clear(); resetStepFieldConfig(); });
  afterEach(() => { localStorage.clear(); resetStepFieldConfig(); });

  it('PU adds Final MT/PT offering only PT and Final UT/RT offering only UT', () => {
    const stages = buildStages(job('PU'));
    expect(types(stage(stages, 'final-ndt-mtpt'))).toEqual(['pt']);
    expect(types(stage(stages, 'final-ndt-utrt'))).toEqual(['ut']);
    expect(stage(stages, 'final-ndt-mtpt')!.required).toBeTrue();
  });

  it('matches the code in any slot, any case, and adds the NQC row for N Ind. 1', () => {
    const stages = buildStages(job('', { nInd: '1', attributeCode4: ' pu ' }));
    expect(stage(stages, 'nqc-final-ndt-mtpt')).toBeDefined();
    expect(stage(stages, 'final-ndt-mtpt')).toBeUndefined();
  });

  it('FC drops Final MT/PT and UT/RT and leaves Final VT/5X offering only VT', () => {
    const stages = buildStages(job('FC', { ndtFinal: 'MT', rtFinal: '100' }));
    expect(stage(stages, 'final-ndt-mtpt')).toBeUndefined();
    expect(stage(stages, 'final-ndt-utrt')).toBeUndefined();
    expect(types(stage(stages, 'final-ndt-vt5x'))).toEqual(['vt']);
  });

  it('LR adds RT to Layer MT/PT with a 60 degree minimum', () => {
    const s = stage(buildStages(job('LR', { ndtEach: 'PT' })), 'layer-ndt-mtpt')!;
    expect(types(s)).toContain('rt');
    expect(rtDegreeRequired(undefined, { ...s, ...typeValues('rt') })).toBe('60');
  });

  it('an RT signoff needs the highest of the RT form rule and the code minimum', () => {
    const j = job('RI', { rtFinal: '100' });
    const s = { ...stage(buildStages(j), 'final-ndt-utrt')!, ...typeValues('rt') };
    expect(rtDegreeRequired(j, s)).toBe('100');
    setStepFieldConfig(DEFAULT_TYPE_DEFINITIONS.map(d => d.typeId !== 'rt' ? d
      : { ...d, fields: d.fields.map(f => f.key === 'degreeRt' ? { key: f.key, line: f.line } : f) }));
    expect(rtDegreeRequired(j, s)).toBe('60');
  });

  it('the RT form rule reads the joint RT Degree with no code', () => {
    const j = job('', { rtRoot: '75' });
    const s = { ...stage(buildStages(j), 'root-ndt-utrt')!, ...typeValues('rt') };
    expect(rtDegreeRequired(j, s)).toBe('75');
  });

  it('PR asks ID accessible on Final MT/PT; Yes drops Final RT/UT, No keeps it', () => {
    const j = job('PR', { ndtFinal: 'PT', rtFinal: '60' });
    const stages = buildStages(j);
    const mtpt = stage(stages, 'final-ndt-mtpt')!;
    expect(stage(stages, 'final-ndt-utrt')!.required).toBeTrue();
    expect(attributeAccessError({ ...mtpt, ...typeValues('pt') })).toBe('Answer ID accessibility for this signoff');
    expect(attributeAccessError({ ...mtpt, ...typeValues('pt'), inputs: { idAccessible: 'no' } })).toBe('');
    expect(stage(applySignedFlags(signed(stages, 'final-ndt-mtpt', { idAccessible: 'no' }), j), 'final-ndt-utrt')!.required).toBeTrue();
    expect(stage(applySignedFlags(signed(stages, 'final-ndt-mtpt', { idAccessible: 'yes' }), j), 'final-ndt-utrt')!.required).toBeFalse();
    expect(stage(stages, 'root-ndt-utrt')?.attributeRules).toBeUndefined();
  });

  it('PR reads the NQC Final MT/PT on an N Ind. 1 joint', () => {
    const j = job('PR', { nInd: '1', ndtFinal: 'PT', rtFinal: '60' });
    const stages = applySignedFlags(signed(buildStages(j), 'nqc-final-ndt-mtpt', { idAccessible: 'yes' }), j);
    expect(stage(stages, 'nqc-final-ndt-utrt')!.required).toBeFalse();
  });

  it('IA offers PT or MT and asks ID accessible without narrowing them', () => {
    const s = stage(buildStages(job('IA')), 'final-ndt-mtpt')!;
    expect(types(s)).toEqual(['pt', 'mt']);
    expect(attributeAccessError({ ...s, ...typeValues('mt') })).toBe('Answer ID accessibility for this signoff');
    expect(typesForAccessibleAnswer({ ...s, inputs: { idAccessible: 'no' } }).map(o => o.value)).toEqual(['pt', 'mt']);
  });

  it('GV waits for the recorded Weld Process: GTAW on Root drops Root MT/PT and leaves only 5X', () => {
    const j = job('GV', { ndtRoot: 'PT' });
    let stages = buildStages(j);
    expect(stage(stages, 'root-ndt-mtpt')!.required).toBeTrue();
    stages = applySignedFlags(signed(stages, 'root-weld', { weldProcess: 'gtaw' }), j);
    expect(stage(stages, 'root-ndt-mtpt')!.required).toBeFalse();
    expect(types(stage(stages, 'root-ndt-vt5x'))).toEqual(['5x']);
  });

  it('SI offers VT on Root UT/RT once Fit is signed with a shop Fabrication Location', () => {
    const j = job('SI', { rtRoot: '100' });
    const ashore = getShops().find(s => !s.shipboard)!;
    let stages = buildStages(j);
    expect(types(stage(stages, 'root-ndt-utrt'))).not.toContain('vt');
    stages = applySignedFlags(signed(stages, 'fit'), j, { location: shopValue(ashore.name) });
    expect(types(stage(stages, 'root-ndt-utrt'))).toContain('vt');
  });

  it('IA adds Layer MT/PT and Layer goes on to it instead of back to Layer', () => {
    const j = job('IA');
    const wf = newWorkflow(j);
    expect(stage(wf.stages, 'layer-ndt-mtpt')).toBeDefined();
    const at = wf.stages.findIndex(s => s.id === 'root-layer');
    const ready = { ...wf, stages: setRoutingFrom(wf.stages.map((s, i) => i < at ? { ...s, signed: true, signedAt: '2026-01-01' } : s), 'root-layer') };
    const layer = { ...ready, stages: ready.stages.map(s => s.id === 'root-layer' ? { ...s, ...typeValues('interim') } : s) };
    expect(activeStageId(routeSignoff(layer, j, 'root-layer').stages)).toBe('layer-ndt-mtpt');
  });

  it('an edited table changes the routing; no row = no change', () => {
    setAttributeCodeExceptions(SEED_EXCEPTIONS.filter(r => r.code !== 'PU'));
    const stages = buildStages(job('PU'));
    expect(stage(stages, 'final-ndt-mtpt')).toBeUndefined();
  });

  it('a regular routing and its NQC row have separate rows', () => {
    setAttributeCodeExceptions(SEED_EXCEPTIONS.filter(r => !(r.code === 'PU' && r.routing === 'nqc-final-ndt-mtpt')));
    expect(stage(buildStages(job('PU')), 'final-ndt-mtpt')).toBeDefined();
    expect(stage(buildStages(job('PU', { nInd: '1' })), 'nqc-final-ndt-mtpt')).toBeUndefined();
  });
});
