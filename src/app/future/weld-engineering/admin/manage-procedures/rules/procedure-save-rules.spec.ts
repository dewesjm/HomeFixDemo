import { procedureSaveProblem } from './procedure-save-rules';
import type { Procedure } from '../../../../../data/procedures';
import { procedureSections, SEEDED_SECTION_IDS } from '../../../procedure-sections';

const sections = () => procedureSections().filter(s => SEEDED_SECTION_IDS.includes(s.id));

const wps = (id: string, gwp: string, wtn: string, extraFields: Procedure['extraFields'] = {}): Procedure => ({
  id, title: '', status: 'draft', wtn, weldProcess: '', gwp, wpsRev: '', effectiveDate: '', processType: '',
  application: '', rules: [], conditions: [], extraFields, sectionIds: [...SEEDED_SECTION_IDS], revisionHistory: [],
  createdBy: 'Test', createdAt: '', updatedAt: '',
});

describe('procedure save rules', () => {
  const existing = wps('W-1-1', 'W-1', '01.1-1', { baseMetal1Type: '02-CS', baseMetal2Type: '02-CS' });

  it('needs an id, GWP and WTN, and a new id that is not taken', () => {
    expect(procedureSaveProblem(wps('', 'W-1', '1'), true, [], sections())?.detail).toBe('Procedure ID is required');
    expect(procedureSaveProblem(wps('X', '', '1'), true, [], sections())?.detail).toBe('GWP and WTN are required');
    expect(procedureSaveProblem(wps('W-1-1', 'W-9', '1'), true, [existing], sections())?.summary).toBe('Duplicate ID');
  });

  it('blocks a second WPS for the same GWP and WTN', () => {
    expect(procedureSaveProblem(wps('W-1-2', 'W-1', '01.1-1'), true, [existing], sections())?.summary).toBe('Duplicate GWP/WTN');
  });

  it('blocks a WPS whose base metals differ from the rest of its GWP', () => {
    const other = wps('W-1-2', 'W-1', '01.1-2', { baseMetal1Type: '02-CS', baseMetal2Type: '04-AS' });
    expect(procedureSaveProblem(other, true, [existing], sections())?.detail)
      .toBe('GWP W-1 is already 02-CS / 02-CS (see W-1-1)');
    const same = wps('W-1-2', 'W-1', '01.1-2', { baseMetal1Type: '02-CS', baseMetal2Type: '02-CS' });
    expect(procedureSaveProblem(same, true, [existing], sections())).toBeNull();
  });

  it('checks the values of ticked sections only', () => {
    const bad = wps('W-2-1', 'W-2', '1', { phMin: 'warm' });
    expect(procedureSaveProblem(bad, true, [], sections())?.detail).toBe('PH Min must be a number or NC.');
    const unticked = { ...bad, sectionIds: SEEDED_SECTION_IDS.filter(id => id !== 'sec-preheat-interpass') };
    expect(procedureSaveProblem(unticked, true, [], sections())).toBeNull();
  });
});
