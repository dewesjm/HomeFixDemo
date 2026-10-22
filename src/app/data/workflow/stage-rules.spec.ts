import { isRoutingLockedField, isDefinitionLockedField, definitionFieldNote, hasDecision, unsatWithoutRejectTarget, showsType, inspectionTypeRequired } from './stage-rules';
import { resetStepFieldConfig, setStepFieldConfig, DEFAULT_STEP_FIELD_ACTIVATIONS } from './step-field-config';

describe('stage rules', () => {
  it('Release to welding and Defer Tack stay locked for Correct but can come off a definition', () => {
    expect(isRoutingLockedField('fitup-insp', 'releaseToWelding')).toBe(true);
    expect(isDefinitionLockedField('fitup-insp', 'releaseToWelding')).toBe(false);
    expect(isRoutingLockedField('fit', 'deferTack')).toBe(true);
    expect(isDefinitionLockedField('fit', 'deferTack')).toBe(false);
    expect(isDefinitionLockedField('repair', 'repairType')).toBe(true);
  });

  it('notes what a routing-read field does on its own step, and that routing ignores it elsewhere', () => {
    expect(definitionFieldNote('fit', 'deferTack')).toContain('Unticked');
    expect(definitionFieldNote('tack', 'deferTack')).toContain('routing ignores it');
    expect(definitionFieldNote('nqc-fitup-insp', 'releaseToWelding')).toContain('Unticked');
    expect(definitionFieldNote('root-ndt-vt5x', 'releaseToWelding')).toContain('routing ignores it');
    expect(definitionFieldNote('fit-weld-buildup', 'deferTack')).toBe('');
    expect(definitionFieldNote('tack', 'weldProcedure')).toBe('');
  });
});

describe('signoff section rules', () => {
  const ndtTypes = [{ label: 'UT', value: 'ut' }, { label: 'RT', value: 'rt' }];
  afterEach(() => resetStepFieldConfig());

  it('Inspection Results follows the definition; a step with no definition follows its reject target', () => {
    expect(hasDecision({ id: 'root-ndt-utrt', signoffType: '', rejectToStage: 'repair' })).toBe(true);
    expect(hasDecision({ id: 'root-weld', signoffType: '', rejectToStage: 'fit' })).toBe(false);
    expect(hasDecision({ id: 'added-step', signoffType: '', rejectToStage: 'fit' })).toBe(true);
    expect(hasDecision({ id: 'added-step', signoffType: '', rejectToStage: '' })).toBe(false);
  });

  it('UNSAT with no reject target cannot be signed', () => {
    expect(unsatWithoutRejectTarget({ result: 'unsat', rejectToStage: '' })).toBe(true);
    expect(unsatWithoutRejectTarget({ result: 'sat', rejectToStage: '' })).toBe(false);
    expect(unsatWithoutRejectTarget({ result: 'unsat', rejectToStage: 'repair' })).toBe(false);
  });

  it('Type shows only while its own definition lists it, and is required only when shown', () => {
    expect(showsType({ id: 'root-ndt-utrt', typeOptions: ndtTypes })).toBe(true);
    expect(inspectionTypeRequired({ id: 'root-ndt-utrt', typeOptions: ndtTypes })).toBe(true);
    setStepFieldConfig(DEFAULT_STEP_FIELD_ACTIVATIONS.map(a => a.stepId === 'root-ndt-utrt' ? { ...a, fields: a.fields.filter(f => f.key !== 'type') } : a));
    expect(showsType({ id: 'root-ndt-utrt', typeOptions: ndtTypes })).toBe(false);
    expect(inspectionTypeRequired({ id: 'root-ndt-utrt', typeOptions: ndtTypes })).toBe(false);
  });
});
