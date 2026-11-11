import { weldJoints } from '../../data/weld-planning';
import { gwpDetails } from '../weld-engineering/procedure-values';
import { Condition, applyFilters } from '../../shared/filter-engine';
import { SEARCH_FIELDS, buildRow, standardLayout } from './weld-planning-filter-schema';

const cond = (c: Partial<Condition>): Condition => ({ op: 'is', value: '', to: '', values: [], ...c });

describe('weld-planning search schema', () => {
  const rows = weldJoints().map(buildRow);
  const withGwp = rows.find(r => r.gwp)!;

  it('a joint\'s row carries what its GWP stands for', () => {
    const d = gwpDetails(withGwp.gwp)!;
    expect(withGwp.weldProcess).toBe(d.weldProcess);
    expect(withGwp.processType).toBe(d.processType);
    expect(withGwp.baseMetal1Type).toBe(withGwp.materialType1);
    expect(withGwp.baseMetal2Type).toBe(withGwp.materialType2);
    expect(withGwp.fillerMetalTypes.length).toBe(d.fillerMetalTypes.length);
    const blank = rows.find(r => !r.gwp)!;
    expect([blank.weldProcess, blank.processType, blank.fillerMetalTypes.length]).toEqual(['', '', 0]);
  });

  it('every procedure field filters, and Standard opens with them in the bar', () => {
    const keys = ['gwp', 'weldProcess', 'processType', 'baseMetal1Type', 'baseMetal2Type', 'fillerMetalTypes'];
    expect(standardLayout().filterKeys).toEqual(keys);
    for (const key of keys) expect(SEARCH_FIELDS.some(f => f.key === key)).withContext(key).toBeTrue();
    const hits = applyFilters(rows, SEARCH_FIELDS, { weldProcess: [cond({ values: [withGwp.weldProcess] })] });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every(r => r.weldProcess === withGwp.weldProcess)).toBeTrue();
  });

  it('Filler Metal Type matches a joint whose GWP allows that filler', () => {
    const filler = withGwp.fillerMetalTypes[0];
    const hits = applyFilters(rows, SEARCH_FIELDS, { fillerMetalTypes: [cond({ values: [filler] })] });
    expect(hits).toContain(withGwp);
    expect(hits.every(r => r.fillerMetalTypes.includes(filler))).toBeTrue();
  });
});
