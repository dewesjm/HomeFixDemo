import { Condition, MatchField, applyFilters, chipLabel, fieldMatches, isActive, isoDay } from './filter-engine';

const cond = (c: Partial<Condition>): Condition => ({ op: 'contains', value: '', to: '', values: [], ...c });
const HULL: MatchField = { key: 'hull', label: 'Hull', kind: 'text' };
const STATUS: MatchField = { key: 'status', label: 'Status', kind: 'list' };
const COST: MatchField = { key: 'cost', label: 'Cost', kind: 'number' };
const WHEN: MatchField = { key: 'when', label: 'When', kind: 'date' };

describe('filter-engine', () => {
  it('a condition with nothing filled in does not filter', () => {
    expect(isActive(cond({ value: '  ' }), 'text')).toBeFalse();
    expect(isActive(cond({ op: 'blank' }), 'text')).toBeTrue();
    expect(isActive(cond({ op: 'is' }), 'list')).toBeFalse();
    expect(isActive(cond({ op: 'between', to: '5' }), 'number')).toBeTrue();
    expect(fieldMatches(HULL, [cond({ value: '' })], 'anything')).toBeTrue();
  });

  it('text: includes are OR\'d, excludes must all hold, case and spaces ignored', () => {
    const conds = [cond({ value: 'k7' }), cond({ op: 'startsWith', value: 's' }), cond({ op: 'notContains', value: 's9' })];
    expect(fieldMatches(HULL, conds, 'XK7 ')).toBeTrue();
    expect(fieldMatches(HULL, conds, 'S1234')).toBeTrue();
    expect(fieldMatches(HULL, conds, 'S9234')).toBeFalse();
    expect(fieldMatches(HULL, conds, 'T1000')).toBeFalse();
    expect(fieldMatches(HULL, [cond({ op: 'blank' })], '')).toBeTrue();
    expect(fieldMatches(HULL, [cond({ op: 'notBlank' })], undefined)).toBeFalse();
  });

  it('list: is / is not any of the picked values', () => {
    expect(fieldMatches(STATUS, [cond({ op: 'is', values: ['Open', 'Hold'] })], 'hold')).toBeTrue();
    expect(fieldMatches(STATUS, [cond({ op: 'is', values: ['Open'] })], 'Closed')).toBeFalse();
    expect(fieldMatches(STATUS, [cond({ op: 'isNot', values: ['Open'] })], 'Closed')).toBeTrue();
  });

  it('number and date ranges; a date range includes its end day', () => {
    expect(fieldMatches(COST, [cond({ op: 'between', value: '10', to: '20' })], 20)).toBeTrue();
    expect(fieldMatches(COST, [cond({ op: 'gt', value: '10' })], 10)).toBeFalse();
    expect(fieldMatches(COST, [cond({ op: 'lt', value: '10' })], 'n/a')).toBeFalse();
    const late = new Date(2026, 4, 3, 23, 0).toISOString();
    expect(fieldMatches(WHEN, [cond({ op: 'between', value: '2026-05-01', to: '2026-05-03' })], late)).toBeTrue();
    expect(fieldMatches(WHEN, [cond({ op: 'between', value: '2026-05-01', to: '2026-05-02' })], late)).toBeFalse();
    expect(fieldMatches(WHEN, [cond({ op: 'gt', value: '2026-05-03' })], late)).toBeFalse();
  });

  it('different fields are AND\'d', () => {
    const rows = [{ hull: 'S1', status: 'Open' }, { hull: 'S2', status: 'Closed' }, { hull: 'T1', status: 'Open' }];
    const values = { hull: [cond({ op: 'startsWith', value: 's' })], status: [cond({ op: 'is', values: ['Open'] })] };
    expect(applyFilters(rows, [HULL, STATUS], values)).toEqual([rows[0]]);
    expect(applyFilters(rows, [HULL, STATUS], {})).toBe(rows);
  });

  it('chip text lists the includes, then the excludes', () => {
    expect(chipLabel(HULL, [cond({ value: 'K7' }), cond({ op: 'startsWith', value: 'S' }), cond({ op: 'notContains', value: 'S9' })]))
      .toBe('Hull: contains "K7" or starts with "S", and does not contain "S9"');
    expect(chipLabel(STATUS, [cond({ op: 'is', values: ['Open', 'Hold'] })])).toBe('Status: is Open, Hold');
  });

  it('isoDay gives the local yyyy-mm-dd', () => {
    expect(isoDay(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(isoDay(null)).toBe('');
  });
});
