import { JOBS, Job } from '../../data/jobs';
import { buildStages } from '../routing/build-stages';
import { WorkflowStage } from '../model/workflow-types';
import { WELD_BUILDUP_TYPE } from '../../data/signoff-types';
import { DEFAULT_TYPE_DEFINITIONS, FieldActivation, resetStepFieldConfig, setStepFieldConfig } from '../../data/signoff-type-forms';
import { definitionHas } from './signoff-type-form-rules';
import { fieldsShown, visibleSignoffFields } from './shown-fields';
import { jointDesignRequiresInsert, jointDesignRequiresBackingRing } from '../catalogs/field-catalog';
import { typeValues } from './stage-rules';

const job = (over: Partial<Job> = {}): Job => ({ ...JOBS[0], nInd: '1', ...over });
const stageOf = (j: Job, id: string, change: Partial<WorkflowStage> = {}): WorkflowStage =>
  ({ ...buildStages(j).find(s => s.id === id)!, ...change });
const buildupOf = (j: Job) => stageOf(j, 'fit', { signoffType: 'weld-buildup' });

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
    const j = JOBS.find(x => buildStages(x).some(s => s.id.endsWith('-ndt-utrt')))!;
    const id = buildStages(j).find(s => s.id.endsWith('-ndt-utrt'))!.id;
    const keys = (change: Partial<WorkflowStage>) => fieldsShown(stageOf(j, id, change), j).map(f => f.key);
    expect(keys({ ...typeValues('rt'), result: 'unsat' })).toContain('defectCode');
    expect(keys({ ...typeValues('rt'), result: 'sat' })).not.toContain('defectCode');
    expect(keys({ ...typeValues('ut'), result: 'unsat' })).not.toContain('defectCode');
  });

    it('History and Correct leave out a field taken off the definition', () => {
    const j = job();
    const def = DEFAULT_TYPE_DEFINITIONS.find(a => a.typeId === WELD_BUILDUP_TYPE)!;
    setStepFieldConfig([{ ...def, fields: def.fields.filter(f => f.key !== 'weldPosition' && f.key !== 'affectedItem') }]);
    const fit = buildupOf(j);
    expect(fieldsShown(fit, j).map(f => f.key)).not.toContain('weldPosition');
    expect(definitionHas(fit, 'affectedItem')).toBeFalse();
  });

  it('a field drawn by another step form is an ordinary field elsewhere (Consumable Insert and Defer Tack on Tack)', () => {
    const j = job();
    const def = DEFAULT_TYPE_DEFINITIONS.find(a => a.typeId === 'tack')!;
    setStepFieldConfig([{ ...def, fields: [...def.fields, { key: 'consumableInsertType', showIf: { all: [] } }, { key: 'deferTack' }, { key: 'affectedItem' }] }]);
    const keys = fieldsShown(stageOf(j, 'tack'), j).map(f => f.key);
    expect(keys).toContain('consumableInsertType');
    expect(keys).toContain('deferTack');
    expect(keys).not.toContain('affectedItem');
  });
});

describe('shown-fields visibleSignoffFields', () => {
  const fitJob = (over: Partial<Job> = {}): Job => ({ ...JOBS[0], mcl1: 'STD', mcl2: 'STD', jointDesign: 'C-24', ...over });
  const fitOf = (j: Job): WorkflowStage => buildStages(j).find(s => s.id === 'fit')!;
  const keys = (fields: { key: string }[]) => fields.map(f => f.key);
  const required = (j: Job) => keys(visibleSignoffFields(fitOf(j), j, {}).filter(f => f.required));
  afterEach(() => resetStepFieldConfig());

  it('reads the joint design, with Revised Joint Design taking priority', () => {
    expect(jointDesignRequiresInsert(fitJob({ jointDesign: 'C-18' }), {})).toBeTrue();
    expect(jointDesignRequiresInsert(fitJob({ jointDesign: 'C-18' }), { revisedJointDesign: 'c-31' })).toBeFalse();
    expect(jointDesignRequiresBackingRing(fitJob(), { revisedJointDesign: 'c-31' })).toBeTrue();
    expect(jointDesignRequiresInsert(fitJob({ jointDesign: '' }), {})).toBeFalse();
  });

  it('hides insert and backing ring fields the joint design does not call for', () => {
    const plain = fitJob();
    expect(keys(visibleSignoffFields(fitOf(plain), plain, {}))).toEqual(['deferTack', 'comments']);
    const both = fitJob({ jointDesign: 'C-65' });
    expect(keys(visibleSignoffFields(fitOf(both), both, {}))).toEqual(jasmine.arrayContaining(['consumableInsertType', 'backingRingId']));
  });

  it('requires the insert/backing ring MICs only when traceability applies', () => {
    expect(required(fitJob({ jointDesign: 'C-65' }))).toEqual(['consumableInsertType', 'consumableInsertSize', 'backingRingType']);
    expect(required(fitJob({ jointDesign: 'C-65', mcl2: 'MC-I' })))
      .toEqual(['consumableInsertType', 'consumableInsertSize', 'consumableInsertId', 'backingRingType', 'backingRingId']);
    expect(required(fitJob())).toEqual([]);
  });

  it('follows the Fit definition: an unticked field is gone, Required and greyed-out apply', () => {
    const both = fitJob({ jointDesign: 'C-65' });
    setStepFieldConfig(DEFAULT_TYPE_DEFINITIONS.map(a => a.typeId === 'fit' ? { ...a, fields: [
      { key: 'consumableInsertType', required: false },
      { key: 'consumableInsertSize', disabledIf: { all: [{ source: 'jointDetail', key: 'material.titanium', equals: 'No' }] } },
      { key: 'deferTack' },
    ] as FieldActivation[] } : a));
    const shown = visibleSignoffFields(fitOf(both), both, {});
    expect(keys(shown)).toEqual(['consumableInsertType', 'consumableInsertSize', 'deferTack']);
    expect(required(both)).toEqual(['consumableInsertSize']);
    expect(shown.find(f => f.key === 'consumableInsertSize')!.disabled).toBeTrue();
  });

  it('lists Comments on a routing other than Pre-Fit and Fit', () => {
    const j = fitJob();
    expect(keys(visibleSignoffFields(buildStages(j).find(s => s.id === 'tack')!, j, {}))).toEqual(['comments']);
  });
});
