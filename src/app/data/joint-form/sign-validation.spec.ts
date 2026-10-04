import { JOBS, Job } from '../jobs';
import { buildStages, WorkflowStage } from '../workflow';
import { inspectionTypeRequired, signProblems, stageFieldErrors, errorsAfterBlur, errorsAfterSelect, SignContext } from './sign-validation';
import { visibleStageFields } from './stage-form';

const job = (over: Partial<Job> = {}): Job => ({ ...JOBS.find(j => j.trade === 'Welding')!, mcl1: 'STD', mcl2: 'STD', nInd: '3', jointDesign: 'C-24', ...over });
const stageOf = (j: Job, id: string, change: Partial<WorkflowStage> = {}): WorkflowStage => ({ ...buildStages(j).find(s => s.id === id)!, ...change });
const ctxFor = (j: Job, stage: WorkflowStage, fab: Record<string, string> = {}, fabErrors: Record<string, string> = {}): SignContext =>
  ({ job: j, fab, fabErrors, visibleFields: visibleStageFields(stage, { job: j, stages: buildStages(j), offListUnlocked: false }) });
const FULL_FAB = { location: 'ship', drawingRev: 'A', actualThickness: '0.2' };

describe('joint-form sign-validation', () => {
  it('inspection steps with a Type list need the inspection chosen; Fit never does', () => {
    const j = job();
    const ndt = buildStages(j).find(s => s.id.includes('-ndt-') && !!s.routingOptions?.length)!;
    expect(inspectionTypeRequired(ndt)).toBeTrue();
    expect(inspectionTypeRequired(stageOf(j, 'fit'))).toBeFalse();
    expect(inspectionTypeRequired(stageOf(j, 'tack'))).toBeFalse();
  });

  it('Fit: blank fabrication values are listed as one reason', () => {
    const j = job();
    const fit = stageOf(j, 'fit');
    expect(signProblems(fit, ctxFor(j, fit))).toEqual(['Fabrication: Location, Drawing Rev, Actual Thickness']);
    expect(signProblems(fit, ctxFor(j, fit, FULL_FAB))).toEqual([]);
  });

  it('Fit-Up Insp needs SAT/UNSAT, every value verified and no fabrication errors', () => {
    const j = job();
    const insp = stageOf(j, 'fitup-insp');
    expect(signProblems(insp, ctxFor(j, insp, {}, { location: 'x' })))
      .toEqual(['Choose SAT or UNSAT', 'Verify every fitting value', 'Fix the fabrication errors']);
    const verified = { ...insp, result: 'sat' as const, inputs: Object.fromEntries(insp.fields.map(f => [f.key, 'yes'])) };
    expect(signProblems(verified, ctxFor(j, verified))).toEqual([]);
  });

  it('RT NDT must record the job\'s required degree', () => {
    const j = job({ ndt: 'UT', rtRoot: '360' });
    const rt = buildStages(j).find(s => s.id === 'root-ndt-utrt');
    if (!rt) { pending('seed job has no Root RT/UT step'); return; }
    const stage = { ...rt, inspectionType: 'rt', inputs: { degreeRt: '60' } };
    expect(signProblems(stage, ctxFor(j, stage))).toContain('Degree of RT Performed must be 360');
    expect(stageFieldErrors(stage, ctxFor(j, stage))['root-ndt-utrt:degreeRt']).toBe('Degree of RT Performed must be 360');
    expect(errorsAfterSelect({}, stage, j, 'root-ndt-utrt', 'degreeRt')['root-ndt-utrt:degreeRt']).toBe('Degree of RT Performed must be 360');
    const matched = { ...stage, inputs: { degreeRt: '360' } };
    expect(errorsAfterSelect({ 'root-ndt-utrt:degreeRt': 'x' }, matched, j, 'root-ndt-utrt', 'degreeRt')['root-ndt-utrt:degreeRt']).toBeUndefined();
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

  it('Weld Build-Up needs an Affected Item, with its MIC verified when traceability applies', () => {
    const j = job({ mcl1: 'MC-I', joiningItem: 'Pipe A' });
    const fit = stageOf(j, 'fit', { routingType: 'weld-buildup' });
    expect(stageFieldErrors(fit, ctxFor(j, fit))['fit:affectedItem']).toBe('Select at least one Affected Item');
    const picked = { ...fit, inputs: { affectedItems: 'joiningItem' } };
    expect(stageFieldErrors(picked, ctxFor(j, picked))['fit:affectedItem']).toBe('Please verify MIC for Pipe A');
    const verified = { ...fit, inputs: { affectedItems: 'joiningItem', micVerified1: 'yes' } };
    expect(stageFieldErrors(verified, ctxFor(j, verified))['fit:affectedItem']).toBeUndefined();
  });

  it('on blur: a filled field loses its error and a fixed Min/Max order clears the Max error', () => {
    const j = job();
    const tack = stageOf(j, 'tack', { inputs: { weldProcedure: 'W-101', actualPhMin: '100', actualPhMax: '200' } });
    const gwp = tack.fields.find(f => f.key === 'weldProcedure')!;
    const min = tack.fields.find(f => f.key === 'actualPhMin')!;
    const before = { 'tack:weldProcedure': 'GWP is required', 'tack:actualPhMax': 'Actual PH Max is below Actual PH Min' };
    expect(errorsAfterBlur(before, tack, 'tack', gwp)['tack:weldProcedure']).toBeUndefined();
    expect(errorsAfterBlur(before, tack, 'tack', min)['tack:actualPhMax']).toBeUndefined();
    const flipped = { ...tack, inputs: { ...tack.inputs, actualPhMin: '300' } };
    expect(errorsAfterBlur({}, flipped, 'tack', min)['tack:actualPhMax']).toBe('Actual PH Max is below Actual PH Min');
  });
});
