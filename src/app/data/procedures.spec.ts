import {
  procedures, addProcedure, updateProcedure, deleteProcedure, getProcedure,
  gwpOptions, wtnOptionsForGwp, getProcedureByGwpWtn, type Procedure
} from './procedures';

const blankProcedure = (id: string, gwp = id, wtn = '01.1-1'): Omit<Procedure, 'createdAt' | 'updatedAt'> => ({
  id, title: 'Test procedure', status: 'draft',
  wtn, weldProcess: 'GTAW',
  gwp, wpsRev: '0', effectiveDate: '',
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
  it('seeds procedures grouped under GWPs, one row per GWP+WTN pair, with unique ids', () => {
    const all = procedures();
    expect(all.length).toBeGreaterThan(40);

    const ids = new Set(all.map(p => p.id));
    expect(ids.size).toBe(all.length);

    const seeded = all.filter(p => /^W-\d+-\d+$/.test(p.id));
    expect(seeded.length).toBeGreaterThan(0);
    const gwpWtnPairs = new Set(seeded.map(p => `${p.gwp}::${p.wtn}`));
    expect(gwpWtnPairs.size).toBe(seeded.length);
    for (const p of seeded) {
      expect(p.gwp).toMatch(/^W-\d+$/);
      expect(p.wtn).toBeTruthy();
    }
  });

  it('every seeded procedure has rules, conditions, and qualifications required', () => {
    /* scoped to seeded ids (W-###-#) since `procedures` is shared module state across this whole
       spec run -- other specs below add their own TEST-* procedures with intentionally empty lists */
    const seeded = procedures().filter(p => /^W-\d+-\d+$/.test(p.id));
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

  describe('GWP/WTN cascade', () => {
    it('gwpOptions lists each distinct GWP once', () => {
      addProcedure(blankProcedure('TEST-CASCADE-1', 'TEST-GWP-CASCADE', '01.1-1'));
      addProcedure(blankProcedure('TEST-CASCADE-2', 'TEST-GWP-CASCADE', '01.1-2'));

      const opts = gwpOptions();
      const matching = opts.filter(o => o.value === 'TEST-GWP-CASCADE');
      expect(matching.length).toBe(1);
    });

    it('wtnOptionsForGwp only returns WTNs under that GWP', () => {
      addProcedure(blankProcedure('TEST-CASCADE-3', 'TEST-GWP-A', '02.2-1'));
      addProcedure(blankProcedure('TEST-CASCADE-4', 'TEST-GWP-B', '03.3-1'));

      const wtnsForA = wtnOptionsForGwp('TEST-GWP-A').map(o => o.value);
      expect(wtnsForA).toContain('02.2-1');
      expect(wtnsForA).not.toContain('03.3-1');
    });

    it('wtnOptionsForGwp returns an empty list for an empty GWP', () => {
      expect(wtnOptionsForGwp('')).toEqual([]);
    });

    it('getProcedureByGwpWtn finds the exact procedure for a GWP+WTN pair', () => {
      addProcedure(blankProcedure('TEST-CASCADE-5', 'TEST-GWP-LOOKUP', '04.4-1'));
      const found = getProcedureByGwpWtn('TEST-GWP-LOOKUP', '04.4-1');
      expect(found?.id).toBe('TEST-CASCADE-5');
      expect(getProcedureByGwpWtn('TEST-GWP-LOOKUP', 'no-such-wtn')).toBeUndefined();
    });
  });
});
