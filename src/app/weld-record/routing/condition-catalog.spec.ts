import { JOBS, Job } from '../../data/jobs';
import { conditionField, conditionFields, conditionRequirements, qualConditions, setQualConditions } from '../qualifications/qual-conditions';
import { buildConditionContext } from '../signoff-definition/condition-context';
import { evaluateCondition } from '../signoff-definition/field-conditions';
import { migrateConditionClauses } from '../signoff-definition/condition-catalog-migration';
import { conditionText } from '../signoff-definition/field-rules';
import { WorkflowStage } from '../model/workflow-types';
import { newWorkflow } from './build-stages';
import { FABRICATION_CONDITION_FIELDS, JOINT_AND_FABRICATION_FIELDS, ROUTING_CONDITION_FIELDS, allStepAnswerFields, catalogField, formFieldValues, jointOrFabricationField, stageConditionFields } from './condition-catalog';
import { recheckFabricationRules } from './route-changes';
import { getTemplates, updateStageTemplate } from './stage-templates';
import { ConditionRule, conditionsMatch, usesFabrication, usesStepAnswers } from './step-conditions';

const job = (more: Partial<Job> = {}): Job => ({ ...JOBS[0], trade: 'Welding', ...more });
const stage = { id: 'tack', signed: false, inputs: {}, signoffInputs: {}, inspectionType: '', result: null } as unknown as WorkflowStage;

describe('condition catalog', () => {
  it('lists each field once, under one name', () => {
    const keys = ROUTING_CONDITION_FIELDS.map(f => f.key);
    const labels = JOINT_AND_FABRICATION_FIELDS.map(f => f.label);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(labels).size).toBe(labels.length);
    expect(catalogField('titanium')).toBeUndefined();
    expect(catalogField('materialTraceability')).toBeUndefined();
    expect(catalogField('material.titanium')?.label).toBe('Either material is titanium');
    expect(catalogField('controlledMaterial')?.label).toBe('Controlled Material');
  });

  it('has every Fabrication value, read from the joint\'s Fabrication data', () => {
    const mic = catalogField('fab.id1')!;
    expect(FABRICATION_CONDITION_FIELDS.map(f => f.group)).toEqual(FABRICATION_CONDITION_FIELDS.map(() => 'Fabrication'));
    expect(mic.label).toBe('Fabrication: Joining Item MIC');
    expect(mic.get(job(), [], { id1: 'MIC-1' })).toBe('MIC-1');
    expect(mic.get(job(), [])).toBe('');
    expect(conditionsMatch([[{ field: 'fab.id1', op: 'is', values: ['mic-1'] }]], job(), [], undefined, { id1: 'MIC-1' })).toBeTrue();
  });

  it('keeps the original and the current Joint Design apart', () => {
    const design = (key: string) => jointOrFabricationField(key)!;
    const j = job({ jointDesign: 'C-18' });
    expect(design('jdInsert').get(j, [], { revisedJointDesign: 'c-31' })).toBe('Yes');
    expect(design('consumableInsertRequired').get(j, [], { revisedJointDesign: 'c-31' })).toBe('No');
    expect(design('consumableInsertRequired').label).toBe('Current Joint Design needs Consumable Insert');
  });

  it('shows checkboxes as Yes and No', () => {
    expect(formFieldValues({ type: 'checkbox' }).map(o => o.label)).toEqual(['Yes', 'No']);
    expect(stageConditionFields({ id: 'fit' }).find(f => f.key === 'self.deferTack')?.valueLabel?.('yes') ?? 'Yes').toBe('Yes');
  });

  it('form conditions read the catalog and keep their sentences', () => {
    const titanium = job({ materialType1: 'nothing', materialType2: 'nothing' });
    const cond = { all: [{ source: 'jointDetail' as const, key: 'material.titanium', equals: 'No' }] };
    expect(evaluateCondition(cond, buildConditionContext(stage, titanium, []))).toBeTrue();
    expect(conditionText(cond)).toBe('the joint is not titanium');
    const fab = { all: [{ source: 'jointDetail' as const, key: 'fab.location', equals: 'SHOP-1' }] };
    expect(evaluateCondition(fab, buildConditionContext(stage, job(), [], { location: 'SHOP-1' }))).toBeTrue();
  });
});

describe('saved form conditions', () => {
  it('convert to the catalog entries and Yes / No', () => {
    const saved = [{ typeId: 'x', fields: [{ key: 'a', showIf: { all: [
      { source: 'jointDetail', key: 'titanium', equals: 'yes' },
      { any: [{ source: 'jointDetail', key: 'materialTraceability', equals: '' }, { source: 'jointDetail', key: 'backingRingRequired' }] },
      { source: 'jointDetail', key: 'ndtRoot', anyOf: ['5X', 'VT'] },
      { source: 'field', key: 'titanium', equals: 'yes' },
    ] } }] }];
    const converted = migrateConditionClauses(saved);
    expect(converted[0].fields[0].showIf.all).toEqual([
      { source: 'jointDetail', key: 'material.titanium', equals: 'Yes' },
      { any: [{ source: 'jointDetail', key: 'controlledMaterial', equals: 'No' }, { source: 'jointDetail', key: 'backingRingRequired', equals: 'Yes' }] },
      { source: 'jointDetail', key: 'ndtRoot', anyOf: ['5X', 'VT'] },
      { source: 'field', key: 'titanium', equals: 'yes' },
    ] as typeof converted[0]['fields'][0]['showIf']['all']);
    expect(migrateConditionClauses(converted)).toEqual(converted);
  });
});

describe('rules on Fabrication', () => {
  const rule: ConditionRule[] = [[{ field: 'fab.weldMemo', op: 'is', values: ['M1'] }]];
  const before = getTemplates()['Welding'].find(t => t.id === 'tack')!.includeWhen;
  afterEach(() => { updateStageTemplate('Welding', 'tack', { includeWhen: before }); localStorage.clear(); });

  it('count as later answers and are re-checked when a value changes', () => {
    expect(usesStepAnswers(rule)).toBeTrue();
    expect(usesFabrication(rule)).toBeTrue();
    updateStageTemplate('Welding', 'tack', { includeWhen: rule });
    const j = job();
    const stages = newWorkflow(j).stages;
    const tack = (s: WorkflowStage[]) => s.find(x => x.id === 'tack')!;
    expect(tack(stages).required).toBeFalse();
    expect(tack(recheckFabricationRules(stages, j, { weldMemo: 'M1' })).required).toBeTrue();
    expect(tack(recheckFabricationRules(stages, j, { weldMemo: 'other' })).required).toBeFalse();
  });

  it('leave joints alone when no rule reads Fabrication', () => {
    const j = job({ attributeCode1: '', attributeCode2: '', attributeCode3: '', attributeCode4: '' }), stages = newWorkflow(j).stages;
    expect(recheckFabricationRules(stages, j, { weldMemo: 'M1' })).toBe(stages);
  });
});

describe('Qualifications', () => {
  const saved = qualConditions();
  afterEach(() => setQualConditions(saved));

  it('offers Fabrication and matches only once it is filled in', () => {
    expect(conditionField('fab.id1')?.group).toBe('Fabrication');
    const require = { op: 'all' as const, items: ['Q1'] };
    setQualConditions([{ when: { op: 'all', items: [{ field: 'fab.id1', op: 'isNot', values: ['X'] }] }, require, type: 'vt' }]);
    expect(conditionRequirements(job(), { inspectionType: 'vt' }, {}).length).toBe(0);
    expect(conditionRequirements(job(), { inspectionType: 'vt' }, { id1: 'MIC-1' }).length).toBe(1);
  });

  it('offers the same catalog as Routing Settings, each field once', () => {
    const keys = conditionFields().map(f => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const f of [...ROUTING_CONDITION_FIELDS, ...allStepAnswerFields('Welding')]) expect(keys).toContain(f.key);
    expect(conditionField('step.root-weld.weldProcess')?.group).toBe('Routing answers');
  });

  it('matches a routing answer once that routing is signed', () => {
    const require = { op: 'all' as const, items: ['Q1'] };
    setQualConditions([{ when: { op: 'all', items: [{ field: 'step.root-weld.weldProcess', op: 'isNot', values: ['smaw'] }] }, require, type: 'vt' }]);
    const root = (signed: boolean, weldProcess: string) => [{ id: 'root-weld', signed, inputs: { weldProcess }, signoffInputs: {} }];
    expect(conditionRequirements(job(), { inspectionType: 'vt' }, {}, root(false, 'gtaw')).length).toBe(0);
    expect(conditionRequirements(job(), { inspectionType: 'vt' }, {}, root(true, 'gtaw')).length).toBe(1);
    expect(conditionRequirements(job(), { inspectionType: 'vt' }, {}, root(true, 'smaw')).length).toBe(0);
  });

  it('reads the shipboard entry once Fit is signed', () => {
    const require = { op: 'all' as const, items: ['Q1'] };
    setQualConditions([{ when: { op: 'all', items: [{ field: 'fabricationShipboard', op: 'isNot', values: ['Yes'] }] }, require, type: 'vt' }]);
    expect(conditionRequirements(job(), { inspectionType: 'vt' }, {}, []).length).toBe(0);
    expect(conditionRequirements(job(), { inspectionType: 'vt' }, {}, [{ id: 'fit', signed: true, inputs: {}, signoffInputs: {} }]).length).toBe(1);
  });
});
