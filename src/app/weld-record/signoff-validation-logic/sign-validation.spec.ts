import { formInputFields } from '../signoff-forms-logic/form-fields';
import { JOBS, Job } from '../../data/jobs';
import { buildStages } from '../routing-logic/build-stages';
import { inspectionTypeRequired } from '../signoff-forms-logic/stage-rules';
import { WorkflowStage } from '../model/workflow-types';
import { DEFAULT_TYPE_DEFINITIONS, setStepFieldConfig, resetStepFieldConfig } from '../../data/signoff-type-forms';
import { FABRICATION_PROBLEM, signProblems, generalSignProblems, stageFieldErrors, errorsAfterBlur, errorsAfterSelect, SignContext } from './sign-validation';
import { visibleSignoffFields } from '../signoff-forms-logic/shown-fields';
import { fabricationErrors } from '../fabrication-logic/fabrication-form';
import { visibleStageFields } from './stage-form';
import { isVerifyRow } from '../catalogs/field-catalog';

const job = (over: Partial<Job> = {}): Job => ({ ...JOBS[0], mcl1: 'STD', mcl2: 'STD', nInd: '3', jointDesign: 'C-24', sfff: '', dssAaa: 'N', ss: 'NS', ...over });
const stageOf = (j: Job, id: string, change: Partial<WorkflowStage> = {}): WorkflowStage => ({ ...buildStages(j).find(s => s.id === id)!, ...change });
const ctxFor = (j: Job, stage: WorkflowStage, fab: Record<string, string> = {}, fabErrors: Record<string, string> = {}): SignContext =>
  ({ job: j, fab, fabErrors, visibleFields: visibleStageFields(stage, { job: j, stages: buildStages(j), offListUnlocked: false }) });
const FULL_FAB = { location: 'ship', drawingRev: 'A', actualThickness: '0.2' };

describe('joint-form sign-validation', () => {
  it('inspection steps with a Type list need the inspection chosen; Fit (whose Type has a default) does not', () => {
    const j = job();
    const ndt = buildStages(j).find(s => s.id.includes('-ndt-') && !!s.typeOptions?.length)!;
    expect(inspectionTypeRequired(ndt)).toBeTrue();
    expect(inspectionTypeRequired(stageOf(j, 'fit'))).toBeFalse();
    expect(inspectionTypeRequired(stageOf(j, 'tack'))).toBeFalse();
  });

  it('Fit and Fit-Up Insp: Fabrication panel errors are one line beside Signoff', () => {
    const j = job();
    const fit = stageOf(j, 'fit');
    expect(generalSignProblems(fit, ctxFor(j, fit, {}, fabricationErrors(j, {})))).toEqual([FABRICATION_PROBLEM]);
    expect(generalSignProblems(fit, ctxFor(j, fit, FULL_FAB))).toEqual([]);
    const insp = stageOf(j, 'fitup-insp');
    expect(generalSignProblems(insp, ctxFor(j, insp, FULL_FAB, { location: 'x' }))).toEqual([FABRICATION_PROBLEM]);
    const tack = stageOf(j, 'tack');
    expect(generalSignProblems(tack, ctxFor(j, tack, {}, { location: 'x' }))).toEqual([]);
  });

  it('Fit-Up Insp needs SAT/UNSAT and every value verified, each on its field', () => {
    const j = job();
    const insp = stageOf(j, 'fitup-insp');
    const fields = signProblems(insp, ctxFor(j, insp, FULL_FAB)).map(p => p.field);
    expect(fields).toContain('__decision');
    expect(fields).toContain('verifyDrawingRev');
    expect(fields).toContain('verifyActualThickness');
    expect(generalSignProblems(insp, ctxFor(j, insp, FULL_FAB))).toEqual([]);
    const verified = { ...insp, result: 'sat' as const, inputs: Object.fromEntries(formInputFields(insp).map(f => [f.key, 'yes'])) };
    expect(signProblems(verified, ctxFor(j, verified, FULL_FAB))).toEqual([]);
  });

  it('Fit-Up Insp shows MIC rows only for parts needing traceability, Revised Joint Design only when entered', () => {
    const rows = (j: Job, fab: Record<string, string> = {}) =>
      visibleStageFields(stageOf(j, 'fitup-insp'), { job: j, stages: buildStages(j), offListUnlocked: false, fab }).map(f => f.key).filter(isVerifyRow);
    expect(rows(job())).toEqual(['verifyDrawingRev', 'verifyActualThickness']);
    expect(rows(job({ mcl1: 'MC-I' }), { revisedJointDesign: 'C-24' }))
      .toEqual(['verifyMic1', 'verifyDrawingRev', 'verifyActualThickness', 'verifyRevisedJointDesign']);
  });

  it('a verify grid needs only its shown, required rows checked', () => {
    const j = job();
    const insp = { ...stageOf(j, 'fitup-insp'), result: 'sat' as const, inputs: { verifyDrawingRev: 'yes', verifyActualThickness: 'yes' } };
    expect(signProblems(insp, ctxFor(j, insp, FULL_FAB))).toEqual([]);
    const review = stageOf(j, 'review-o63');
    expect(signProblems(review, ctxFor(j, review)).some(p => isVerifyRow(p.field ?? ''))).toBeFalse();
  });

  it('a required field the definition adds to a step is checked on signing; other fields on a verify grid are not verify rows', () => {
    const j = job();
    const tack = DEFAULT_TYPE_DEFINITIONS.find(a => a.typeId === 'tack')!;
    const insp = DEFAULT_TYPE_DEFINITIONS.find(a => a.typeId === 'fitup-insp')!;
    setStepFieldConfig([
      { ...tack, fields: [...tack.fields, { key: 'repairType' }] },
      { ...insp, fields: [...insp.fields, { key: 'repairType' }] },
    ]);
    const t = stageOf(j, 'tack');
    expect(stageFieldErrors(t, ctxFor(j, t))['tack:repairType']).toBe('Repair Code is required');
    const i = { ...stageOf(j, 'fitup-insp'), result: 'sat' as const, inputs: { verifyDrawingRev: 'yes', verifyActualThickness: 'yes' } };
    expect(generalSignProblems(i, ctxFor(j, i, FULL_FAB))).toEqual([]);
    expect(stageFieldErrors(i, ctxFor(j, i))['fitup-insp:repairType']).toBe('Repair Code is required');
    resetStepFieldConfig();
  });

  it('RT NDT must record at least the job\'s required degree', () => {
    const j = job({ ndt: 'UT', rtRoot: '360' });
    const rt = buildStages(j).find(s => s.id === 'root-ndt-utrt');
    if (!rt) { pending('seed job has no Root RT/UT step'); return; }
    const stage = { ...rt, inspectionType: 'rt', signoffType: 'rt', inputs: { degreeRt: '60' } };
    expect(stageFieldErrors(stage, ctxFor(j, stage))['root-ndt-utrt:degreeRt']).toBe('Degree of RT Performed must be at least 360');
    expect(errorsAfterSelect({}, stage, j, 'root-ndt-utrt', 'degreeRt')['root-ndt-utrt:degreeRt']).toBe('Degree of RT Performed must be at least 360');
    const matched = { ...stage, inputs: { degreeRt: '360' } };
    expect(errorsAfterSelect({ 'root-ndt-utrt:degreeRt': 'x' }, matched, j, 'root-ndt-utrt', 'degreeRt')['root-ndt-utrt:degreeRt']).toBeUndefined();
    const na = { ...stage, inputs: { degreeRt: 'NA' } };
    expect(stageFieldErrors(na, ctxFor(j, na))['root-ndt-utrt:degreeRt']).toBe('Degree of RT Performed must be at least 360');
  });

  it('RT NDT accepts more than the required degree', () => {
    const j = job({ ndt: 'UT', rtRoot: '60' });
    const rt = buildStages(j).find(s => s.id === 'root-ndt-utrt');
    if (!rt) { pending('seed job has no Root RT/UT step'); return; }
    const more = { ...rt, inspectionType: 'rt', signoffType: 'rt', inputs: { degreeRt: '75' } };
    expect(stageFieldErrors(more, ctxFor(j, more))['root-ndt-utrt:degreeRt']).toBeUndefined();
    const less = { ...rt, inspectionType: 'rt', signoffType: 'rt', inputs: { degreeRt: '10' } };
    expect(stageFieldErrors(less, ctxFor(j, less))['root-ndt-utrt:degreeRt']).toBe('Degree of RT Performed must be at least 60');
  });

  it('field errors: required blanks, Actual Min above Max, and synthetic keys', () => {
    const j = job();
    const tack = stageOf(j, 'tack', { inputs: { actualPhMin: '300', actualPhMax: '200' } });
    const errors = stageFieldErrors(tack, ctxFor(j, tack));
    expect(errors['tack:weldProcedure']).toBe('GWP is required');
    expect(errors['tack:actualPhMax']).toBe('Actual PH Max is below Actual PH Min');
    expect(errors['tack:comments']).toBeUndefined();
    const insp = stageOf(j, 'fitup-insp');
    expect(stageFieldErrors(insp, ctxFor(j, insp))['fitup-insp:__decision']).toBe('Choose SAT or UNSAT');
  });

  it('a required field with its own error message shows that message, empty or on blur', () => {
    const j = job();
    const tack = stageOf(j, 'tack');
    const ctx = ctxFor(j, tack);
    ctx.visibleFields = ctx.visibleFields.map(f => f.key === 'weldProcedure' ? { ...f, requiredMessage: 'Pick the GWP first' } : f);
    expect(stageFieldErrors(tack, ctx)['tack:weldProcedure']).toBe('Pick the GWP first');
    const gwp = ctx.visibleFields.find(f => f.key === 'weldProcedure')!;
    expect(errorsAfterBlur({}, tack, 'tack', gwp)['tack:weldProcedure']).toBe('Pick the GWP first');
  });

  it('Weld Build-Up needs an Affected Item, with its MIC verified when traceability applies', () => {
    const j = job({ mcl1: 'MC-I', joiningItem: 'Pipe A' });
    const fit = stageOf(j, 'fit', { signoffType: 'weld-buildup' });
    expect(stageFieldErrors(fit, ctxFor(j, fit))['fit:affectedItem']).toBe('Select at least one Affected Item');
    const picked = { ...fit, inputs: { affectedItems: 'joiningItem' } };
    expect(stageFieldErrors(picked, ctxFor(j, picked))['fit:affectedItem']).toBe('Please verify MIC for Pipe A');
    const verified = { ...fit, inputs: { affectedItems: 'joiningItem', micVerified1: 'yes' } };
    expect(stageFieldErrors(verified, ctxFor(j, verified))['fit:affectedItem']).toBeUndefined();
  });

  it('Weld Build-Up: an Affected Item MIC verified row taken off the definition is no longer required', () => {
    const j = job({ mcl1: 'MC-I', joiningItem: 'Pipe A' });
    const def = DEFAULT_TYPE_DEFINITIONS.map(a => a.typeId === 'weld-buildup'
      ? { ...a, fields: a.fields.filter(f => f.key !== 'affectedMicVerified1') } : a);
    setStepFieldConfig(def);
    const fit = stageOf(j, 'fit', { signoffType: 'weld-buildup', inputs: { affectedItems: 'joiningItem' } });
    expect(stageFieldErrors(fit, ctxFor(j, fit))['fit:affectedItem']).toBeUndefined();
    resetStepFieldConfig();
  });

  it('a required Comments blocks signing on any routing', () => {
    const j = job();
    setStepFieldConfig(DEFAULT_TYPE_DEFINITIONS.map(a => a.typeId === 'tack'
      ? { ...a, fields: a.fields.map(f => f.key === 'comments' ? { ...f, required: true } : f) } : a));
    const tack = stageOf(j, 'tack');
    expect(stageFieldErrors(tack, ctxFor(j, tack))['tack:comments']).toBe('Comments is required');
    resetStepFieldConfig();
  });

  it('on blur: a filled field loses its error and a fixed Min/Max order clears the Max error', () => {
    const j = job();
    const tack = stageOf(j, 'tack', { inputs: { weldProcedure: 'W-101', actualPhMin: '100', actualPhMax: '200' } });
    const gwp = formInputFields(tack).find(f => f.key === 'weldProcedure')!;
    const min = formInputFields(tack).find(f => f.key === 'actualPhMin')!;
    const before = { 'tack:weldProcedure': 'GWP is required', 'tack:actualPhMax': 'Actual PH Max is below Actual PH Min' };
    expect(errorsAfterBlur(before, tack, 'tack', gwp)['tack:weldProcedure']).toBeUndefined();
    expect(errorsAfterBlur(before, tack, 'tack', min)['tack:actualPhMax']).toBeUndefined();
    const flipped = { ...tack, inputs: { ...tack.inputs, actualPhMin: '300' } };
    expect(errorsAfterBlur({}, flipped, 'tack', min)['tack:actualPhMax']).toBe('Actual PH Max is below Actual PH Min');
  });

  it('every field problem is on a field the sign-off form draws, so none is invisible', () => {
    const drawnByComponents = ['__decision', '__inspectionType', 'affectedItem', 'references'];
    for (const j of JOBS.slice(0, 25)) {
      const stages = buildStages(j);
      for (const st of stages) {
        const ctx = { ...ctxFor(j, st), stages };
        const drawn = new Set([...drawnByComponents, ...ctx.visibleFields.map(f => f.key), ...visibleSignoffFields(st, j, {}).map(f => f.key)]);
        for (const p of signProblems(st, ctx)) if (p.field) expect(drawn.has(p.field)).withContext(`${j.id} ${st.id}: ${p.field}`).toBeTrue();
      }
    }
  });
});
