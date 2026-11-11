import {
  procedures, addProcedure, updateProcedure, getProcedureByGwpWtn, BASE_METAL_1_TYPES, BASE_METAL_2_TYPES, type Procedure
} from '../../data/procedures';
import {
  hasOverride, allGwpOptions, gwpOptionsForMaterials, wtnOptionsForGwp, procedureDescription,
  fillerMetalTypeOptions, fillerMetalSizeOptions, hasProcedure, procedureOverride, procedureRequiredQuals,
} from './procedure-values';

const blankProcedure = (id: string, gwp = id, wtn = '01.1-1'): Omit<Procedure, 'createdAt' | 'updatedAt'> => ({
  id, title: 'Test procedure', status: 'draft',
  wtn, weldProcess: 'GTAW',
  gwp, wpsRev: '0', effectiveDate: '',
  processType: '', application: '',
  baseMetal1Type: '', baseMetal2Type: '', baseMetalThicknessMin: '', baseMetalThicknessMax: '',
  jointType: '', grooveAngle: '', rootOpening: '', backing: '',
  weldPosition: '', weldProgression: '',
  fillerMetalTypes: [], fillerMetalClassification: '', fillerMetalSizes: [], requiredQuals: { op: 'all', items: [] },
  phMin: '', phMax: '', ipMin: '', ipMax: '',
  overridePhMin: '', overridePhMax: '', overrideIpMin: '', overrideIpMax: '', overrideNote: '',
  currentType: '', powerSource: '',
  shieldingGas: '', gasFlowRate: '', backingGas: '',
  heatInputMin: '', heatInputMax: '',
  amperageRange: '', voltageRange: '', travelSpeedRange: '',
  pwhtTemp: '', pwhtTime: '',
  rules: [], conditions: [],
  extraFields: {},
  addedSectionIds: [],
  revisionHistory: [],
  createdBy: 'Test',
});

describe('procedure values', () => {
  describe('GWP/WTN cascade', () => {
    it('allGwpOptions lists each distinct GWP once', () => {
      addProcedure(blankProcedure('TEST-CASCADE-1', 'TEST-GWP-CASCADE', '01.1-1'));
      addProcedure(blankProcedure('TEST-CASCADE-2', 'TEST-GWP-CASCADE', '01.1-2'));

      const opts = allGwpOptions();
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
      updateProcedure('TEST-MAT-1', { baseMetal1Type: '02-CS', baseMetal2Type: '13-SS316' });
      addProcedure(blankProcedure('TEST-MAT-2', 'TEST-GWP-MAT-B', '07.7-1'));
      updateProcedure('TEST-MAT-2', { baseMetal1Type: '12-SS304', baseMetal2Type: '12-SS304' });

      const opts = gwpOptionsForMaterials('02-CS', '13-SS316').map(o => o.value);
      expect(opts).toContain('TEST-GWP-MAT-A');
      expect(opts).not.toContain('TEST-GWP-MAT-B');
    });

    it('some material pairs have more than one GWP to choose from', () => {
      const seeded = procedures().filter(p => /^W-\d+-\d+$/.test(p.id));
      const gwpsByPair = new Map<string, Set<string>>();
      for (const p of seeded) {
        const pair = `${p.baseMetal1Type}::${p.baseMetal2Type}`;
        gwpsByPair.set(pair, (gwpsByPair.get(pair) ?? new Set()).add(p.gwp));
      }
      expect([...gwpsByPair.values()].some(g => g.size > 1)).toBeTrue();
    });

    it('procedureDescription reads as plain text and skips blank parts', () => {
      const p = { ...blankProcedure('TEST-DESC-1'), processType: 'Semiautomatic', weldProcess: 'GTAW',
        baseMetal1Type: '02-CS', baseMetal2Type: '13-SS316', fillerMetalClassification: 'MIL-70S-6',
        application: 'Surface Structure', createdAt: '', updatedAt: '' };
      expect(procedureDescription(p)).toBe('Semiautomatic GTAW of 02-CS and 13-SS316 using MIL-70S-6 for Surface Structure');
      expect(procedureDescription(p, false)).toBe('Semiautomatic GTAW of 02-CS and 13-SS316 for Surface Structure');
      expect(procedureDescription({ ...p, processType: '', application: '' })).toBe('GTAW of 02-CS and 13-SS316 using MIL-70S-6');
    });

    it('gwpOptionsForMaterials returns an empty list when either material is blank', () => {
      expect(gwpOptionsForMaterials('', '13-SS316')).toEqual([]);
      expect(gwpOptionsForMaterials('02-CS', '')).toEqual([]);
    });
  });

  describe('Filler Metal Type/Size cascade', () => {
    it('fillerMetalTypeOptions only returns that WPS\'s valid types', () => {
      addProcedure(blankProcedure('TEST-FILLER-1', 'TEST-GWP-FILLER', '08.8-1'));
      updateProcedure('TEST-FILLER-1', { fillerMetalTypes: ['mil-70s-3', 'mil-80s-50'] });
      const opts = fillerMetalTypeOptions('TEST-GWP-FILLER', '08.8-1').map(o => o.value);
      expect(opts).toEqual(['mil-70s-3', 'mil-80s-50']);
    });

    it('fillerMetalSizeOptions only returns that WPS\'s valid sizes', () => {
      addProcedure(blankProcedure('TEST-FILLER-2', 'TEST-GWP-FILLER-2', '09.9-1'));
      updateProcedure('TEST-FILLER-2', { fillerMetalSizes: ['1/16', '3/32'] });
      const opts = fillerMetalSizeOptions('TEST-GWP-FILLER-2', '09.9-1').map(o => o.value);
      expect(opts).toEqual(['1/16', '3/32']);
    });

    it('returns an empty list when the GWP+WTN matches no WPS', () => {
      expect(fillerMetalTypeOptions('NO-SUCH-GWP', '01.1-1')).toEqual([]);
      expect(fillerMetalSizeOptions('NO-SUCH-GWP', '01.1-1')).toEqual([]);
    });
  });

  describe('Welder Qualifications', () => {
    it('procedureRequiredQuals gives the WPS\'s required quals, or an empty group when it matches none', () => {
      addProcedure(blankProcedure('TEST-QUALS-1', 'TEST-GWP-QUALS', '11.1-1'));
      updateProcedure('TEST-QUALS-1', { requiredQuals: { op: 'any', items: ['WELD427', 'WELD403'] } });
      expect(procedureRequiredQuals('TEST-GWP-QUALS', '11.1-1')).toEqual({ op: 'any', items: ['WELD427', 'WELD403'] });
      expect(procedureRequiredQuals('TEST-GWP-QUALS', 'no-such-wtn')).toEqual({ op: 'all', items: [] });
    });

    it('seeds Welder Qualifications on some WPS rows and none on others', () => {
      const seeded = procedures().filter(p => /^W-\d+-\d+$/.test(p.id));
      expect(seeded.some(p => p.requiredQuals.items.length > 0)).toBeTrue();
      expect(seeded.some(p => p.requiredQuals.items.length === 0)).toBeTrue();
    });
  });

  describe('Override values', () => {
    it('procedureOverride gives a WPS\'s override values, or undefined when it has none', () => {
      addProcedure(blankProcedure('TEST-OV-1', 'TEST-GWP-OV', '10.1-1'));
      expect(hasProcedure('TEST-GWP-OV', '10.1-1')).toBeTrue();
      expect(procedureOverride('TEST-GWP-OV', '10.1-1')).toBeUndefined();
      updateProcedure('TEST-OV-1', { overridePhMin: '50', overrideNote: 'Thin wall' });
      expect(procedureOverride('TEST-GWP-OV', '10.1-1')).toEqual({
        overridePhMin: '50', overridePhMax: '', overrideIpMin: '', overrideIpMax: '', overrideNote: 'Thin wall',
      });
      expect(procedureOverride('TEST-GWP-OV', 'no-such-wtn')).toBeUndefined();
      expect(hasProcedure('TEST-GWP-OV', 'no-such-wtn')).toBeFalse();
    });
  });
});
