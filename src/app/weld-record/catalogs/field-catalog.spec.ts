import { JOBS, Job } from '../../data/jobs';
import { conditionField, conditionFields, conditionRequirements, qualConditions, setQualConditions } from '../qualifications/qual-conditions';
import { buildConditionContext } from '../signoff-definition/condition-context';
import { evaluateCondition } from '../signoff-definition/field-conditions';
import { conditionText } from '../signoff-definition/field-rules';
import { WorkflowStage } from '../model/workflow-types';
import { newWorkflow } from '../routing/build-stages';
import { FIELD_CATALOG, FORM_FIELDS, lookupCatalogField } from './field-catalog';
import { JOINT_AND_FABRICATION_FIELDS, JOINT_DETAIL_FIELDS, ROUTING_CONDITION_FIELDS, allStepAnswerFields, catalogField, formFieldValues, fieldChoiceLabel, jointOrFabricationField, readsFabrication, stageConditionFields, stepAnswerFieldsBefore } from './field-choices';
import { RECORDED_SCREENS } from './field-catalog.recording';
import { exceptionConditionFields } from '../attribute-codes/exception-text';
import { clauseChoices } from '../admin/admin-signoff-type-definition/condition-choices';
import { conditionFieldGroups } from '../admin/admin-routing/condition-editing';
import { recheckFabricationRules } from '../routing/on-signoff/route-changes';
import { getTemplates, updateStageTemplate } from '../routing/routing-settings-rules';
import { ConditionRule, conditionsMatch, usesFabrication, usesStepAnswers } from '../routing/routing-conditions';

const job = (more: Partial<Job> = {}): Job => ({ ...JOBS[0], trade: 'Welding', ...more });
const stage = { id: 'tack', signed: false, inputs: {}, signoffInputs: {}, inspectionType: '', result: null } as unknown as WorkflowStage;

const keysOf = (fields: { key: string }[]) => fields.map(f => f.key);

describe('field catalog', () => {
  it('has each key once across all four Sources', () => {
    const keys = keysOf(FIELD_CATALOG);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...new Set(FIELD_CATALOG.map(f => f.source))]).toEqual(['Joint Details', 'Calculated', 'Fabrication', 'Signoff Form']);
  });

  it('gives each Source\'s rows what that Source needs', () => {
    for (const f of FIELD_CATALOG) {
      if (f.source === 'Signoff Form') expect(f.type).withContext(f.key).toBeTruthy();
      else {
        expect(typeof f.get).withContext(f.key).toBe('function');
        expect(Array.isArray(f.values)).withContext(f.key).toBeTrue();
      }
      if (f.source === 'Joint Details') expect(f.stepAnswer).withContext(f.key).toBeFalsy();
      if (f.source === 'Fabrication') {
        expect(f.key.startsWith('fab.')).withContext(f.key).toBeTrue();
        expect(f.label.startsWith('Fabrication: ')).withContext(f.key).toBeTrue();
        expect(f.stepAnswer).withContext(f.key).toBeTrue();
      }
    }
  });

  it('keeps form lookups to Signoff Form rows, with the two Drawing Rev fields apart', () => {
    expect(lookupCatalogField('ss')).toBeUndefined();
    expect(lookupCatalogField('deferTack')?.source).toBe('Signoff Form');
    expect(FORM_FIELDS.every(f => f.source === 'Signoff Form')).toBeTrue();
    expect(catalogField('drawingRev')?.label).toBe('Drawing Rev');
    expect(catalogField('fab.drawingRev')?.label).toBe('Fabrication: Drawing Rev Execution');
  });

  it('keeps admin-edited option lists live and values imported at load', () => {
    expect(Object.getOwnPropertyDescriptor(lookupCatalogField('weldPosition'), 'options')?.get).toBeDefined();
    expect(lookupCatalogField('degreeRt')?.options?.length).toBeGreaterThan(0);
    expect(lookupCatalogField('weldProcess')?.defaultDisabledIf).toEqual({ all: [{ source: 'stageProperty', key: 'engineeringEntry', equals: '' }] });
  });

  it('builds the fixed answers from their Signoff Form rows', () => {
    const signed = (id: string, signoffInputs: Record<string, string>, inputs: Record<string, string> = {}) => [{ id, signed: true, inputs, signoffInputs }];
    expect(catalogField('fitDeferTack')?.get(job(), signed('fit', { deferTack: 'yes' }))).toBe('Yes');
    expect(catalogField('inspReleaseToWelding')?.get(job(), signed('nqc-fitup-insp', {}, { releaseToWelding: 'yes' }))).toBe('Yes');
    expect(catalogField('inspReleaseToWelding')?.get(job(), [])).toBe('');
    expect(keysOf(allStepAnswerFields('Welding')).filter(k => /deferTack|releaseToWelding/i.test(k))).toEqual(['fitDeferTack', 'inspReleaseToWelding', 'inspReleaseToWelding']);
  });

  it('treats only Fabrication-dependent rows as reading Fabrication', () => {
    expect(readsFabrication(catalogField('fab.id1'))).toBeTrue();
    expect(readsFabrication(catalogField('consumableInsertRequired'))).toBeTrue();
    expect(readsFabrication(catalogField('controlledMaterial'))).toBeFalse();
    expect(usesFabrication([[{ field: 'fabricationShipboard', op: 'is', values: ['Yes'] }]])).toBeTrue();
    expect(usesFabrication([[{ field: 'controlledMaterial', op: 'is', values: ['Yes'] }]])).toBeFalse();
  });
});

describe('what each screen offers', () => {
  const sameKeys = (fields: { key: string }[], recorded: string[]) => expect([...keysOf(fields)].sort()).toEqual([...recorded].sort());
  const steps = () => getTemplates()['Welding'];

  it('keeps the keys recorded when the catalogs were merged', () => {
    sameKeys(JOINT_DETAIL_FIELDS, RECORDED_SCREENS.personas);
    sameKeys(JOINT_AND_FABRICATION_FIELDS, RECORDED_SCREENS.clauses);
    sameKeys(ROUTING_CONDITION_FIELDS, RECORDED_SCREENS.routing);
    sameKeys(FORM_FIELDS, RECORDED_SCREENS.form);
    sameKeys(allStepAnswerFields('Welding'), RECORDED_SCREENS.answers);
    sameKeys(exceptionConditionFields(), RECORDED_SCREENS.exceptions);
    for (const t of steps()) sameKeys(stageConditionFields(t), (RECORDED_SCREENS.self[t.id] ?? []).map(k => `self.${k}`));
    const all = new Set(RECORDED_SCREENS.answers);
    for (const t of steps()) expect(keysOf(stepAnswerFieldsBefore('Welding', t.id)).every(k => all.has(k))).withContext(t.id).toBeTrue();
  });

  it('leaves Fabrication-dependent rows out of personas and Signoff Type to Routing', () => {
    const keys = keysOf(JOINT_DETAIL_FIELDS);
    expect(keys).toContain('controlledMaterial');
    expect(keys).not.toContain('consumableInsertRequired');
    expect(keys.some(k => k.startsWith('fab.'))).toBeFalse();
  });

  it('heads Routing Settings droplists with the Source, in order', () => {
    const t = steps().find(s => s.id === 'fit')!;
    const groups = conditionFieldGroups([...stageConditionFields(t), ...ROUTING_CONDITION_FIELDS, ...stepAnswerFieldsBefore('Welding', 'fit')]);
    expect(groups.map(g => g.label)).toEqual(['This routing', 'Joint Details', 'Calculated', 'Fabrication', 'Earlier routings (once signed)']);
    expect(keysOf(groups.find(g => g.label === 'Calculated')!.fields)).toEqual(keysOf(FIELD_CATALOG.filter(f => f.source === 'Calculated')));
  });

  it('names a droplist field with its Source once, leaving rule text to the plain label', () => {
    expect(fieldChoiceLabel(catalogField('nInd')!)).toBe('Joint Details: N Ind.');
    expect(fieldChoiceLabel(catalogField('controlledMaterial')!)).toBe('Calculated: Controlled Material');
    expect(fieldChoiceLabel(catalogField('fab.id1')!)).toBe('Fabrication: Joining Item MIC');
    expect(fieldChoiceLabel(catalogField('fitDeferTack')!)).toBe('Fit: Defer Tack (once Fit is signed)');
    expect(fieldChoiceLabel({ label: 'Returning inspection Type' })).toBe('Returning inspection Type');
    expect(catalogField('nInd')!.label).toBe('N Ind.');
  });

  it('starts each flat list name with the Source, without doubling Fabrication', () => {
    const labels = clauseChoices([{ key: 'x', label: 'X', yesNo: true, values: [] }], false).map(c => c.label);
    const at = (label: string) => labels.indexOf(label);
    expect(labels[0]).toBe('This form: X');
    expect(at('Calculated: Controlled Material')).toBeGreaterThan(at('Joint Details: N Ind.'));
    expect(at('Fabrication: Drawing Rev Execution')).toBeGreaterThan(at('Calculated: Controlled Material'));
    expect(labels.slice(-3)).toEqual(['Routing ID matches', 'Rejected phase has RT/UT', 'Engineering override']);
    expect(labels.some(l => l.startsWith('Fabrication: Fabrication'))).toBeFalse();
  });
});

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

  it('still answers a blank joint-only Calculated row, unlike a blank Fabrication-dependent one', () => {
    const require = { op: 'all' as const, items: ['Q1'] };
    const none = job({ attributeCode1: '', attributeCode2: '', attributeCode3: '', attributeCode4: '' });
    setQualConditions([{ when: { op: 'all', items: [{ field: 'attributeCodes', op: 'isNot', values: ['X'] }] }, require, type: 'vt' }]);
    expect(conditionRequirements(none, { inspectionType: 'vt' }, {}, []).length).toBe(1);
    expect(conditionField('attributeCodes')?.group).toBe('Calculated');
  });

  it('reads the shipboard entry once Fit is signed', () => {
    const require = { op: 'all' as const, items: ['Q1'] };
    setQualConditions([{ when: { op: 'all', items: [{ field: 'fabricationShipboard', op: 'isNot', values: ['Yes'] }] }, require, type: 'vt' }]);
    expect(conditionRequirements(job(), { inspectionType: 'vt' }, {}, []).length).toBe(0);
    expect(conditionRequirements(job(), { inspectionType: 'vt' }, {}, [{ id: 'fit', signed: true, inputs: {}, signoffInputs: {} }]).length).toBe(1);
  });
});
