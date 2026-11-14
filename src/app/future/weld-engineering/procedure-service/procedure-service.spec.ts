import { procedures, getProcedure as procedureRow } from '../../../data/procedures';
import { SEEDED_SECTION_IDS } from '../procedure-sections';
import { keepProcedureStores, testProcedure, TEST_WTN } from '../testing/procedure-test-state';
import { getProcedure, findProcedures, updateProcedureFields } from './procedure-service';

const GWP = 'SVC-1';
const key = { gwp: GWP, wtn: TEST_WTN };

function seed(overrides: Parameters<typeof testProcedure>[1] = {}) {
  procedures.set([testProcedure(GWP, {
    status: 'active', revision: '2',
    extraFields: {
      baseMetal1Type: '02-CS', phMin: '100', fillerMetalTypes: ['mil-70s-6', 'mil-80s-50'],
      requiredQuals: { op: 'any', items: ['WELD427', 'WELD403'] },
      override: { phMin: '60', phMax: '300', ipMin: '', ipMax: '', note: 'Dev 1' },
    },
    ...overrides,
  })]);
}

describe('procedure service', () => {
  keepProcedureStores();
  beforeEach(() => seed());

  describe('getProcedure', () => {
    it('answers the header and every section the procedure has', () => {
      const r = getProcedure(key);
      if (!r.ok) return fail(r.error);
      expect(r.data.procedure.header.gwp).toBe(GWP);
      expect(r.data.procedure.sections.length).toBe(SEEDED_SECTION_IDS.length);
      expect(r.data.procedure.sections[0].number).toBe(1);
    });

    it('says what kind each value is', () => {
      const r = getProcedure(key, { fields: ['phMin', 'fillerMetalTypes', 'override', 'requiredQuals'] });
      if (!r.ok) return fail(r.error);
      const fields = r.data.procedure.sections.flatMap(s => s.fields);
      const v = (k: string) => fields.find(f => f.key === k)!.value;
      expect(v('phMin')).toEqual({ kind: 'one', value: '100' });
      expect(v('fillerMetalTypes')).toEqual({ kind: 'many', values: ['mil-70s-6', 'mil-80s-50'] });
      expect(v('override').kind).toBe('parts');
      expect(v('requiredQuals')).toEqual(jasmine.objectContaining({ kind: 'quals', text: 'WELD427 OR WELD403' }));
    });

    it('returns only the sections holding the asked-for fields', () => {
      const r = getProcedure(key, { fields: ['phMin'] });
      if (!r.ok) return fail(r.error);
      expect(r.data.procedure.sections.map(s => s.name)).toEqual(['Preheat & Interpass Temperatures']);
    });

    it('lists unknown fields and fields on a section the procedure lacks under missing', () => {
      seed({ sectionIds: SEEDED_SECTION_IDS.filter(id => id !== 'sec-gas') });
      const r = getProcedure(key, { fields: ['shieldingGas', 'nope', 'phMin'] });
      if (!r.ok) return fail(r.error);
      expect(r.data.missing).toEqual([
        { key: 'shieldingGas', reason: 'This procedure doesn\'t have the Gas section.' },
        { key: 'nope', reason: 'No procedure field has this key.' },
      ]);
    });

    it('defaults to Active and refuses another status unless asked for', () => {
      seed({ status: 'draft' });
      const r = getProcedure(key);
      expect(r).toEqual({ ok: false, error: `GWP ${GWP} / WTN ${TEST_WTN} is Draft, not Active.` });
      expect(getProcedure(key, { status: 'draft' }).ok).toBeTrue();
    });

    it('explains that older revisions are not stored', () => {
      expect(getProcedure(key, { revision: '2' }).ok).toBeTrue();
      const r = getProcedure(key, { revision: '1' });
      expect(r.ok).toBeFalse();
      if (!r.ok) expect(r.error).toContain('keeps only the current revision (2)');
    });

    it('says when there is no such procedure', () => {
      expect(getProcedure({ gwp: 'X', wtn: 'Y' })).toEqual({ ok: false, error: 'There is no procedure GWP X / WTN Y.' });
    });
  });

  describe('findProcedures', () => {
    beforeEach(() => {
      seed();
      procedures.update(list => [...list,
        testProcedure(GWP, { wtn: '99.9-2', status: 'active', extraFields: { baseMetal1Type: '04-AS', phMin: '100' } }),
        testProcedure(GWP, { wtn: '99.9-3', status: 'draft', extraFields: { baseMetal1Type: '02-CS' } }),
      ]);
    });
    const wtns = (r: ReturnType<typeof findProcedures>) => r.ok ? r.data.procedures.map(p => p.header.wtn) : r.error;

    it('matches header and field values, ignoring case, Active only by default', () => {
      expect(wtns(findProcedures({ gwp: 'svc-1', baseMetal1Type: '02-cs' }))).toEqual([TEST_WTN]);
      expect(wtns(findProcedures({ gwp: GWP, baseMetal1Type: '02-CS' }, { status: 'draft' }))).toEqual(['99.9-3']);
    });

    it('matches a list field that contains the value and quals that name it', () => {
      expect(wtns(findProcedures({ gwp: GWP, fillerMetalTypes: 'MIL-80S-50' }))).toEqual([TEST_WTN]);
      expect(wtns(findProcedures({ gwp: GWP, requiredQuals: 'WELD403' }))).toEqual([TEST_WTN]);
    });

    it('answers headers only unless fields are asked for', () => {
      const plain = findProcedures({ gwp: GWP });
      if (!plain.ok) return fail(plain.error);
      expect(plain.data.count).toBe(2);
      expect(plain.data.procedures[0].sections).toBeUndefined();
      const withFields = findProcedures({ gwp: GWP }, { fields: ['phMin'] });
      if (!withFields.ok) return fail(withFields.error);
      expect(withFields.data.procedures[0].sections![0].fields[0].key).toBe('phMin');
    });

    it('refuses keys it cannot filter on', () => {
      expect(wtns(findProcedures({ nope: 'x' }))).toBe('No header or procedure field has the key nope.');
      expect(wtns(findProcedures({ status: 'draft' }))).toBe('Pick a status with the status option, not the filter.');
      expect(wtns(findProcedures({ override: 'x' }))).toContain('can\'t be filtered on');
    });
  });

  describe('updateProcedureFields', () => {
    it('changes values on an Active procedure and adds the revision note to its Revision Record', () => {
      const r = updateProcedureFields(key, { phMin: '150', fillerMetalTypes: ['mil-70s-6'] }, 'Raised preheat', 'Tester');
      if (!r.ok) return fail(r.error);
      const p = procedureRow(GWP, TEST_WTN)!;
      expect(p.extraFields['phMin']).toBe('150');
      expect(p.extraFields['fillerMetalTypes']).toEqual(['mil-70s-6']);
      expect(p.revisionHistory.at(-1)).toEqual(jasmine.objectContaining({ revision: '2', note: 'Raised preheat', by: 'Tester' }));
      expect(r.data.procedure.sections.flatMap(s => s.fields).map(f => f.key)).toEqual(['fillerMetalTypes', 'phMin']);
    });

    it('needs a revision note on an Active procedure only', () => {
      expect(updateProcedureFields(key, { phMin: '150' }).ok).toBeFalse();
      seed({ status: 'draft' });
      expect(updateProcedureFields(key, { phMin: '150' }).ok).toBeTrue();
      expect(procedureRow(GWP, TEST_WTN)!.revisionHistory).toEqual([]);
    });

    it('clears a field sent as null', () => {
      updateProcedureFields(key, { override: null }, 'Override withdrawn');
      expect('override' in procedureRow(GWP, TEST_WTN)!.extraFields).toBeFalse();
    });

    it('refuses wrong shapes, values outside the choices and failed checks without saving anything', () => {
      const before = structuredClone(procedureRow(GWP, TEST_WTN));
      const error = (values: Record<string, unknown>) => {
        const r = updateProcedureFields(key, values, 'note');
        return r.ok ? '' : r.error;
      };
      expect(error({ fillerMetalTypes: 'mil-70s-6' })).toContain('needs a list of values');
      expect(error({ fillerMetalTypes: ['bogus'] })).toBe('Filler Metal Types (fillerMetalTypes) doesn\'t allow bogus.');
      expect(error({ phMin: 'warm' })).toBe('PH Min must be a number or NC.');
      expect(error({ nope: '1' })).toBe('nope: No procedure field has this key.');
      expect(error({ requiredQuals: { op: 'both', items: [] } })).toContain('"op": "all" or "any"');
      expect(error({})).toBe('Send at least one field value to change.');
      expect(procedureRow(GWP, TEST_WTN)).toEqual(before);
    });
  });
});
