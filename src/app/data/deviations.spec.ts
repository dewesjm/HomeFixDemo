import { buildStages, WorkflowStage } from './workflow';
import { addTestJob } from './jobs';
import { procedures, FILLER_METAL_TYPE_OPTIONS } from './procedures';
import { detectDeviations, isActualOutOfRange } from './deviations';

/* a Tack stage on the first seeded WPS that doesn't allow every filler type */
function tackOnWps(extra: Record<string, string> = {}): { stage: WorkflowStage; offListType: string; quals: string[] } {
  const proc = procedures().find(p => p.fillerMetalTypes.length < FILLER_METAL_TYPE_OPTIONS.length)!;
  const tack = buildStages(addTestJob('Welding')).find(s => s.id === 'tack')!;
  const stage: WorkflowStage = {
    ...tack,
    inputs: { weldProcedure: proc.gwp, wtn: proc.wtn, phMin: '50', phMax: '300', ipMin: '50', ipMax: '300', ...extra },
  };
  const offListType = FILLER_METAL_TYPE_OPTIONS.find(o => !proc.fillerMetalTypes.includes(o.value))!.value;
  return { stage, offListType, quals: proc.qualificationsRequired };
}

const ALL_VISIBLE = new Set(['actualPhMin', 'actualPhMax', 'actualIpMin', 'actualIpMax', 'qualificationCheck', 'fillerMetalType', 'fillerMetalSize']);

describe('deviations', () => {
  it('finds nothing when every value is within the WPS and the user holds the quals', () => {
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
    const { stage, quals } = tackOnWps();
    const items = detectDeviations(stage, ALL_VISIBLE, []);
    expect(items.length).toBe(quals.length ? 1 : 0);
    if (quals.length) expect(items[0].kind).toBe('qual');
  });

  it('flags a filler type the WPS does not allow', () => {
    const { stage, offListType, quals } = tackOnWps();
    stage.inputs['fillerMetalType'] = offListType;
    const items = detectDeviations(stage, ALL_VISIBLE, quals);
    expect(items.map(i => i.kind)).toEqual(['off-list']);
  });

  it('ignores fields the person cannot see', () => {
    const { stage, offListType } = tackOnWps({ actualPhMin: '1' });
    stage.inputs['fillerMetalType'] = offListType;
    expect(detectDeviations(stage, new Set(), [])).toEqual([]);
  });
});
