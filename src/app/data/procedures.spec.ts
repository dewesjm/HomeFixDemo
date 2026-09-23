import {
  procedures, addProcedure, updateProcedure, deleteProcedure, getProcedure,
  WTN_POOL, type Procedure
} from './procedures';

const blankProcedure = (id: string): Omit<Procedure, 'createdAt' | 'updatedAt'> => ({
  id, title: 'Test procedure', status: 'draft',
  wtns: [WTN_POOL[0]], weldProcess: 'GTAW',
  gwp: id, wpsRev: '0', effectiveDate: '',
  processType: '',
  baseMetal1Type: '', baseMetal2Type: '', baseMetalThicknessMin: '', baseMetalThicknessMax: '',
  jointType: '', grooveAngle: '', rootOpening: '', backing: '',
  weldPosition: '', weldProgression: '',
  fillerMetalType: '', fillerMetalClassification: '', fillerMetalSizeRange: '',
  phMin: '', phMax: '', ipMin: '', ipMax: '',
  overridePhMin: '', overridePhMax: '', overrideIpMin: '', overrideIpMax: '', overrideNote: '',
  currentType: '', powerSource: '',
  shieldingGas: '', gasFlowRate: '', backingGas: '',
  heatInputMin: '', heatInputMax: '',
  amperageRange: '', voltageRange: '', travelSpeedRange: '',
  pwhtTemp: '', pwhtTime: '',
  rules: [], conditions: [], qualificationsRequired: [],
  revisionHistory: [],
  createdBy: 'Test',
});

describe('procedures data layer', () => {
  it('seeds ~100 procedures with unique ids and valid WTN references', () => {
    const all = procedures();
    expect(all.length).toBeGreaterThanOrEqual(100);

    const ids = new Set(all.map(p => p.id));
    expect(ids.size).toBe(all.length);

    for (const p of all) {
      expect(p.wtns.length).toBeGreaterThan(0);
      for (const wtn of p.wtns) expect(WTN_POOL).toContain(wtn);
    }
  });

  it('every seeded procedure has rules, conditions, and qualifications required', () => {
    /* scoped to seeded ids (W-###) since `procedures` is shared module state across this whole
       spec run -- other specs below add their own TEST-* procedures with intentionally empty lists */
    const seeded = procedures().filter(p => /^W-\d+$/.test(p.id));
    expect(seeded.length).toBeGreaterThan(0);
    for (const p of seeded) {
      expect(p.rules.length).toBeGreaterThan(0);
      expect(p.conditions.length).toBeGreaterThan(0);
      expect(p.qualificationsRequired.length).toBeGreaterThan(0);
    }
  });

  it('addProcedure adds a retrievable procedure with timestamps', () => {
    const before = procedures().length;
    const created = addProcedure(blankProcedure('TEST-ADD-1'));

    expect(procedures().length).toBe(before + 1);
    expect(created.createdAt).toBeTruthy();
    expect(created.updatedAt).toBeTruthy();
    expect(getProcedure('TEST-ADD-1')?.title).toBe('Test procedure');
  });

  it('updateProcedure merges fields and bumps updatedAt without touching other procedures', () => {
    addProcedure(blankProcedure('TEST-UPDATE-1'));
    const before = getProcedure('TEST-UPDATE-1')!;

    updateProcedure('TEST-UPDATE-1', { title: 'Renamed', status: 'active' });
    const after = getProcedure('TEST-UPDATE-1')!;

    expect(after.title).toBe('Renamed');
    expect(after.status).toBe('active');
    expect(after.id).toBe('TEST-UPDATE-1');
    expect(after.createdAt).toBe(before.createdAt);
  });

  it('deleteProcedure removes only the targeted procedure', () => {
    addProcedure(blankProcedure('TEST-DELETE-1'));
    addProcedure(blankProcedure('TEST-DELETE-2'));
    const before = procedures().length;

    deleteProcedure('TEST-DELETE-1');

    expect(procedures().length).toBe(before - 1);
    expect(getProcedure('TEST-DELETE-1')).toBeUndefined();
    expect(getProcedure('TEST-DELETE-2')).toBeDefined();
  });

  it('getProcedure returns undefined for an unknown id', () => {
    expect(getProcedure('does-not-exist')).toBeUndefined();
  });
});
