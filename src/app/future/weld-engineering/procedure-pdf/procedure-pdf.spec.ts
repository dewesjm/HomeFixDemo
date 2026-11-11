import { procedureDocDefinition } from './procedure-pdf';
import { type Procedure } from '../../../data/procedures';
import { procedureSections, SEEDED_SECTION_IDS, type ProcedureSection } from '../procedure-sections';

const seeded = () => procedureSections().filter(s => SEEDED_SECTION_IDS.includes(s.id));
const noOverride = { phMin: '', phMax: '', ipMin: '', ipMax: '', note: '' };

const baseProcedure: Procedure = {
  title: 'Test title', status: 'active',
  wtn: '05.5-1', weldProcess: 'GTAW',
  gwp: 'W-999', revision: '0', effectiveDate: '2026-01-01',
  processType: 'Manual', application: 'Piping',
  extraFields: {
    baseMetal1Type: '02-CS', baseMetal2Type: '02-CS', baseMetalThicknessMin: '0.125"', baseMetalThicknessMax: '0.75"',
    jointType: 'Groove', weldPosition: 'F',
    fillerMetalTypes: ['mil-80s-50'], fillerMetalClassification: 'MIL-80S-50', fillerMetalSizes: ['1/8', '5/32'],
    phMin: '120', phMax: '180', ipMin: '90', ipMax: '150',
  },
  sectionIds: [...SEEDED_SECTION_IDS],
  rules: ['Rule one.', 'Rule two.', 'Rule three.'],
  conditions: ['Condition one.'],
  revisionHistory: [{ revision: '1', date: '2026-01-15', note: 'Initial release.', by: 'Test' }],
  createdBy: 'Test', createdAt: '', updatedAt: '',
};

const withValues = (values: Procedure['extraFields']): Procedure =>
  ({ ...baseProcedure, extraFields: { ...baseProcedure.extraFields, ...values } });

/* pull every text-with-style: 'sectionHeader' entry's text, in order */
function sectionHeaders(doc: ReturnType<typeof procedureDocDefinition>): string[] {
  return (doc.content as any[])
    .filter(c => c && c.style === 'sectionHeader')
    .map(c => c.text);
}

function ulFor(doc: ReturnType<typeof procedureDocDefinition>, afterHeader: string): string[] {
  const content = doc.content as any[];
  const idx = content.findIndex(c => c && c.style === 'sectionHeader' && c.text === afterHeader);
  return content[idx + 1]?.ul ?? [];
}

describe('procedureDocDefinition', () => {
  it('prints the ticked sections in order, numbered, omitting Override Requirements when unset', () => {
    const doc = procedureDocDefinition(baseProcedure, seeded());
    expect(sectionHeaders(doc)).toEqual([
      'Revision Record',
      '1. Base Metal', '2. Joint Design', '3. Welding Position', '4. Filler Metal',
      '5. Welder Qualifications', '6. Preheat & Interpass Temperatures',
      '7. Equipment', '8. Gas', '9. Heat Input', '10. Parameters', '11. Heat Treatment',
      'Rules', 'Specific Conditions',
    ]);
  });

  it('prints field values in each section\'s table, with pick-many labels', () => {
    const content = procedureDocDefinition(baseProcedure, seeded()).content as any[];
    const table = (header: string) => content[content.findIndex(c => c?.text === header) + 1].table;
    expect(table('1. Base Metal').body[1]).toEqual(['02-CS', '02-CS', '0.125"', '0.75"']);
    expect(table('4. Filler Metal').body[1]).toEqual(['MIL-80S-50', 'MIL-80S-50', '1/8", 5/32"']);
    expect(table('2. Joint Design').body[1]).toEqual(['Groove', '-', '-', '-']);
  });

  it('prints added sections after the seeded ones, with their values', () => {
    const sections: ProcedureSection[] = [...seeded(),
      { id: 'a', name: 'Taco Tuesday', fields: [
        { key: 'shell_type', label: 'Shell Type', type: 'list', required: true, options: ['Hard', 'Soft'] },
        { key: 'taco_count', label: 'Taco Count', type: 'range', required: false, options: [] },
      ] },
      { id: 'b', name: 'Empty One', fields: [] },
    ];
    const p: Procedure = {
      ...withValues({ shell_type: 'Hard', taco_count: { min: 2, max: 4 } }), sectionIds: [...SEEDED_SECTION_IDS, 'a', 'b'],
    };
    const doc = procedureDocDefinition(p, sections);
    const headers = sectionHeaders(doc);
    expect(headers.slice(headers.indexOf('11. Heat Treatment') + 1, headers.indexOf('Rules')))
      .toEqual(['12. Taco Tuesday', '13. Empty One']);
    const content = doc.content as any[];
    const table = content[content.findIndex(c => c?.text === '12. Taco Tuesday') + 1].table;
    expect(table.body[1]).toEqual(['Hard', '2 - 4']);
  });

  it('prints only the sections the procedure has, keeping their numbers', () => {
    const p: Procedure = { ...baseProcedure, sectionIds: ['sec-gas', 'sec-heat-treatment'] };
    expect(sectionHeaders(procedureDocDefinition(p, seeded())))
      .toEqual(['Revision Record', '8. Gas', '11. Heat Treatment', 'Rules', 'Specific Conditions']);
  });

  it('includes Override Requirements when any override field is set', () => {
    const doc = procedureDocDefinition(withValues({ override: { ...noOverride, phMin: '110' } }), seeded());
    expect(sectionHeaders(doc)).toContain('Override Requirements');
  });

  it('includes Override Requirements when only the override note is set', () => {
    const doc = procedureDocDefinition(withValues({ override: { ...noOverride, note: 'Approved deviation' } }), seeded());
    expect(sectionHeaders(doc)).toContain('Override Requirements');
  });

  it('list lengths match the input arrays', () => {
    const doc = procedureDocDefinition(baseProcedure, seeded());
    expect(ulFor(doc, 'Rules').length).toBe(baseProcedure.rules.length);
    expect(ulFor(doc, 'Specific Conditions').length).toBe(baseProcedure.conditions.length);
    const withQuals = withValues({ requiredQuals: { op: 'all', items: ['WELD412', { op: 'any', items: ['WELD427', 'WELD403'] }] } });
    expect(ulFor(procedureDocDefinition(withQuals, seeded()), '5. Welder Qualifications')).toEqual(['WELD412 AND (WELD427 OR WELD403)']);
  });

  it('renders a placeholder instead of an empty list when arrays are empty', () => {
    const empty: Procedure = { ...baseProcedure, rules: [], conditions: [] };
    const doc = procedureDocDefinition(empty, seeded());
    expect(ulFor(doc, 'Rules')).toEqual(['-']);
    expect(ulFor(doc, '5. Welder Qualifications')).toEqual(['-']);
  });

  it('includes the GWP / WTN and title as content', () => {
    const doc = procedureDocDefinition(baseProcedure, seeded());
    const content = doc.content as any[];
    expect(content.some(c => c.text === 'GWP W-999 / WTN 05.5-1')).toBeTrue();
    expect(content.some(c => c.text === 'Test title')).toBeTrue();
  });

  it('shows a placeholder in the Revision Record when there is no revision history', () => {
    const noHistory: Procedure = { ...baseProcedure, revisionHistory: [] };
    const doc = procedureDocDefinition(noHistory, seeded());
    const content = doc.content as any[];
    const idx = content.findIndex(c => c && c.style === 'sectionHeader' && c.text === 'Revision Record');
    expect(content[idx + 1]?.text).toBe('No revisions recorded.');
  });

  it('includes a page header and footer', () => {
    const doc = procedureDocDefinition(baseProcedure, seeded());
    expect(typeof doc.header).toBe('function');
    expect(typeof doc.footer).toBe('function');
    const headerContent = (doc.header as any)(1, 1) as any;
    expect(headerContent.text).toContain('Weld Engineering');
    const footerContent = (doc.footer as any)(1, 3) as any;
    expect(JSON.stringify(footerContent)).toContain('Page 1 of 3');
    expect(JSON.stringify(footerContent)).toContain('Revision 0');
  });

  it('splits a section with many fields over several lines, keeping every field once and in order', () => {
    const fields = Array.from({ length: 14 }, (_, i) => ({ key: `wide_${i}`, label: `Wide Field ${i + 1}`, type: 'text' as const, required: false, options: [] }));
    fields[3] = { ...fields[3], width: 'full' } as typeof fields[number];
    const many: ProcedureSection = { id: 'many', name: 'Many', fields };
    const doc = procedureDocDefinition({ ...baseProcedure, sectionIds: ['many'] }, [many]);
    const content = doc.content as any[];
    const start = content.findIndex(c => c?.text === '1. Many') + 1;
    const sectionTables: any[] = [];
    for (const c of content.slice(start)) { if (!c?.table) break; sectionTables.push(c); }
    expect(sectionTables.length).toBeGreaterThan(2);
    expect(sectionTables.flatMap(t => t.table.body[0].map((h: any) => h.text))).toEqual(fields.map(f => f.label));
    expect(sectionTables.find(t => t.table.body[0][0].text === 'Wide Field 4').table.body[0].length).toBe(1);
    expect(sectionTables.every(t => t.table.widths.every((w: unknown) => typeof w === 'number'))).toBeTrue();
  });
});
