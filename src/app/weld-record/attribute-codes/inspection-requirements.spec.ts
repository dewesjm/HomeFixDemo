import { addTestJob, Job } from '../../data/jobs';
import { resolveAttributeInspections, InspectionObligation } from './inspection-requirements';
import { activeAttributeCodes, attributeConflicts, jointAttributeCodes } from './attribute-context';

describe('Attribute inspection requirements', () => {
  let job: Job;
  let baseline: InspectionObligation[];
  beforeEach(() => {
    job = { ...addTestJob(), nInd: '3', attributeLocation: 'Shop', attributeGtaWeld: 'Yes', rtFinal: '100' };
    baseline = [
      { phase: 'root', templateId: 'root-ndt-vt5x', methods: [{ type: 'vt' }], sources: [] },
      { phase: 'root', templateId: 'root-ndt-utrt', methods: [{ type: 'rt', minRt: 100 }], sources: [] },
      { phase: 'layer', templateId: 'layer-ndt-mtpt', methods: [{ type: 'pt' }], sources: [] },
      { phase: 'final', templateId: 'final-ndt-vt5x', methods: [{ type: 'vt' }], sources: [] },
      { phase: 'final', templateId: 'final-ndt-mtpt', methods: [{ type: 'mt' }], sources: [] },
      { phase: 'final', templateId: 'final-ndt-utrt', methods: [{ type: 'rt', minRt: 100 }], sources: [] },
    ];
  });
  const methods = (obligations: InspectionObligation[], phase: string) => obligations.filter(o => o.phase === phase).flatMap(o => o.methods.map(m => m.type));
  function resolve(code: string) { job.attributeCode1 = code; return resolveAttributeInspections(job, baseline); }

  it('PR requires an independent accessibility answer on each affected obligation', () => {
    const result = resolve('PR');
    for (const phase of ['root', 'final']) {
      const rt = result.find(o => o.phase === phase && o.templateId.endsWith('utrt'))!;
      expect(rt.methods).toContain(jasmine.objectContaining({ type: 'rt', access: 'no' }));
      expect(rt.methods).toContain(jasmine.objectContaining({ type: 'attribute-not-required', access: 'yes' }));
    }
    expect(result.find(o => o.templateId === 'root-ndt-vt5x')?.methods).toContain(jasmine.objectContaining({ type: 'pt', access: 'yes' }));
  });
  it('PM permits a single Final MT or PT inspection without adding an obligation', () => {
    const result = resolve('PM');
    expect(result.length).toBe(baseline.length);
    expect(result.find(o => o.templateId === 'final-ndt-mtpt')?.methods.map(m => m.type)).toEqual(['mt', 'pt']);
  });
  for (const code of ['FC', 'BJ']) it(`${code} limits Final to VT and retains Root/Layer`, () => {
    const result = resolve(code);
    expect(methods(result, 'final')).toEqual(['vt']);
    expect(methods(result, 'root')).toEqual(['vt', 'rt']);
    expect(methods(result, 'layer')).toEqual(['pt']);
  });
  it('PU adds distinct PT and UT obligations while retaining existing Final RT', () => {
    const result = resolve('PU').filter(o => o.phase === 'final');
    for (const type of ['pt', 'ut', 'rt']) expect(result.some(o => o.methods.length === 1 && o.methods[0].type === type)).toBeTrue();
  });
  it('SI permits ID VT for Root/Final RT on accessible shop joints only', () => {
    const result = resolve('SI');
    for (const phase of ['root', 'final']) expect(result.find(o => o.phase === phase && o.templateId.endsWith('utrt'))?.methods.map(m => m.type)).toEqual(['rt', 'vt']);
    job.attributeLocation = 'Field'; expect(resolve('SI')).toEqual(baseline);
    job.attributeLocation = 'Shop'; expect(resolve('SI').some(o => o.methods.some(m => m.access === 'yes'))).toBeTrue();
  });
  it('RX adds Root PT and retains the higher Final RT degree, defaulting to 100 when absent', () => {
    expect(methods(resolve('RX'), 'root')).toContain('pt');
    expect(resolve('RX').find(o => o.phase === 'final' && o.methods[0].type === 'rt')?.methods[0].minRt).toBe(100);
    baseline = baseline.filter(o => !o.methods.some(m => m.type === 'rt'));
    job.rtFinal = '';
    expect(resolve('RX').find(o => o.phase === 'final' && o.methods[0].type === 'rt')?.methods[0].minRt).toBe(100);
  });
  it('IA requires ID PT or MT in all three phases, without inferring access', () => {
    baseline = baseline.filter(o => o.templateId !== 'final-ndt-mtpt');
    const added = resolve('IA').find(o => o.sources.includes('IA'))!;
    expect(added.methods.map(m => m.type)).toEqual(['pt', 'mt', 'attribute-not-required']);
    expect(added.methods.filter(m => m.type !== 'attribute-not-required').every(m => m.scope === 'ID')).toBeTrue();
    expect([...new Set(resolve('IA').filter(o => o.sources.includes('IA')).map(o => o.phase))].sort()).toEqual(['final', 'layer', 'root']);
    expect(added.methods).toContain(jasmine.objectContaining({ type: 'attribute-not-required', access: 'no' }));
  });
  it('IR offers explicit ID PT/MT alternatives to Root and Final RT', () => {
    const result = resolve('IR');
    for (const phase of ['root', 'final']) expect(result.find(o => o.phase === phase && o.templateId.endsWith('utrt'))?.methods.map(m => m.type)).toEqual(['rt', 'pt', 'mt']);
  });
  it('LR permits 60-degree RT for each Layer PT without making RT mandatory or adding Layer NDT', () => {
    const result = resolve('LR');
    expect(result.find(o => o.phase === 'layer')?.methods).toEqual([{ type: 'pt' }, { type: 'rt', minRt: 60 }]);
    baseline = baseline.filter(o => o.phase !== 'layer');
    expect(methods(resolve('LR'), 'layer')).toEqual([]);
  });
  it('GV uses Root 5X and Final 1X VT and preserves Layer requirements for GTA-only joints', () => {
    expect(methods(resolve('GV'), 'root')).toEqual(['5x']);
    expect(resolve('GV').find(o => o.phase === 'final')?.methods).toEqual([{ type: 'vt', magnification: '1X' }]);
    expect(methods(resolve('GV'), 'layer')).toEqual(['pt']);
    job.attributeGtaWeld = 'Unknown'; expect(resolve('GV')).toEqual(baseline);
  });
  it('RI is a Final RT60 or accessible ID PT obligation; higher existing RT stays sufficient', () => {
    baseline = [];
    expect(resolve('RI')[0].methods).toEqual([{ type: 'rt', minRt: 60 }, { type: 'pt', scope: 'ID', access: 'yes' }]);
    expect(resolve('RI')[0].methods[1].access).toBe('yes');
  });
  it('BP requires separate Root 5X and explicitly selected PT or MT', () => {
    const result = resolve('BP').filter(o => o.phase === 'root');
    expect(result.some(o => o.methods.length === 1 && o.methods[0].type === '5x')).toBeTrue();
    expect(result.some(o => o.methods.map(m => m.type).join('/') === 'pt/mt')).toBeTrue();
    expect(methods(result, 'root')).not.toContain('vt');
  });
  it('matches whole codes across all slots, ignores case and duplicates, and leaves unknown codes inert', () => {
    Object.assign(job, { attributeCode1: ' pu ', attributeCode2: 'PU', attributeCode3: 'ZZ', attributeCode4: 'pm' });
    expect(jointAttributeCodes(job)).toEqual(['PM', 'PU']);
    expect(activeAttributeCodes(job)).toEqual(['PM', 'PU']);
    expect(resolve('ZZ')).toBeDefined();
  });
  it('blocks incompatible attributes without choosing a winner by slot order', () => {
    Object.assign(job, { attributeCode1: 'FC', attributeCode2: 'PU' });
    expect(attributeConflicts(job).length).toBe(1);
    Object.assign(job, { attributeCode1: 'PU', attributeCode2: 'FC' });
    expect(attributeConflicts(job).length).toBe(1);
    Object.assign(job, { attributeCode1: 'PR', attributeCode2: 'RX' });
    expect(attributeConflicts(job)).toEqual([]);
    expect(attributeConflicts(job)).toEqual([]);
  });
  it('does not mutate baseline requirements', () => {
    const original = JSON.stringify(baseline);
    resolve('FC'); resolve('IR'); resolve('PU');
    expect(JSON.stringify(baseline)).toBe(original);
  });
});
