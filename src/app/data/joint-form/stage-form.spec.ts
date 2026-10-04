import { JOBS, Job } from '../jobs';
import { buildStages, stageFromTemplate, StageTemplate, WorkflowStage } from '../workflow';
import { procedures, gwpOptionsForMaterials, FILLER_METAL_TYPE_OPTIONS } from '../procedures';
import {
  typedRequirementError, rtDegreeRequired, fitFieldsForType, visibleStageFields, stageFieldOptions, hiddenFieldsWithValues, startsGroup,
  StageFormContext,
} from './stage-form';

const job = (over: Partial<Job> = {}): Job => ({ ...JOBS.find(j => j.trade === 'Welding')!, mcl1: 'STD', mcl2: 'STD', nInd: '3', ...over });
const ctxFor = (j: Job, offListUnlocked = false): StageFormContext => ({ job: j, stages: buildStages(j), offListUnlocked });
const stageOf = (j: Job, id: string, change: Partial<WorkflowStage> = {}): WorkflowStage => ({ ...buildStages(j).find(s => s.id === id)!, ...change });
const field = (s: WorkflowStage, key: string) => s.fields.find(f => f.key === key)!;

describe('joint-form stage-form', () => {
  it('a typed PH/IP requirement on an engineering override must be a number or NC', () => {
    const tack = stageOf(job(), 'tack', { engineeringEntry: true, inputs: { phMin: 'abc', phMax: '300', ipMin: 'NC' } });
    expect(typedRequirementError(tack, field(tack, 'phMin'))).toBe('PH Min must be a number or NC');
    expect(typedRequirementError(tack, field(tack, 'phMax'))).toBe('');
    expect(typedRequirementError(tack, field(tack, 'ipMin'))).toBe('');
    expect(typedRequirementError({ ...tack, engineeringEntry: false }, field(tack, 'phMin'))).toBe('');
  });

  it('RT degree required: Root from rtRoot, Final from rtFinal, Layer none', () => {
    const j = job({ rtRoot: '360', rtFinal: '60' });
    expect(rtDegreeRequired(j, { id: 'root-ndt-utrt' } as WorkflowStage)).toBe('360');
    expect(rtDegreeRequired(j, { id: 'final-ndt-utrt' } as WorkflowStage)).toBe('60');
    expect(rtDegreeRequired(j, { id: 'layer-ndt-utrt' } as WorkflowStage)).toBe('');
  });

  it('Fit under Weld Build-Up gets Tack\'s fields plus Affected Item; plain Fit keeps its own', () => {
    const buildup = fitFieldsForType('Welding', 'weld-buildup').map(f => f.key);
    expect(buildup).toContain('weldProcedure');
    expect(buildup).toContain('overrideNote');
    expect(buildup[buildup.length - 1]).toBe('affectedItem');
    expect(fitFieldsForType('Welding', 'fit')).toEqual([]);
  });

  it('Weld Position shows only for N Ind. 1; override fields stay hidden while switched off', () => {
    const keys = (j: Job) => visibleStageFields(stageOf(j, 'tack'), ctxFor(j)).map(f => f.key);
    expect(keys(job({ nInd: '1' }))).toContain('weldPosition');
    expect(keys(job({ nInd: '3' }))).not.toContain('weldPosition');
    expect(keys(job()).some(k => k.startsWith('override'))).toBeFalse();
  });

  it('Weld Color shows on VT, required, only when either Material Type is titanium', () => {
    const keys = (j: Job, type: string) =>
      visibleStageFields(stageOf(j, 'root-ndt-vt5x', { inspectionType: type }), ctxFor(j)).map(f => f.key);
    expect(keys(job({ materialType1: '61-TI64', materialType2: '02-CS' }), 'vt')).toContain('weldColor');
    expect(keys(job({ materialType1: '02-CS', materialType2: '60-TICP' }), 'vt')).toContain('weldColor');
    expect(keys(job({ materialType1: '02-CS', materialType2: '12-SS304' }), 'vt')).not.toContain('weldColor');
    expect(keys(job({ materialType1: '61-TI64', materialType2: '61-TI64' }), '5x')).not.toContain('weldColor');
    expect(field(stageOf(job(), 'root-ndt-vt5x'), 'weldColor').required).toBeTrue();
  });

  it('Fit under Weld Build-Up shows Tack\'s fields even before its own fields are swapped', () => {
    const j = job();
    const fit = stageOf(j, 'fit', { routingType: 'weld-buildup', fields: [] });
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

  it('finds dependent fields left holding a value after their trigger changed, and the trigger fields', () => {
    const tpl: StageTemplate = { id: 'x', label: 'X', required: true, signoffFields: [], fields: [
      { key: 'kind', label: 'Kind', type: 'select' },
      { key: 'detail', label: 'Detail', type: 'text', showIf: { key: 'kind', equals: 'a' } },
    ] };
    const stage = stageFromTemplate(tpl, { kind: 'b', detail: 'left over' });
    expect(hiddenFieldsWithValues(stage).map(f => f.key)).toEqual(['detail']);
    expect(hiddenFieldsWithValues({ ...stage, inputs: { kind: 'a', detail: 'shown' } })).toEqual([]);
    expect(startsGroup(stage, stage.fields[0])).toBeTrue();
    expect(startsGroup(stage, stage.fields[1])).toBeFalse();
  });
});
