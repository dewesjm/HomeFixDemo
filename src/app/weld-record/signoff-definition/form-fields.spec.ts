import { addTestJob } from '../../data/jobs';
import { buildStages } from '../routing/build-stages';
import { stageFromTemplate } from '../routing/added-steps';
import { getTemplates } from '../routing/stage-templates';
import { stageConditionFields, stepAnswerFieldsBefore, conditionsMatch } from '../routing/step-conditions';
import { conditionFields } from '../qualifications/qual-conditions';
import { setStepFieldConfig, resetStepFieldConfig, DEFAULT_TYPE_DEFINITIONS } from './step-field-config';
import { formInputFields, formSignoffFields } from './form-fields';
import { visibleSignoffFields } from './shown-fields';
import { snapshotInputs } from './stage-display';
import { stageFieldErrors } from '../joint-page/rules/sign-validation';

describe('Catalog and Type forms as the only field definitions', () => {
  const job = () => Object.assign(addTestJob(), { nInd: '3' });
  afterEach(() => resetStepFieldConfig());
  it('never copies definitions onto new routings or templates', () => {
    for (const s of [...buildStages(job()), ...getTemplates()['Welding']]) {
      expect('fields' in s).withContext(s.id).toBeFalse();
      expect('signoffFields' in s).withContext(s.id).toBeFalse();
    }
  });
  it('Defer Tack remains a catalog checkbox even if a legacy list claims it is text', () => {
    const j = job();
    const fit = buildStages(j).find(s => s.id === 'fit')!;
    Object.assign(fit, { signoffFields: [{ key: 'deferTack', label: 'Wrong label', type: 'text' }] });
    const field = visibleSignoffFields(fit, j, {}).find(f => f.key === 'deferTack')!;
    expect(field.type).toBe('checkbox');
    expect(field.label).toBe('Defer Tack');
    fit.signoffInputs['deferTack'] = 'yes';
    expect(snapshotInputs(fit, [], [field])).toContain({ label: 'Defer Tack', value: 'Yes' });
  });
  it('a required checkbox must be checked, including when stored with the signoff', () => {
    const j = job();
    const fit = buildStages(j).find(s => s.id === 'fit')!;
    setStepFieldConfig([{ typeId: 'fit', fields: [{ key: 'deferTack', required: true }] }]);
    const ctx = { job: j, fab: {}, fabErrors: {}, visibleFields: [] };
    expect(stageFieldErrors(fit, ctx)['fit:deferTack']).toBeTruthy();
    fit.signoffInputs['deferTack'] = 'no';
    expect(stageFieldErrors(fit, ctx)['fit:deferTack']).toBeTruthy();
    fit.signoffInputs['deferTack'] = 'yes';
    expect(stageFieldErrors(fit, ctx)['fit:deferTack']).toBeUndefined();
  });
  it('has no legacy fallback for a routing without a Type form', () => {
    const s = stageFromTemplate({ id: 'custom', label: 'Custom', required: true });
    Object.assign(s, { fields: [{ key: 'wtn', type: 'text' }] });
    expect(formInputFields(s)).toEqual([]);
    expect(formSignoffFields(s)).toEqual([]);
  });
  it('routing conditions include every offered Type’s form, including Fit’s Weld Build-Up', () => {
    const fields = stepAnswerFieldsBefore('Welding', 'root-layer');
    expect(fields.some(f => f.key === 'step.fit.wtn')).toBeTrue();
    const own = stageConditionFields(getTemplates()['Welding'].find(t => t.id === 'fit')!);
    expect(own.find(f => f.key === 'self.deferTack')?.values).toEqual(['yes', '']);
    expect(own.find(f => f.key === 'self.wtn')).toBeDefined();
  });
  it('routing and qualification condition pickers refresh after forms change', () => {
    const template = getTemplates()['Welding'].find(t => t.id === 'tack')!;
    expect(stageConditionFields(template).some(f => f.key === 'self.wtn')).toBeTrue();
    conditionFields();
    setStepFieldConfig([{ typeId: 'tack', fields: [{ key: 'deferTack' }] }]);
    expect(stageConditionFields(template).some(f => f.key === 'self.wtn')).toBeFalse();
    expect(stepAnswerFieldsBefore('Welding', 'root-layer').some(f => f.key === 'step.tack.wtn')).toBeFalse();
    const checkbox = conditionFields().find(f => f.key === 'step:deferTack')!;
    expect(checkbox.options().map(o => o.value)).toEqual(['Yes', 'No']);
    expect(checkbox.get({ job: job(), step: { signoffInputs: { deferTack: 'yes' } } })).toBe('Yes');
    const j = job();
    const tack = { ...buildStages(j).find(s => s.id === 'tack')!, signed: true, inputs: { wtn: '123' } };
    expect(conditionsMatch([[{ field: 'step.tack.wtn', op: 'is', values: ['123'] }]], j, [tack])).toBeFalse();
    resetStepFieldConfig();
    expect(conditionsMatch([[{ field: 'step.tack.wtn', op: 'is', values: ['123'] }]], j, [tack])).toBeTrue();
  });
  it('an empty form stays empty even when values have already been recorded', () => {
    const tack = { ...buildStages(job()).find(s => s.id === 'tack')!, inputs: { wtn: 'saved' } };
    setStepFieldConfig([{ typeId: 'tack', fields: [] }, ...DEFAULT_TYPE_DEFINITIONS.filter(d => d.typeId !== 'tack')]);
    expect(formInputFields(tack)).toEqual([]);
    expect(tack.inputs['wtn']).toBe('saved');
  });
});
