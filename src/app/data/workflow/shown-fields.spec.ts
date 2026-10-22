import { JOBS, Job } from '../jobs';
import { buildStages } from './build-stages';
import { WorkflowStage } from './types';
import { DEFAULT_STEP_FIELD_ACTIVATIONS, WELD_BUILDUP_DEFINITION, definitionHas, resetStepFieldConfig, setStepFieldConfig } from './step-field-config';
import { definitionStageFields, fieldsShown } from './shown-fields';

const job = (over: Partial<Job> = {}): Job => ({ ...JOBS.find(j => j.trade === 'Welding')!, nInd: '1', ...over });
const stageOf = (j: Job, id: string, change: Partial<WorkflowStage> = {}): WorkflowStage =>
  ({ ...buildStages(j).find(s => s.id === id)!, ...change });
const buildupOf = (j: Job) => stageOf(j, 'fit', { signoffType: 'weld-buildup', fields: definitionStageFields({ id: 'fit', signoffType: 'weld-buildup' }) });

describe('shown-fields', () => {
  afterEach(() => resetStepFieldConfig());

  it('Fit as Weld Build-Up reads its own definition, and lists Affected Item', () => {
    const j = job();
    const fit = buildupOf(j);
    expect(definitionHas(fit, 'affectedItem')).toBeTrue();
    expect(definitionHas(stageOf(j, 'fit'), 'affectedItem')).toBeFalse();
    expect(fieldsShown(fit, j).map(f => f.key)).toContain('weldPosition');
  });

  it('History and Correct leave out a field taken off the definition', () => {
    const j = job();
    const def = DEFAULT_STEP_FIELD_ACTIVATIONS.find(a => a.stepId === WELD_BUILDUP_DEFINITION)!;
    setStepFieldConfig([{ ...def, fields: def.fields.filter(f => f.key !== 'weldPosition' && f.key !== 'affectedItem') }]);
    const fit = buildupOf(j);
    expect(fieldsShown(fit, j).map(f => f.key)).not.toContain('weldPosition');
    expect(definitionHas(fit, 'affectedItem')).toBeFalse();
  });

  it('a field drawn by another step form is an ordinary field elsewhere (Consumable Insert and Defer Tack on Tack)', () => {
    const j = job();
    const def = DEFAULT_STEP_FIELD_ACTIVATIONS.find(a => a.stepId === 'tack')!;
    setStepFieldConfig([{ ...def, fields: [...def.fields, { key: 'consumableInsertType', showIf: { all: [] } }, { key: 'deferTack' }, { key: 'affectedItem' }] }]);
    const keys = fieldsShown(stageOf(j, 'tack'), j).map(f => f.key);
    expect(keys).toContain('consumableInsertType');
    expect(keys).toContain('deferTack');
    expect(keys).not.toContain('affectedItem');
  });
});
