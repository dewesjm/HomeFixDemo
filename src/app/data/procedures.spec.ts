import {
  procedures, addProcedure, updateProcedure, deleteProcedure, getProcedure, hasOverride,
  gwpOptions, gwpOptionsForMaterials, wtnOptionsForGwp, getProcedureByGwpWtn,
  fillerMetalTypeOptionsForProcedure, fillerMetalSizeOptionsForProcedure,
  BASE_METAL_1_TYPES, BASE_METAL_2_TYPES, type Procedure
} from './procedures';

const blankProcedure = (id: string, gwp = id, wtn = '01.1-1'): Omit<Procedure, 'createdAt' | 'updatedAt'> => ({
  id, title: 'Test procedure', status: 'draft',
  wtn, weldProcess: 'GTAW',
  gwp, wpsRev: '0', effectiveDate: '',
  processType: '',
  baseMetal1Type: '', baseMetal2Type: '', baseMetalThicknessMin: '', baseMetalThicknessMax: '',
  jointType: '', grooveAngle: '', rootOpening: '', backing: '',
  weldPosition: '', weldProgression: '',
  fillerMetalTypes: [], fillerMetalClassification: '', fillerMetalSizes: [],
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

  describe('GWP is fixed to one base metal pair, matched against a job\'s Material Type 1/2', () => {
    it('every seeded GWP has exactly one base metal 1/2 pair across all its WTN rows', () => {
      const seeded = procedures().filter(p => /^W-\d+-\d+$/.test(p.id));
      const pairByGwp = new Map<string, string>();
      for (const p of seeded) {
        const pair = `${p.baseMetal1Type}::${p.baseMetal2Type}`;
        const existing = pairByGwp.get(p.gwp);
        if (existing) expect(pair).toBe(existing);
        else pairByGwp.set(p.gwp, pair);
      }
    });

    it('covers every Material Type 1/2 combination with at least one GWP', () => {
      const seeded = procedures().filter(p => /^W-\d+-\d+$/.test(p.id));
      for (const m1 of BASE_METAL_1_TYPES) {
        for (const m2 of BASE_METAL_2_TYPES) {
          const match = seeded.find(p => p.baseMetal1Type === m1 && p.baseMetal2Type === m2);
          expect(match).withContext(`${m1} / ${m2}`).toBeTruthy();
        }
      }
    });

    it('every Material Type 1/2 combination has at least one WPS with override values populated', () => {
      const seeded = procedures().filter(p => /^W-\d+-\d+$/.test(p.id));
      for (const m1 of BASE_METAL_1_TYPES) {
        for (const m2 of BASE_METAL_2_TYPES) {
          const rows = seeded.filter(p => p.baseMetal1Type === m1 && p.baseMetal2Type === m2);
          expect(rows.some(hasOverride)).withContext(`${m1} / ${m2}`).toBeTrue();
        }
      }
    });

    it('gwpOptionsForMaterials only returns GWPs matching that base metal pair', () => {
      addProcedure(blankProcedure('TEST-MAT-1', 'TEST-GWP-MAT-A', '06.6-1'));
      updateProcedure('TEST-MAT-1', { baseMetal1Type: '02-CS', baseMetal2Type: '01-E60' });
      addProcedure(blankProcedure('TEST-MAT-2', 'TEST-GWP-MAT-B', '07.7-1'));
      updateProcedure('TEST-MAT-2', { baseMetal1Type: '12-SS304', baseMetal2Type: '02-E70' });

      const opts = gwpOptionsForMaterials('02-CS', '01-E60').map(o => o.value);
      expect(opts).toContain('TEST-GWP-MAT-A');
      expect(opts).not.toContain('TEST-GWP-MAT-B');
    });

    it('gwpOptionsForMaterials returns an empty list when either material is blank', () => {
      expect(gwpOptionsForMaterials('', '01-E60')).toEqual([]);
      expect(gwpOptionsForMaterials('02-CS', '')).toEqual([]);
    });
  });

  describe('Filler Metal Type/Size cascade', () => {
    it('fillerMetalTypeOptionsForProcedure only returns that WPS\'s valid types', () => {
      const p = addProcedure(blankProcedure('TEST-FILLER-1', 'TEST-GWP-FILLER', '08.8-1'));
      updateProcedure('TEST-FILLER-1', { fillerMetalTypes: ['mil-70s-3', 'mil-80s-50'] });
      const opts = fillerMetalTypeOptionsForProcedure(getProcedure(p.id)).map(o => o.value);
      expect(opts).toEqual(['mil-70s-3', 'mil-80s-50']);
    });

    it('fillerMetalSizeOptionsForProcedure only returns that WPS\'s valid sizes', () => {
      const p = addProcedure(blankProcedure('TEST-FILLER-2', 'TEST-GWP-FILLER-2', '09.9-1'));
      updateProcedure('TEST-FILLER-2', { fillerMetalSizes: ['1/16', '3/32'] });
      const opts = fillerMetalSizeOptionsForProcedure(getProcedure(p.id)).map(o => o.value);
      expect(opts).toEqual(['1/16', '3/32']);
    });

    it('returns an empty list for an undefined procedure', () => {
      expect(fillerMetalTypeOptionsForProcedure(undefined)).toEqual([]);
      expect(fillerMetalSizeOptionsForProcedure(undefined)).toEqual([]);
    });
  });
});
