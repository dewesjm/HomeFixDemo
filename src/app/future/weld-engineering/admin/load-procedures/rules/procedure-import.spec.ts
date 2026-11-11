import { parseCell, cellProblems, applyCells } from './procedure-import';
import { sectionColumns } from '../../../procedure-files';
import { procedureSections, SEEDED_SECTION_IDS } from '../../../procedure-sections';

const columns = () => sectionColumns(procedureSections().filter(s => SEEDED_SECTION_IDS.includes(s.id)));
const col = (id: string) => columns().find(c => c.id === id)!;

describe('Load Procedures cells', () => {
  it('has one column per section field, and one per override part', () => {
    const ids = columns().map(c => c.id);
    expect(ids).toContain('baseMetal1Type');
    expect(ids).toContain('requiredQuals');
    expect(ids.filter(id => id.startsWith('override.'))).toEqual([
      'override.phMin', 'override.phMax', 'override.ipMin', 'override.ipMax', 'override.note',
    ]);
    expect(col('baseMetal1Type').header).toBe('Base Metal: Base Metal 1 Type');
  });

  it('matches pick-many choices by label or value, ignoring case and inch marks', () => {
    expect(parseCell(col('fillerMetalTypes'), 'MIL-70S-6; mil-70s-3')).toEqual({ value: ['mil-70s-6', 'mil-70s-3'] });
    expect(parseCell(col('fillerMetalSizes'), '1/16"; 3/32')).toEqual({ value: ['1/16', '3/32'] });
    expect('problem' in parseCell(col('fillerMetalTypes'), 'MIL-1')).toBeTrue();
  });

  it('reads limits, list choices, admin-table rows and qualification text', () => {
    expect(parseCell(col('phMin'), 'nc')).toEqual({ value: 'NC' });
    expect(parseCell(col('phMin'), '150')).toEqual({ value: '150' });
    expect('problem' in parseCell(col('phMin'), 'warm')).toBeTrue();
    expect(parseCell(col('jointType'), 'groove')).toEqual({ value: 'Groove' });
    expect('problem' in parseCell(col('jointType'), 'Butt')).toBeTrue();
    expect(parseCell(col('weldPosition'), 'f')).toEqual({ value: 'F' });
    expect(parseCell(col('requiredQuals'), 'WELD412 AND (WELD427 OR WELD403)'))
      .toEqual({ value: { op: 'all', items: ['WELD412', { op: 'any', items: ['WELD427', 'WELD403'] }] } });
    expect('problem' in parseCell(col('requiredQuals'), 'NOTAQUAL')).toBeTrue();
  });

  it('lists a message for each filled cell that cannot be read, and skips blank ones', () => {
    expect(cellProblems(columns(), { phMin: 'warm', jointType: '', baseMetal1Type: '02-CS' }))
      .toEqual(['Preheat & Interpass Temperatures: PH Min must be a number or NC.']);
  });

  it('applies filled cells over the existing values, keeping the rest and an override group\'s other parts', () => {
    const base = { phMin: '100', phMax: '300', override: { phMin: '50', phMax: '', ipMin: '', ipMax: '', note: 'Old' } };
    expect(applyCells(columns(), { phMin: '', phMax: '350', 'override.note': 'New' }, base)).toEqual({
      phMin: '100', phMax: '350', override: { phMin: '50', phMax: '', ipMin: '', ipMax: '', note: 'New' },
    });
    expect(base.override.note).toBe('Old');
  });
});
