import { procedures } from '../../../data/procedures';
import { keepProcedureStores, testProcedure } from '../testing/procedure-test-state';
import { searchProcedures } from './procedure-service';

describe('searchProcedures', () => {
  keepProcedureStores();
  beforeEach(() => procedures.set([
    testProcedure('S-1', { wtn: '01.1-1', title: 'Steel pipe', status: 'active', extraFields: { baseMetal1Type: '02-CS', fillerMetalTypes: ['mil-70s-6'] } }),
    testProcedure('S-2', { wtn: '02.2-1', title: 'Alloy plate', status: 'active', weldProcess: 'FCAW' }),
    testProcedure('S-3', { wtn: '03.3-1', title: 'Old steel', status: 'retired' }),
  ]));

  const gwps = (q: Parameters<typeof searchProcedures>[0]) => {
    const r = searchProcedures(q);
    return r.ok ? r.data.procedures.map(p => p.gwp) : r.error;
  };

  it('answers Active procedures unless status is filtered, with the list columns', () => {
    const r = searchProcedures();
    if (!r.ok) return fail(r.error);
    expect(r.data.total).toBe(2);
    expect(r.data.procedures[0]).toEqual(jasmine.objectContaining({ gwp: 'S-1', baseMetal1Type: '02-CS', baseMetal2Type: '', fillerMetalTypes: ['mil-70s-6'] }));
    expect(gwps({ filters: { status: ['active', 'retired'] } })).toEqual(['S-1', 'S-2', 'S-3']);
    expect(gwps({ filters: { status: 'retired' } })).toEqual(['S-3']);
  });

  it('searches text across the list columns and filters columns, ignoring case', () => {
    expect(gwps({ text: 'STEEL', filters: { status: ['active', 'retired'] } })).toEqual(['S-1', 'S-3']);
    expect(gwps({ text: 'mil-70s' })).toEqual(['S-1']);
    expect(gwps({ filters: { weldProcess: ['fcaw', 'SMAW'] } })).toEqual(['S-2']);
    expect(gwps({ filters: { wtn: '02.' } })).toEqual(['S-2']);
  });

  it('sorts and pages, answering the total matched', () => {
    expect(gwps({ sort: { by: 'title' } })).toEqual(['S-2', 'S-1']);
    expect(gwps({ sort: { by: 'title', order: 'desc' } })).toEqual(['S-1', 'S-2']);
    const r = searchProcedures({ filters: { status: ['active', 'retired'] }, sort: { by: 'gwp' }, page: 2, pageSize: 2 });
    if (!r.ok) return fail(r.error);
    expect(r.data).toEqual(jasmine.objectContaining({ total: 3, page: 2, pageSize: 2 }));
    expect(r.data.procedures.map(p => p.gwp)).toEqual(['S-3']);
  });

  it('says what is wrong with a query', () => {
    expect(gwps({ filters: { nope: 'x' } as never })).toContain('nope isn\'t a column');
    expect(gwps({ filters: { title: ['a'] } })).toContain('title: only');
    expect(gwps({ filters: { status: 'gone' } })).toContain('status must be one of');
    expect(gwps({ sort: { by: 'nope' as never } })).toContain('sort.by must be a column');
    expect(gwps({ page: 0, pageSize: 5 })).toBe('page must be a whole number from 1.');
    expect(gwps({ page: 1 })).toBe('Send pageSize with page.');
  });
});
