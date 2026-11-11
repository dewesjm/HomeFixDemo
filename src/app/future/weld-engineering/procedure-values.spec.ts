import {
  procedures, addProcedure, updateProcedure, getProcedure, BASE_METAL_1_TYPES, BASE_METAL_2_TYPES, type Procedure
} from '../../data/procedures';
import {
  allGwpOptions, gwpOptionsForMaterials, wtnOptionsForGwp, procedureDescription,
  fillerMetalTypeOptions, fillerMetalSizeOptions, hasProcedure, procedureOverride, procedureRequiredQuals,
  wtnFillValue, gwpDetails, wtnDescription,
} from './procedure-values';
import { SEEDED_SECTION_IDS, procedureSections, moveField, renameField, renameSection, shiftField, addSection } from './procedure-sections';
import { deleteProcedure } from '../../data/procedures';
import { keepProcedureStores } from './testing/procedure-test-state';
import { textValue } from './procedure-field-values';

const val = (p: Procedure, key: string) => textValue(p, key, procedureSections());

const blankProcedure = (gwp: string, wtn = '01.1-1'): Omit<Procedure, 'createdAt' | 'updatedAt'> => ({
  title: 'Test procedure', status: 'draft',
  wtn, weldProcess: 'GTAW',
  gwp, revision: '0', effectiveDate: '',
  processType: '', application: '',
  rules: [], conditions: [],
  extraFields: {},
  sectionIds: [...SEEDED_SECTION_IDS],
  revisionHistory: [],
  createdBy: 'Test',
});

describe('procedure values', () => {
  keepProcedureStores();

  describe('GWP/WTN cascade', () => {
    it('allGwpOptions lists each distinct GWP once', () => {
      addProcedure(blankProcedure('TEST-GWP-CASCADE', '01.1-1'));
      addProcedure(blankProcedure('TEST-GWP-CASCADE', '01.1-2'));

      const opts = allGwpOptions();
      const matching = opts.filter(o => o.value === 'TEST-GWP-CASCADE');
      expect(matching.length).toBe(1);
    });

    it('wtnOptionsForGwp only returns WTNs under that GWP', () => {
      addProcedure(blankProcedure('TEST-GWP-A', '02.2-1'));
      addProcedure(blankProcedure('TEST-GWP-B', '03.3-1'));

      const wtnsForA = wtnOptionsForGwp('TEST-GWP-A').map(o => o.value);
      expect(wtnsForA).toContain('02.2-1');
      expect(wtnsForA).not.toContain('03.3-1');
    });

    it('wtnOptionsForGwp returns an empty list for an empty GWP', () => {
      expect(wtnOptionsForGwp('')).toEqual([]);
    });

    it('getProcedure finds the exact procedure for a GWP+WTN pair', () => {
      addProcedure(blankProcedure('TEST-GWP-LOOKUP', '04.4-1'));
      const found = getProcedure('TEST-GWP-LOOKUP', '04.4-1');
      expect(found?.wtn).toBe('04.4-1');
      expect(getProcedure('TEST-GWP-LOOKUP', 'no-such-wtn')).toBeUndefined();
    });
  });

  describe('GWP is fixed to one base metal pair, matched against a job\'s Material Type 1/2', () => {
    it('every seeded GWP has exactly one base metal 1/2 pair across all its WTN rows', () => {
      const seeded = procedures().filter(p => /^W-\d+$/.test(p.gwp));
      const pairByGwp = new Map<string, string>();
      for (const p of seeded) {
        const pair = `${val(p, 'baseMetal1Type')}::${val(p, 'baseMetal2Type')}`;
        const existing = pairByGwp.get(p.gwp);
        if (existing) expect(pair).toBe(existing);
        else pairByGwp.set(p.gwp, pair);
      }
    });

    it('covers every Material Type 1/2 combination with at least one GWP', () => {
      const seeded = procedures().filter(p => /^W-\d+$/.test(p.gwp));
      for (const m1 of BASE_METAL_1_TYPES) {
        for (const m2 of BASE_METAL_2_TYPES) {
          const match = seeded.find(p => val(p, 'baseMetal1Type') === m1 && val(p, 'baseMetal2Type') === m2);
          expect(match).withContext(`${m1} / ${m2}`).toBeTruthy();
        }
      }
    });

    it('every Material Type 1/2 combination has at least one WTN with override values populated', () => {
      const seeded = procedures().filter(p => /^W-\d+$/.test(p.gwp));
      for (const m1 of BASE_METAL_1_TYPES) {
        for (const m2 of BASE_METAL_2_TYPES) {
          const rows = seeded.filter(p => val(p, 'baseMetal1Type') === m1 && val(p, 'baseMetal2Type') === m2);
          expect(rows.some(p => !!procedureOverride(p.gwp, p.wtn))).withContext(`${m1} / ${m2}`).toBeTrue();
        }
      }
    });

    it('gwpOptionsForMaterials only returns GWPs matching that base metal pair', () => {
      addProcedure(blankProcedure('TEST-GWP-MAT-A', '06.6-1'));
      updateProcedure('TEST-GWP-MAT-A', '06.6-1', { extraFields: { baseMetal1Type: '02-CS', baseMetal2Type: '13-SS316' } });
      addProcedure(blankProcedure('TEST-GWP-MAT-B', '07.7-1'));
      updateProcedure('TEST-GWP-MAT-B', '07.7-1', { extraFields: { baseMetal1Type: '12-SS304', baseMetal2Type: '12-SS304' } });

      const opts = gwpOptionsForMaterials('02-CS', '13-SS316').map(o => o.value);
      expect(opts).toContain('TEST-GWP-MAT-A');
      expect(opts).not.toContain('TEST-GWP-MAT-B');
    });

    it('some material pairs have more than one GWP to choose from', () => {
      const seeded = procedures().filter(p => /^W-\d+$/.test(p.gwp));
      const gwpsByPair = new Map<string, Set<string>>();
      for (const p of seeded) {
        const pair = `${val(p, 'baseMetal1Type')}::${val(p, 'baseMetal2Type')}`;
        gwpsByPair.set(pair, (gwpsByPair.get(pair) ?? new Set()).add(p.gwp));
      }
      expect([...gwpsByPair.values()].some(g => g.size > 1)).toBeTrue();
    });

    it('procedureDescription reads as plain text and skips blank parts', () => {
      const p = { ...blankProcedure('TEST-DESC-1'), processType: 'Semiautomatic', weldProcess: 'GTAW',
        extraFields: { baseMetal1Type: '02-CS', baseMetal2Type: '13-SS316', fillerMetalClassification: 'MIL-70S-6' },
        application: 'Surface Structure', createdAt: '', updatedAt: '' };
      expect(procedureDescription(p)).toBe('Semiautomatic GTAW of 02-CS and 13-SS316 using MIL-70S-6 for Surface Structure');
      expect(procedureDescription(p, false)).toBe('Semiautomatic GTAW of 02-CS and 13-SS316 for Surface Structure');
      expect(procedureDescription({ ...p, processType: '', application: '' })).toBe('GTAW of 02-CS and 13-SS316 using MIL-70S-6');
      expect(procedureDescription({ ...p, sectionIds: SEEDED_SECTION_IDS.filter(id => id !== 'sec-base-metal') }))
        .toBe('Semiautomatic GTAW using MIL-70S-6 for Surface Structure');
    });

    it('gwpOptionsForMaterials returns an empty list when either material is blank', () => {
      expect(gwpOptionsForMaterials('', '13-SS316')).toEqual([]);
      expect(gwpOptionsForMaterials('02-CS', '')).toEqual([]);
    });
  });

  describe('Filler Metal Type/Size cascade', () => {
    it('fillerMetalTypeOptions only returns that WTN\'s valid types',() => {
      addProcedure(blankProcedure('TEST-GWP-FILLER', '08.8-1'));
      updateProcedure('TEST-GWP-FILLER', '08.8-1', { extraFields: { fillerMetalTypes: ['mil-70s-3', 'mil-80s-50'] } });
      const opts = fillerMetalTypeOptions('TEST-GWP-FILLER', '08.8-1').map(o => o.value);
      expect(opts).toEqual(['mil-70s-3', 'mil-80s-50']);
    });

    it('fillerMetalSizeOptions only returns that WTN\'s valid sizes',() => {
      addProcedure(blankProcedure('TEST-GWP-FILLER-2', '09.9-1'));
      updateProcedure('TEST-GWP-FILLER-2', '09.9-1', { extraFields: { fillerMetalSizes: ['1/16', '3/32'] } });
      const opts = fillerMetalSizeOptions('TEST-GWP-FILLER-2', '09.9-1').map(o => o.value);
      expect(opts).toEqual(['1/16', '3/32']);
    });

    it('returns an empty list when the GWP+WTN matches no procedure', () => {
      expect(fillerMetalTypeOptions('NO-SUCH-GWP', '01.1-1')).toEqual([]);
      expect(fillerMetalSizeOptions('NO-SUCH-GWP', '01.1-1')).toEqual([]);
    });
  });

  describe('Welder Qualifications', () => {
    it('procedureRequiredQuals gives the WTN\'s required quals, or an empty group when it matches none', () => {
      addProcedure(blankProcedure('TEST-GWP-QUALS', '11.1-1'));
      updateProcedure('TEST-GWP-QUALS', '11.1-1', { extraFields: { requiredQuals: { op: 'any', items: ['WELD427', 'WELD403'] } } });
      expect(procedureRequiredQuals('TEST-GWP-QUALS', '11.1-1')).toEqual({ op: 'any', items: ['WELD427', 'WELD403'] });
      expect(procedureRequiredQuals('TEST-GWP-QUALS', 'no-such-wtn')).toEqual({ op: 'all', items: [] });
    });

    it('seeds Welder Qualifications on some WTNs and none on others', () => {
      const seeded = procedures().filter(p => /^W-\d+$/.test(p.gwp));
      const required = seeded.map(p => procedureRequiredQuals(p.gwp, p.wtn).items.length);
      expect(required.some(n => n > 0)).toBeTrue();
      expect(required.some(n => n === 0)).toBeTrue();
    });
  });

  describe('Override values', () => {
    it('procedureOverride gives a WTN\'s override values, or undefined when it has none', () => {
      addProcedure(blankProcedure('TEST-GWP-OV', '10.1-1'));
      expect(hasProcedure('TEST-GWP-OV', '10.1-1')).toBeTrue();
      expect(procedureOverride('TEST-GWP-OV', '10.1-1')).toBeUndefined();
      updateProcedure('TEST-GWP-OV', '10.1-1', { extraFields: { override: { phMin: '50', phMax: '', ipMin: '', ipMax: '', note: 'Thin wall' } } });
      expect(procedureOverride('TEST-GWP-OV', '10.1-1')).toEqual({
        overridePhMin: '50', overridePhMax: '', overrideIpMin: '', overrideIpMax: '', overrideNote: 'Thin wall',
      });
      expect(procedureOverride('TEST-GWP-OV', 'no-such-wtn')).toBeUndefined();
      updateProcedure('TEST-GWP-OV', '10.1-1', { sectionIds: [] });
      expect(procedureOverride('TEST-GWP-OV', '10.1-1')).toBeUndefined();
      expect(hasProcedure('TEST-GWP-OV', 'no-such-wtn')).toBeFalse();
    });
  });

  describe('changes made in Weld Engineering reach Weld Record and Weld Planning', () => {
    const add = (extraFields: Procedure['extraFields']) =>
      addProcedure({ ...blankProcedure('TEST-GWP-CHG', '20.1-1'), processType: 'Manual', application: 'Piping', extraFields });

    beforeEach(() => add({
      baseMetal1Type: '02-CS', baseMetal2Type: '02-CS', fillerMetalTypes: ['mil-70s-3'], fillerMetalSizes: ['3/32'],
      phMin: '100', phMax: '300', requiredQuals: { op: 'all', items: ['WELD412'] },
    }));

    it('an edited procedure changes the droplists, filled values, required quals and Weld Planning details', () => {
      updateProcedure('TEST-GWP-CHG', '20.1-1', { weldProcess: 'FCAW', extraFields: {
        baseMetal1Type: '04-AS', baseMetal2Type: '04-AS', fillerMetalTypes: ['mil-80s-50'], fillerMetalSizes: ['1/8'],
        phMin: 'NC', phMax: '350', requiredQuals: { op: 'all', items: ['WELD427'] },
      } });
      expect(gwpOptionsForMaterials('02-CS', '02-CS').map(o => o.value)).not.toContain('TEST-GWP-CHG');
      expect(gwpOptionsForMaterials('04-AS', '04-AS').map(o => o.value)).toContain('TEST-GWP-CHG');
      expect(fillerMetalTypeOptions('TEST-GWP-CHG', '20.1-1').map(o => o.value)).toEqual(['mil-80s-50']);
      expect(fillerMetalSizeOptions('TEST-GWP-CHG', '20.1-1').map(o => o.value)).toEqual(['1/8']);
      expect(wtnFillValue('TEST-GWP-CHG', '20.1-1', 'phMin')).toBe('NC');
      expect(wtnFillValue('TEST-GWP-CHG', '20.1-1', 'weldProcess')).toBe('fcaw');
      expect(procedureRequiredQuals('TEST-GWP-CHG', '20.1-1')).toEqual({ op: 'all', items: ['WELD427'] });
      expect(gwpDetails('TEST-GWP-CHG')).toEqual(jasmine.objectContaining({ weldProcess: 'FCAW', baseMetal1Type: '04-AS', fillerMetalTypes: ['mil-80s-50'] }));
    });

    it('unticking a section blanks its values for Weld Record and Weld Planning', () => {
      updateProcedure('TEST-GWP-CHG', '20.1-1', { sectionIds: SEEDED_SECTION_IDS.filter(id => id !== 'sec-preheat-interpass' && id !== 'sec-filler-metal') });
      expect(wtnFillValue('TEST-GWP-CHG', '20.1-1', 'phMin')).toBe('');
      expect(fillerMetalTypeOptions('TEST-GWP-CHG', '20.1-1')).toEqual([]);
      expect(gwpDetails('TEST-GWP-CHG')!.fillerMetalTypes).toEqual([]);
      expect(wtnFillValue('TEST-GWP-CHG', '20.1-1', 'weldProcess')).toBe('gtaw');
    });

    it('renaming, reordering or moving locked fields and sections changes nothing other systems read', () => {
      const before = [wtnFillValue('TEST-GWP-CHG', '20.1-1', 'phMin'), fillerMetalTypeOptions('TEST-GWP-CHG', '20.1-1'), wtnDescription('TEST-GWP-CHG', '20.1-1')];
      renameField('phMin', 'Preheat Minimum');
      renameSection('sec-filler-metal', 'Consumables');
      shiftField('phMin', 1);
      moveField('fillerMetalTypes', 'sec-base-metal');
      expect([wtnFillValue('TEST-GWP-CHG', '20.1-1', 'phMin'), fillerMetalTypeOptions('TEST-GWP-CHG', '20.1-1'), wtnDescription('TEST-GWP-CHG', '20.1-1')])
        .toEqual(before);
    });

    it('a locked field moved into a section the procedure has not ticked reads as blank', () => {
      addSection('Extra');
      const extra = procedureSections().at(-1)!;
      moveField('phMin', extra.id);
      expect(wtnFillValue('TEST-GWP-CHG', '20.1-1', 'phMin')).toBe('');
      updateProcedure('TEST-GWP-CHG', '20.1-1', { sectionIds: [...SEEDED_SECTION_IDS, extra.id] });
      expect(wtnFillValue('TEST-GWP-CHG', '20.1-1', 'phMin')).toBe('100');
    });

    it('a deleted procedure leaves the GWP/WTN droplists and fills nothing', () => {
      deleteProcedure('TEST-GWP-CHG', '20.1-1');
      expect(hasProcedure('TEST-GWP-CHG', '20.1-1')).toBeFalse();
      expect(allGwpOptions().map(o => o.value)).not.toContain('TEST-GWP-CHG');
      expect(wtnOptionsForGwp('TEST-GWP-CHG')).toEqual([]);
      expect(wtnFillValue('TEST-GWP-CHG', '20.1-1', 'phMin')).toBe('');
      expect(procedureRequiredQuals('TEST-GWP-CHG', '20.1-1')).toEqual({ op: 'all', items: [] });
      expect(gwpDetails('TEST-GWP-CHG')).toBeUndefined();
    });
  });
});
