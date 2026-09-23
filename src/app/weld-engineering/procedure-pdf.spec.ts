import { procedureDocDefinition } from './procedure-pdf';
import { WTN_POOL, type Procedure } from '../data/procedures';

const baseProcedure: Procedure = {
  id: 'W-999', title: 'Test title', status: 'active',
  wtns: [WTN_POOL[0], WTN_POOL[1]], weldProcess: 'GTAW',
  gwp: 'W-999', wpsRev: '0', effectiveDate: '2026-01-01',
  processType: 'Manual',
  baseMetal1Type: 'Carbon Steel', baseMetal2Type: 'Carbon Steel', baseMetalThicknessMin: '0.125"', baseMetalThicknessMax: '0.75"',
  jointType: 'Groove', grooveAngle: '37.5°', rootOpening: '0.0625"', backing: 'None',
  weldPosition: 'F', weldProgression: 'N/A',
  fillerMetalType: 'MIL-80S-50', fillerMetalClassification: 'MIL-80S-50', fillerMetalSizeRange: '1/8" - 5/32"',
  phMin: '120', phMax: '180', ipMin: '90', ipMax: '150',
  overridePhMin: '', overridePhMax: '', overrideIpMin: '', overrideIpMax: '', overrideNote: '',
  currentType: 'DCEP', powerSource: 'Constant Current',
  shieldingGas: 'N/A', gasFlowRate: 'N/A', backingGas: 'None',
  heatInputMin: '25', heatInputMax: '45',
  amperageRange: '100-150 A', voltageRange: '18-24 V', travelSpeedRange: '5-9 in/min',
  pwhtTemp: 'N/A', pwhtTime: 'N/A',
  rules: ['Rule one.', 'Rule two.', 'Rule three.'],
  conditions: ['Condition one.'],
  qualificationsRequired: ['Qualification one.', 'Qualification two.'],
  revisionHistory: [{ wpsRev: '1', date: '2026-01-15', note: 'Initial release.', by: 'Test' }],
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
      'Revision Record',
      '1. Base Metal', '2. Joint Design', '3. Welding Position', '4. Filler Metal',
      '5. Welder Qualifications', '6. Preheat & Interpass Temperatures',
      '7. Equipment', '8. Gas', '9. Heat Input', '10. Parameters', '11. Heat Treatment',
      'Applicable WTNs', 'Rules', 'Specific Conditions',
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
    expect(ulFor(doc, '5. Welder Qualifications').length).toBe(baseProcedure.qualificationsRequired.length);
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

  it('shows a placeholder in the Revision Record when there is no revision history', () => {
    const noHistory: Procedure = { ...baseProcedure, revisionHistory: [] };
    const doc = procedureDocDefinition(noHistory);
    const content = doc.content as any[];
    const idx = content.findIndex(c => c && c.style === 'sectionHeader' && c.text === 'Revision Record');
    expect(content[idx + 1]?.text).toBe('No revisions recorded.');
  });

  it('includes a page header and footer', () => {
    const doc = procedureDocDefinition(baseProcedure);
    expect(typeof doc.header).toBe('function');
    expect(typeof doc.footer).toBe('function');
    const headerContent = (doc.header as any)(1, 1) as any;
    expect(headerContent.text).toContain('Weld Engineering');
    const footerContent = (doc.footer as any)(1, 3) as any;
    expect(JSON.stringify(footerContent)).toContain('Page 1 of 3');
    expect(JSON.stringify(footerContent)).toContain('Rev 0');
  });
});
