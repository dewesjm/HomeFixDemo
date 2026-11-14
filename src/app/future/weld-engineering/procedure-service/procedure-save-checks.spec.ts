import { procedureSaveProblem, choiceProblem } from './procedure-save-checks';
import type { Procedure } from '../../../data/procedures';
import { procedureSections, SEEDED_SECTION_IDS } from '../procedure-sections';

const sections = () => procedureSections().filter(s => SEEDED_SECTION_IDS.includes(s.id));

const proc = (gwp: string, wtn: string, extraFields: Procedure['extraFields'] = {}): Procedure => ({
  title: '', status: 'draft', wtn, weldProcess: '', gwp, revision: '', effectiveDate: '', processType: '',
  application: '', rules: [], conditions: [], extraFields, sectionIds: [...SEEDED_SECTION_IDS], revisionHistory: [],
  createdBy: 'Test', createdAt: '', updatedAt: '',
});

describe('procedure save checks', () => {
  const existing = proc('W-1', '01.1-1', { baseMetal1Type: '02-CS', baseMetal2Type: '02-CS' });

  it('needs a GWP and WTN', () => {
    expect(procedureSaveProblem(proc('', '1'), [], sections())?.detail).toBe('GWP and WTN are required');
    expect(procedureSaveProblem(proc('W-1', ''), [], sections())?.detail).toBe('GWP and WTN are required');
  });

  it('blocks a second procedure for the same GWP and WTN', () => {
    expect(procedureSaveProblem(proc('W-1', '01.1-1'), [existing], sections()))
      .toEqual({ summary: 'Duplicate GWP/WTN', detail: 'GWP W-1 / WTN 01.1-1 already exists' });
  });

  it('blocks a WTN whose base metals differ from the rest of its GWP', () => {
    const other = proc('W-1', '01.1-2', { baseMetal1Type: '02-CS', baseMetal2Type: '04-AS' });
    expect(procedureSaveProblem(other, [existing], sections())?.detail)
      .toBe('GWP W-1 is already 02-CS / 02-CS (see WTN 01.1-1)');
    const same = proc('W-1', '01.1-2', { baseMetal1Type: '02-CS', baseMetal2Type: '02-CS' });
    expect(procedureSaveProblem(same, [existing], sections())).toBeNull();
  });

  it('checks the values of ticked sections only', () => {
    const bad = proc('W-2', '1', { phMin: 'warm' });
    expect(procedureSaveProblem(bad, [], sections())?.detail).toBe('PH Min must be a number or NC.');
    const unticked = { ...bad, sectionIds: SEEDED_SECTION_IDS.filter(id => id !== 'sec-preheat-interpass') };
    expect(procedureSaveProblem(unticked, [], sections())).toBeNull();
  });

  it("blocks a changed list value that is not one of the field's choices, but keeps an unchanged one", () => {
    const before = { jointType: 'Retired choice' };
    const kept = proc('W-3', '1', { jointType: 'Retired choice' });
    expect(choiceProblem(kept, before, sections())).toBeNull();
    const changed = proc('W-3', '1', { jointType: 'Bogus', fillerMetalTypes: ['mil-70s-6'] });
    expect(choiceProblem(changed, before, sections()))
      .toEqual({ summary: 'Not a choice', detail: "Joint Type (jointType) doesn't allow Bogus." });
    expect(choiceProblem(proc('W-3', '1', { jointType: 'Groove', fillerMetalTypes: ['mil-70s-6', 'x'] }), {}, sections())?.detail)
      .toBe("Filler Metal Types (fillerMetalTypes) doesn't allow x.");
  });
});
