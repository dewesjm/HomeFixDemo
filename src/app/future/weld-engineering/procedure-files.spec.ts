import { procedureCsvColumns, sectionColumns } from './procedure-files';
import { procedureSections, type ProcedureSection } from './procedure-sections';
import { testProcedure } from './testing/procedure-test-state';

const sections = () => procedureSections();

/* the export as heading -> cell text, for one procedure */
const exported = (p: ReturnType<typeof testProcedure>, list: ProcedureSection[] = sections()) =>
  Object.fromEntries(procedureCsvColumns(list).map(c => [c.header, c.value(p)]));

describe('Procedure CSV export', () => {
  it('has the header columns, one column per section field, then Rules, Conditions and Revision History', () => {
    const headers = procedureCsvColumns(sections()).map(c => c.header);
    expect(headers.slice(0, 3)).toEqual(['WPS', 'WPS Rev', 'Effective Date']);
    expect(headers).toContain('Base Metal: Base Metal 1 Type');
    expect(headers).toContain('Preheat & Interpass Temperatures: Override Requirements PH Min');
    expect(headers.slice(-3)).toEqual(['Rules', 'Conditions', 'Revision History']);
    expect(headers.length).toBe(10 + sectionColumns(sections()).length + 3);
  });

  it('writes pick-many values as labels, override parts in their own columns, and lists joined with "; "', () => {
    const p = testProcedure('CSV-1', {
      rules: ['Rule one', 'Rule two'],
      revisionHistory: [{ wpsRev: '1', date: '2026-02-01', note: 'Raised PH', by: 'User' }],
      extraFields: {
        fillerMetalTypes: ['mil-70s-3', 'mil-80s-50'],
        phMin: '100',
        override: { phMin: '50', phMax: '', ipMin: '', ipMax: '', note: 'Thin wall' },
      },
    });
    const row = exported(p);
    expect(row['WPS']).toBe('CSV-1');
    expect(row['Filler Metal: Filler Metal Types']).toBe('MIL-70S-3; MIL-80S-50');
    expect(row['Preheat & Interpass Temperatures: PH Min']).toBe('100');
    expect(row['Preheat & Interpass Temperatures: Override Requirements PH Min']).toBe('50');
    expect(row['Preheat & Interpass Temperatures: Override Requirements Note']).toBe('Thin wall');
    expect(row['Rules']).toBe('Rule one; Rule two');
    expect(row['Revision History']).toBe('Rev 1 (2026-02-01): Raised PH');
  });

  it('leaves a section\'s columns blank on a procedure without that section ticked', () => {
    const p = testProcedure('CSV-2', { extraFields: { baseMetal1Type: '02-CS', phMin: '100' }, sectionIds: ['sec-base-metal'] });
    const row = exported(p);
    expect(row['Base Metal: Base Metal 1 Type']).toBe('02-CS');
    expect(row['Preheat & Interpass Temperatures: PH Min']).toBe('');
  });

  it('follows the section definitions: renamed sections and added fields get their own headings', () => {
    const custom: ProcedureSection[] = [{ id: 's-x', name: 'Cleaning', fields: [
      { key: 'solvent', label: 'Solvent', type: 'text', required: false, options: [] },
    ] }];
    const p = testProcedure('CSV-3', { extraFields: { solvent: 'Acetone' }, sectionIds: ['s-x'] });
    expect(exported(p, custom)['Cleaning: Solvent']).toBe('Acetone');
  });
});
