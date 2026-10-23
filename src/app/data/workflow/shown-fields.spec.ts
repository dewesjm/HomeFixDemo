import { JOBS, Job } from '../jobs';
import { buildStages } from './build-stages';
import { WorkflowStage } from './types';
import { WELD_BUILDUP_DEFINITION } from './step-ids';
import { DEFAULT_STEP_FIELD_ACTIVATIONS, definitionHas, resetStepFieldConfig, setStepFieldConfig } from './step-field-config';
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

  it("shows Root's 5X question only when NDT Root is 5X", () => {
    expect(fieldsShown(stageOf(job({ ndtRoot: '5X' }), 'root-weld'), job({ ndtRoot: '5X' })).map(f => f.key)).toContain('performed5x');
    expect(fieldsShown(stageOf(job({ ndtRoot: 'PT' }), 'root-weld'), job({ ndtRoot: 'PT' })).map(f => f.key)).not.toContain('performed5x');
  });

  it('shows an NDT step’s Defect Code only on RT and UNSAT', () => {
    const j = JOBS.find(x => x.trade === 'Welding' && buildStages(x).some(s => s.id.endsWith('-ndt-utrt')))!;
    const id = buildStages(j).find(s => s.id.endsWith('-ndt-utrt'))!.id;
    const keys = (change: Partial<WorkflowStage>) => fieldsShown(stageOf(j, id, change), j).map(f => f.key);
    expect(keys({ inspectionType: 'rt', result: 'unsat' })).toContain('defectCode');
    expect(keys({ inspectionType: 'rt', result: 'sat' })).not.toContain('defectCode');
    expect(keys({ inspectionType: 'ut', result: 'unsat' })).not.toContain('defectCode');
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
