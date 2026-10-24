import { isRoutingLockedField } from '../../signoff-definition/stage-rules';
import { snapshotInputs } from '../../signoff-definition/stage-display';
import { formInputFields, formSignoffFields } from '../../signoff-definition/form-fields';
import { JOBS, Job } from '../../../data/jobs';
import { buildStages } from '../../routing/build-stages';
import { stageFromTemplate, nextRepairStage, excavationNdtStage } from '../../routing/added-steps';
import { WorkflowStage } from '../../model/workflow-types';
import {
  setStepFieldConfig,
  resetStepFieldConfig,
  DEFAULT_TYPE_DEFINITIONS,
} from '../../signoff-definition/step-field-config';
import { procedures, gwpOptionsForMaterials, FILLER_METAL_TYPE_OPTIONS } from '../../../data/procedures';
import {
  typedRequirementError, visibleStageFields, stageFieldOptions, hiddenFieldsWithValues,
  StageFormContext,
} from './stage-form';
import { typeChange } from './type-change';
import { typeValues } from '../../signoff-definition/stage-rules';

const job = (over: Partial<Job> = {}): Job => ({ ...JOBS.find(j => j.trade === 'Welding')!, mcl1: 'STD', mcl2: 'STD', nInd: '3', ...over });
const ctxFor = (j: Job, offListUnlocked = false): StageFormContext => ({ job: j, stages: buildStages(j), offListUnlocked });
const stageOf = (j: Job, id: string, change: Partial<WorkflowStage> = {}): WorkflowStage => ({ ...buildStages(j).find(s => s.id === id)!, ...change });
const field = (s: WorkflowStage, key: string) => formInputFields(s).find(f => f.key === key)!;

describe('joint-form stage-form', () => {
  for (const method of ['VT', '5X']) {
    it(`uses ${method} in both the Root question and answer choices`, () => {
      const j = job({ ndtRoot: method });
      const root = stageOf(j, 'root-weld');
      const question = visibleStageFields(root, ctxFor(j)).find(f => f.key === 'performed5x')!;
      expect(question.label).toBe(`Did you perform ${method} inspection and was it successful?`);
      expect(question.options!.every(o => o.label.includes(method))).toBeTrue();
    });
  }
  it('keeps a recorded weld color selectable after it is removed from the admin list', () => {
    const j = job();
    const stage = stageOf(j, 'root-ndt-vt5x', { inputs: { weldColor: 'retired-color' } });
    const result = stageFieldOptions({ key: 'weldColor', label: 'Weld Color', type: 'select', options: [] }, stage, ctxFor(j));
    expect(result.options).toEqual([{ label: 'retired-color', value: 'retired-color' }]);
  });

  it('a typed PH/IP requirement on an engineering override must be a number or NC', () => {
    const tack = stageOf(job(), 'tack', { engineeringEntry: true, inputs: { phMin: 'abc', phMax: '300', ipMin: 'NC' } });
    expect(typedRequirementError(tack, field(tack, 'phMin'))).toBe('PH Min must be a number or NC');
    expect(typedRequirementError(tack, field(tack, 'phMax'))).toBe('');
    expect(typedRequirementError(tack, field(tack, 'ipMin'))).toBe('');
    expect(typedRequirementError({ ...tack, engineeringEntry: false }, field(tack, 'phMin'))).toBe('');
  });

  it('another Type carries its definition\'s fields (Affected Item is drawn by its form); switching back restores the step\'s own', () => {
    const fit = stageOf(job(), 'fit');
    const buildup = typeChange('Welding', fit, 'weld-buildup');
    expect(buildup).toEqual(jasmine.objectContaining({ inspectionType: 'weld-buildup', signoffType: 'weld-buildup' }));
    const keys = formInputFields({ ...fit, ...buildup }).map(f => f.key);
    expect(keys).toContain('weldProcedure');
    expect(keys).toContain('fillerMetalMic');
    expect(keys).not.toContain('affectedItem');
    const back = typeChange('Welding', { ...fit, ...buildup }, 'fit');
    expect(formInputFields({ ...fit, ...back })).toEqual([]);
    expect(formSignoffFields({ ...fit, ...back }).map(f => f.key)).toContain('deferTack');
  });

  it('picking a Type clears the form: Layer\'s Final Weld and an NDT Type both blank what was typed', () => {
    const j = job();
    const layer = typeChange('Welding', stageOf(j, 'root-layer', { inputs: { wtn: 'x' }, signoffInputs: { comments: 'c' } }), 'final-weld');
    expect(layer).toEqual(jasmine.objectContaining({ signoffType: 'final-weld', inputs: {}, signoffInputs: {} }));
    const ndt = buildStages(j).find(s => /-ndt-/.test(s.id) && !!s.typeOptions?.length)!;
    const v = ndt.typeOptions![0].value;
    const change = typeChange('Welding', { ...ndt, inputs: { procedureUsed: 'p' } }, v);
    expect(change).toEqual(jasmine.objectContaining({ inspectionType: v, signoffType: v, inputs: {} }));
    expect(formInputFields({ ...ndt, ...change }).map(f => f.key)).toContain('procedureUsed');
  });

  it('Fit as Weld Build-Up shows the fields its own Signoff Type Form lists', () => {
    const j = job({ nInd: '1' });
    const fit = { ...stageOf(j, 'fit'), ...typeChange('Welding', stageOf(j, 'fit'), 'weld-buildup') };
    expect(visibleStageFields(fit, ctxFor(j)).map(f => f.key)).toContain('weldPosition');
    const def = DEFAULT_TYPE_DEFINITIONS.find(a => a.typeId === 'weld-buildup')!;
    setStepFieldConfig([{ ...def, fields: def.fields.filter(f => f.key !== 'weldPosition') }]);
    try {
      expect(visibleStageFields(fit, ctxFor(j)).map(f => f.key)).not.toContain('weldPosition');
    } finally {
      resetStepFieldConfig();
    }
  });

  for (const nInd of ['1', '2', '3']) {
    it(`shows and records the distinct repair limit for indicator ${nInd}, with editable form conditions`, () => {
      const j = job({ nInd, rtRoot: '360' });
      const ctx = ctxFor(j);
      const repair = stageFromTemplate(nextRepairStage([], j), { originPhase: 'root' });
      const key = nInd === '1' ? 'allowableThicknessExceededN1' : 'allowableThicknessExceededN23';
      const fields = visibleStageFields(repair, ctx);
      expect(fields.map(f => f.key)).toEqual(['repairType', key]);
      expect(fields.find(f => f.key === key)!.label).toContain(nInd === '1' ? '3/8 inch' : '3/16 inch');
      expect(isRoutingLockedField('repair-2', key)).toBeTrue();
      const snapshot = snapshotInputs({ ...repair, inputs: { ...repair.inputs, [key]: 'yes' } }, fields, []);
      expect(snapshot.find(input => input.label.includes(nInd === '1' ? '3/8 inch' : '3/16 inch'))?.value).toBe('Yes');
      try {
        const def = DEFAULT_TYPE_DEFINITIONS.find(d => d.typeId === 'repair')!;
        setStepFieldConfig([{ ...def, fields: def.fields.map(f => f.key === key
          ? { ...f, showIf: { all: [{ source: 'jointDetail' as const, key: 'nInd', equals: 'unknown' }] } } : f) }]);
        expect(visibleStageFields(repair, ctx).map(f => f.key)).not.toContain(key);
      } finally { resetStepFieldConfig(); }
    });
  }

  it('Repair and Excavation NDT rounds read their Signoff Type Form', () => {
    const j = job({ rtRoot: '360', ndtEach: 'VT' });
    const stages = buildStages(j);
    const ctx: StageFormContext = { job: j, stages, offListUnlocked: false };
    const repair2 = stageFromTemplate(nextRepairStage([{ id: 'repair' }]), { originPhase: 'root' });
    expect(repair2.id).toBe('repair-2');
    expect(visibleStageFields(repair2, ctx).map(f => f.key)).toEqual(['repairType', 'allowableThicknessExceededN23']);
    /* "exceeded" only when the rejected phase has an RT/UT step */
    expect(visibleStageFields({ ...repair2, inputs: { originPhase: 'layer' } }, ctx).map(f => f.key)).toEqual(['repairType']);

    const exc = (type: string) => visibleStageFields({ ...stageFromTemplate(excavationNdtStage(type)), inspectionType: type, signoffType: type }, ctx).map(f => f.key);
    expect(exc('rt')).toContain('degreeRt');
    expect(exc('rt')).not.toContain('idAccessible');
    expect(exc('mt')).toContain('idAccessible');
    expect(exc('mt')).not.toContain('penetrantType');
    expect(exc('pt')).toContain('penetrantType');

    /* a saved definition applies to every round */
    try {
      setStepFieldConfig(DEFAULT_TYPE_DEFINITIONS.map(a => a.typeId === 'repair' ? { ...a, fields: [{ key: 'repairType' }] } : a));
      expect(visibleStageFields(repair2, ctx).map(f => f.key)).toEqual(['repairType']);
    } finally { resetStepFieldConfig(); }
  });

  it('Weld Position shows only for N Ind. 1; override fields stay hidden while switched off', () => {
    const keys = (j: Job) => visibleStageFields(stageOf(j, 'tack'), ctxFor(j)).map(f => f.key);
    expect(keys(job({ nInd: '1' }))).toContain('weldPosition');
    expect(keys(job({ nInd: '3' }))).not.toContain('weldPosition');
    expect(keys(job()).some(k => k.startsWith('override'))).toBeFalse();
  });

  it('Tack hides filler when a consumable insert is used or neither part requires traceability; Root keeps it', () => {
    const FILLER = ['fillerMetalType', 'fillerMetalSize', 'fillerMetalMic'];
    const keys = (j: Job, id: string, fab: Record<string, string> = {}) =>
      visibleStageFields(stageOf(j, id), { ...ctxFor(j), fab }).map(f => f.key);
    const traced = job({ mcl1: 'MC-I', jointDesign: 'C-24' });
    expect(FILLER.every(k => keys(traced, 'tack').includes(k))).toBeTrue();
    expect(FILLER.every(k => keys(traced, 'deferred-tack').includes(k))).toBeTrue();
    expect(FILLER.some(k => keys(job({ jointDesign: 'C-24' }), 'tack').includes(k))).toBeFalse();
    expect(FILLER.some(k => keys(job({ mcl1: 'MC-I', jointDesign: 'C-18' }), 'tack').includes(k))).toBeFalse();
    expect(FILLER.some(k => keys(traced, 'tack', { revisedJointDesign: 'c-18' }).includes(k))).toBeFalse();
    expect(FILLER.every(k => keys(job({ jointDesign: 'C-18' }), 'root-weld').includes(k))).toBeTrue();
  });

  it('Weld Color shows on VT, required, only when either Material Type is titanium', () => {
    const keys = (j: Job, type: string) =>
      visibleStageFields(stageOf(j, 'root-ndt-vt5x', typeValues(type)), ctxFor(j)).map(f => f.key);
    expect(keys(job({ materialType1: '61-TI64', materialType2: '02-CS' }), 'vt')).toContain('weldColor');
    expect(keys(job({ materialType1: '02-CS', materialType2: '60-TICP' }), 'vt')).toContain('weldColor');
    expect(keys(job({ materialType1: '02-CS', materialType2: '12-SS304' }), 'vt')).not.toContain('weldColor');
    expect(keys(job({ materialType1: '61-TI64', materialType2: '61-TI64' }), '5x')).not.toContain('weldColor');
    expect(field(stageOf(job(), 'root-ndt-vt5x', typeValues('vt')), 'weldColor').required).toBeTrue();
  });

  it('Fit under Weld Build-Up shows Tack\'s fields even before its own fields are swapped', () => {
    const j = job();
    const fit = stageOf(j, 'fit', { signoffType: 'weld-buildup' });
    expect(visibleStageFields(fit, ctxFor(j)).map(f => f.key)).toContain('wtn');
  });

  it('GWP lists the GWPs for the job\'s materials, keeps an off-list value, and opens fully under a Foreman Override', () => {
    const j = job();
    const tack = stageOf(j, 'tack');
    const qualified = gwpOptionsForMaterials(j.materialType1, j.materialType2).map(o => o.value);
    expect(stageFieldOptions(field(tack, 'weldProcedure'), tack, ctxFor(j)).options!.map(o => o.value)).toEqual(qualified);
    const offList = { ...tack, inputs: { weldProcedure: 'W-OFF' } };
    expect(stageFieldOptions(field(tack, 'weldProcedure'), offList, ctxFor(j)).options!.map(o => o.value)).toEqual([...qualified, 'W-OFF']);
    const all = new Set(procedures().map(p => p.gwp));
    expect(stageFieldOptions(field(tack, 'weldProcedure'), tack, ctxFor(j, true)).options!.length).toBe(all.size);
  });

  it('Filler Metal Type narrows to the WPS the GWP+WTN resolves to', () => {
    const j = job();
    const proc = procedures()[0];
    const tack = stageOf(j, 'tack', { inputs: { weldProcedure: proc.gwp, wtn: proc.wtn } });
    expect(stageFieldOptions(field(tack, 'fillerMetalType'), tack, ctxFor(j)).options!.map(o => o.value)).toEqual(
      FILLER_METAL_TYPE_OPTIONS.filter(o => proc.fillerMetalTypes.includes(o.value)).map(o => o.value));
    expect(stageFieldOptions(field(tack, 'fillerMetalType'), tack, ctxFor(j, true)).options).toBe(FILLER_METAL_TYPE_OPTIONS);
  });

  it('engineering override turns the assigned fields and PH/IP requirements into text boxes', () => {
    const j = job();
    const tack = stageOf(j, 'tack', { engineeringEntry: true });
    expect(stageFieldOptions(field(tack, 'weldProcedure'), tack, ctxFor(j)).type).toBe('text');
    expect(stageFieldOptions(field(tack, 'phMin'), tack, ctxFor(j)).type).toBe('text');
  });

  it('finds dependent fields left holding a value after their trigger changed', () => {
    const stage = stageOf(job(), 'tack', { inputs: { phMin: 'NC', actualPhMin: 'NC' } });
    const def = DEFAULT_TYPE_DEFINITIONS.find(d => d.typeId === 'tack')!;
    setStepFieldConfig([{ ...def, fields: [...def.fields, { key: 'portionInspected' }] }]);
    try {
      const current = { ...stage, inputs: { partial: '', portionInspected: 'left over' } };
      expect(hiddenFieldsWithValues(current).map(f => f.key)).toContain('portionInspected');
      expect(hiddenFieldsWithValues({ ...current, inputs: { partial: 'yes', portionInspected: 'shown' } })).toEqual([]);
    } finally { resetStepFieldConfig(); }
  });
});
