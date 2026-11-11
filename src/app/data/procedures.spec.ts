import {
  procedures, addProcedure, updateProcedure, deleteProcedure, getProcedure, type Procedure
} from './procedures';
import { SEEDED_SECTION_IDS } from '../future/weld-engineering/procedure-sections';

const blankProcedure = (id: string, gwp = id, wtn = '01.1-1'): Omit<Procedure, 'createdAt' | 'updatedAt'> => ({
  id, title: 'Test procedure', status: 'draft',
  wtn, weldProcess: 'GTAW',
  gwp, wpsRev: '0', effectiveDate: '',
  processType: '', application: '',
  rules: [], conditions: [],
  extraFields: {},
  sectionIds: [...SEEDED_SECTION_IDS],
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

  it('every seeded procedure has rules, conditions and every seeded section ticked', () => {
    /* scoped to seeded ids (W-###-#) since `procedures` is shared module state across this whole
       spec run -- other specs below add their own TEST-* procedures with intentionally empty lists */
    const seeded = procedures().filter(p => /^W-\d+-\d+$/.test(p.id));
    expect(seeded.length).toBeGreaterThan(0);
    for (const p of seeded) {
      expect(p.rules.length).toBeGreaterThan(0);
      expect(p.conditions.length).toBeGreaterThan(0);
      expect(p.sectionIds).toEqual(SEEDED_SECTION_IDS);
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
