import { buildStages } from '../../routing-logic/build-stages';
import { WorkflowStage } from '../../model/workflow-types';
import { JOBS } from '../../../data/jobs';
import { procedures, FILLER_METAL_TYPE_OPTIONS } from '../../../data/procedures';
import { detectDeviations, isActualOutOfRange } from './deviations';
import { getFillerMetalTypeOptions, getGwpDetails } from '../../../future/weld-engineering/procedure-service/procedure-usage';

const allowedFillers = (gwp: string, wtn: string) => getFillerMetalTypeOptions(gwp, wtn).map(o => o.value);

/* a Tack stage on the first seeded WTN that doesn't allow every filler type */
function tackOnWps(extra: Record<string, string> = {}): { stage: WorkflowStage; offListType: string; quals: string[] } {
  const proc = procedures().find(p => allowedFillers(p.gwp, p.wtn).length < FILLER_METAL_TYPE_OPTIONS.length)!;
  const tack = buildStages({ ...JOBS[0], nInd: '1' }).find(s => s.id === 'tack')!;
  const stage: WorkflowStage = {
    ...tack,
    inputs: { weldProcedure: proc.gwp, wtn: proc.wtn, phMin: '50', phMax: '300', ipMin: '50', ipMax: '300', ...extra },
  };
  const offListType = FILLER_METAL_TYPE_OPTIONS.find(o => !allowedFillers(proc.gwp, proc.wtn).includes(o.value))!.value;
  /* quals are only required through conditions passed to detectDeviations, so none are needed here */
  return { stage, offListType, quals: [] };
}

const ALL_VISIBLE = new Set(['actualPhMin', 'actualPhMax', 'actualIpMin', 'actualIpMax', 'qualificationCheck', 'fillerMetalType', 'fillerMetalSize']);

describe('deviations', () => {
  it('finds nothing when every value is within the WTN and the user holds the quals', () => {
    const { stage, quals } = tackOnWps({ actualPhMin: '60', actualPhMax: '200', actualIpMin: '60', actualIpMax: '200' });
    expect(detectDeviations(stage, ALL_VISIBLE, quals)).toEqual([]);
  });

  it('flags an Actual PH/IP outside its requirement, with the allowed range', () => {
    const { stage, quals } = tackOnWps({ actualPhMin: '40', actualIpMax: '350' });
    const items = detectDeviations(stage, ALL_VISIBLE, quals);
    expect(items.map(i => i.kind)).toEqual(['out-of-range', 'out-of-range']);
    expect(items[0]).toEqual(jasmine.objectContaining({ label: 'Actual PH Min', entered: '40', required: '50 to 300' }));
    expect(isActualOutOfRange(stage, 'actualPhMin')).toBeTrue();
  });

  it('treats NC as no limit', () => {
    const { stage, quals } = tackOnWps({ phMax: 'NC', actualPhMax: '900' });
    expect(detectDeviations(stage, ALL_VISIBLE, quals)).toEqual([]);
  });

  it('flags a failed Qualification Check', () => {
    const { stage } = tackOnWps();
    const items = detectDeviations(stage, ALL_VISIBLE, ['WELD412'], undefined, [{ op: 'all', items: ['WELD412', 'WELD498'] }]);
    expect(items).toEqual([jasmine.objectContaining({ kind: 'qual', entered: 'Missing WELD498', required: 'WELD412 AND WELD498' })]);
  });

  it('passes an OR requirement with either qual and names the whole group when neither is held', () => {
    const { stage } = tackOnWps();
    const req = [{ op: 'any' as const, items: ['CNTRLMTL1', 'CNTRLMTL2'] }];
    expect(detectDeviations(stage, ALL_VISIBLE, ['CNTRLMTL2'], undefined, req)).toEqual([]);
    expect(detectDeviations(stage, ALL_VISIBLE, [], undefined, req))
      .toEqual([jasmine.objectContaining({ kind: 'qual', entered: 'Missing CNTRLMTL1 OR CNTRLMTL2' })]);
  });

  it('flags a filler type the WTN does not allow', () => {
    const { stage, offListType, quals } = tackOnWps();
    stage.inputs['fillerMetalType'] = offListType;
    const items = detectDeviations(stage, ALL_VISIBLE, quals);
    expect(items.map(i => i.kind)).toEqual(['off-list']);
  });

  it('flags a GWP not qualified for the base metals, and passes one that is', () => {
    const { stage, quals } = tackOnWps();
    const gwp = getGwpDetails(stage.inputs['weldProcedure'])!;
    const vis = new Set(['weldProcedure']);
    expect(detectDeviations(stage, vis, quals, { type1: gwp.baseMetal1Type, type2: gwp.baseMetal2Type })).toEqual([]);
    const items = detectDeviations(stage, vis, quals, { type1: 'none', type2: 'none' });
    expect(items.map(i => i.kind)).toEqual(['off-list']);
    expect(items[0].required).toBe('None qualified for these base metals');
  });

  it('ignores fields the person cannot see', () => {
    const { stage, offListType } = tackOnWps({ actualPhMin: '1' });
    stage.inputs['fillerMetalType'] = offListType;
    expect(detectDeviations(stage, new Set(), [])).toEqual([]);
  });

  it('checks condition quals on a welding step with no WTN picked and on an inspection step showing the check', () => {
    const job = { ...JOBS[0], nInd: '3' };
    const tack = buildStages(job).find(s => s.id === 'tack')!;
    const req = [{ op: 'all' as const, items: ['CNTRLMTL1'] }];
    expect(detectDeviations(tack, ALL_VISIBLE, [], undefined, req))
      .toEqual([jasmine.objectContaining({ kind: 'qual', entered: 'Missing CNTRLMTL1', required: 'CNTRLMTL1' })]);
    const insp = buildStages(job).find(s => s.id === 'fitup-insp')!;
    const qualShown = new Set(['qualificationCheck']);
    expect(detectDeviations(insp, qualShown, [], undefined, req).map(i => i.kind)).toEqual(['qual']);
    expect(detectDeviations(insp, qualShown, ['CNTRLMTL1'], undefined, req)).toEqual([]);
    expect(detectDeviations(insp, new Set(), [], undefined, req)).toEqual([]);
  });
});
