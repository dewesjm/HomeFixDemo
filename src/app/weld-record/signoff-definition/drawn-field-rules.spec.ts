import { JOBS } from '../../data/jobs';
import { signProblems, stageFieldErrors, SignContext } from '../joint-page/rules/sign-validation';
import { WorkflowStage } from '../model/workflow-types';
import { newWorkflow } from '../routing/build-stages';
import { routeSignoff } from '../routing/on-signoff/signoff-routing';
import '../routing/routing-settings-rules';
import { buildConditionContext } from './condition-context';
import { FieldActivation, TypeDefinition, getStepFieldConfig, setStepFieldConfig } from './step-field-config';
import { hasBuiltInShowRule, hasFixedRules } from './field-rules';
import { drawnFieldRule, visibleSignoffFields, withoutHiddenAnswers } from './shown-fields';

const job = JOBS[0];
const NEVER = { all: [{ source: 'field' as const, key: 'nothing', equals: 'x' }] };

describe('form rules on the fields drawn their own way', () => {
  let saved: TypeDefinition[];
  beforeEach(() => { saved = getStepFieldConfig(); });
  afterEach(() => { setStepFieldConfig(saved); localStorage.clear(); });

  const onField = (key: string, patch: Partial<FieldActivation>) =>
    setStepFieldConfig(saved.map(d => ({ ...d, fields: d.fields.map(a => a.key === key ? { ...a, ...patch } : a) })));
  const fixture = (base: string, more: Partial<WorkflowStage> = {}) => {
    const wf = newWorkflow(job);
    const id = wf.stages.find(s => s.id === base || s.id === `nqc-${base}`)!.id;
    const stage = { ...wf.stages.find(s => s.id === id)!, ...more };
    return { wf: { ...wf, stages: wf.stages.map(s => s.id === id ? stage : s) }, stage };
  };
  const signCtx = (stages: WorkflowStage[], referenceCount = 0): SignContext =>
    ({ job, fab: {}, fabErrors: {}, visibleFields: [], stages, referenceCount });

  it('only Type keeps fixed rules', () => {
    for (const key of ['comments', 'decision', 'references', 'affectedItem', 'deferTack', 'releaseToWelding']) {
      expect(hasFixedRules(key)).withContext(key).toBeFalse();
      expect(hasBuiltInShowRule(key)).withContext(key).toBeFalse();
    }
    expect(hasFixedRules('type')).toBeTrue();
    expect(hasBuiltInShowRule('type')).toBeTrue();
  });

  it('Comments follows Show when and Required like any field', () => {
    const { stage } = fixture('fitup-insp');
    const comments = () => visibleSignoffFields(stage, job, {}).find(f => f.key === 'comments');
    expect(comments()?.required).toBeFalse();
    onField('comments', { required: true });
    expect(comments()?.required).toBeTrue();
    expect(signProblems(stage, signCtx([stage])).join()).toContain('Comments');
    onField('comments', { showIf: NEVER });
    expect(comments()).toBeUndefined();
  });

  it('Inspection Results is required by default, and not while hidden', () => {
    const { stage } = fixture('fitup-insp');
    expect(signProblems(stage, signCtx([stage]))).toContain('Choose SAT or UNSAT');
    onField('decision', { showIf: NEVER });
    expect(signProblems(stage, signCtx([stage]))).not.toContain('Choose SAT or UNSAT');
    expect(stageFieldErrors(stage, signCtx([stage]))[`${stage.id}:__decision`]).toBeUndefined();
  });

  it('a hidden Inspection Results does not route on an answer left behind', () => {
    const { wf, stage } = fixture('fitup-insp', { result: 'unsat' });
    onField('decision', { showIf: NEVER });
    const signed = routeSignoff(wf, job, stage.id).stages.find(s => s.id === stage.id)!;
    expect(signed.signed).toBeTrue();
    expect(signed.result).toBeNull();
  });

  it('a hidden checkbox routing reads counts as unticked', () => {
    const { stage } = fixture('fit', { signoffInputs: { deferTack: 'yes', comments: 'kept' } });
    expect(withoutHiddenAnswers(stage, job, [stage], {}).signoffInputs['deferTack']).toBe('yes');
    onField('deferTack', { showIf: NEVER });
    const out = withoutHiddenAnswers(stage, job, [stage], {});
    expect(out.signoffInputs['deferTack']).toBeUndefined();
    expect(out.signoffInputs['comments']).toBe('kept');
  });

  it('References can be required, and a hidden one is not', () => {
    const { stage } = fixture('fitup-insp');
    const key = `${stage.id}:references`;
    setStepFieldConfig(saved.map(d => ({ ...d, fields: [...d.fields.filter(a => a.key !== 'references'), { key: 'references', required: true }] })));
    expect(stageFieldErrors(stage, signCtx([stage], 0))[key]).toBe('References is required');
    expect(stageFieldErrors(stage, signCtx([stage], 1))[key]).toBeUndefined();
    setStepFieldConfig(saved.map(d => ({ ...d, fields: [...d.fields.filter(a => a.key !== 'references'), { key: 'references', required: true, showIf: NEVER }] })));
    expect(stageFieldErrors(stage, signCtx([stage], 0))[key]).toBeUndefined();
  });

  it('a field not on the form is not shown', () => {
    const { stage } = fixture('fitup-insp');
    expect(drawnFieldRule(stage, buildConditionContext(stage, job, [stage], {}), 'affectedItem'))
      .toEqual({ shown: false, disabled: false, required: false });
  });
});
