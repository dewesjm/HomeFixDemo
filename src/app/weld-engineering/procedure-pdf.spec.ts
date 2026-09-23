import { procedureDocDefinition } from './procedure-pdf';
import { WTN_POOL, type Procedure } from '../data/procedures';

const baseProcedure: Procedure = {
  id: 'W-999', title: 'Test title', status: 'active',
  wtns: [WTN_POOL[0], WTN_POOL[1]], weldProcess: 'GTAW',
  phMin: '120', phMax: '180', ipMin: '90', ipMax: '150',
  overridePhMin: '', overridePhMax: '', overrideIpMin: '', overrideIpMax: '', overrideNote: '',
  rules: ['Rule one.', 'Rule two.', 'Rule three.'],
  conditions: ['Condition one.'],
  qualificationsRequired: ['Qualification one.', 'Qualification two.'],
  createdBy: 'Test', createdAt: '', updatedAt: '',
};

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
  it('includes the core sections in order, omitting Override Requirements when unset', () => {
    const doc = procedureDocDefinition(baseProcedure);
    expect(sectionHeaders(doc)).toEqual([
      'PH/IP Requirements', 'Applicable WTNs', 'Rules', 'Specific Conditions', 'Qualifications Required',
    ]);
  });

  it('includes Override Requirements when any override field is set', () => {
    const withOverride: Procedure = { ...baseProcedure, overridePhMin: '110' };
    const doc = procedureDocDefinition(withOverride);
    expect(sectionHeaders(doc)).toContain('Override Requirements');
  });

  it('includes Override Requirements when only the override note is set', () => {
    const withOverride: Procedure = { ...baseProcedure, overrideNote: 'Approved deviation' };
    const doc = procedureDocDefinition(withOverride);
    expect(sectionHeaders(doc)).toContain('Override Requirements');
  });

  it('list lengths match the input arrays', () => {
    const doc = procedureDocDefinition(baseProcedure);
    expect(ulFor(doc, 'Applicable WTNs').length).toBe(baseProcedure.wtns.length);
    expect(ulFor(doc, 'Rules').length).toBe(baseProcedure.rules.length);
    expect(ulFor(doc, 'Specific Conditions').length).toBe(baseProcedure.conditions.length);
    expect(ulFor(doc, 'Qualifications Required').length).toBe(baseProcedure.qualificationsRequired.length);
  });

  it('renders a placeholder instead of an empty list when arrays are empty', () => {
    const empty: Procedure = { ...baseProcedure, wtns: [], rules: [], conditions: [], qualificationsRequired: [] };
    const doc = procedureDocDefinition(empty);
    expect(ulFor(doc, 'Rules')).toEqual(['—']);
  });

  it('includes the procedure id and title as content', () => {
    const doc = procedureDocDefinition(baseProcedure);
    const content = doc.content as any[];
    expect(content.some(c => c.text === 'W-999')).toBeTrue();
    expect(content.some(c => c.text === 'Test title')).toBeTrue();
  });
});
