/* Test-only helpers for Weld Engineering specs: keep the shared procedure and section stores the
   same before and after each test, and build small procedures and fake Router/route/services. */
import { convertToParamMap } from '@angular/router';

import { procedures, type Procedure } from '../../../data/procedures';
import { STORAGE } from '../../../data/storage-keys';
import { procedureSections, SEEDED_SECTION_IDS } from '../procedure-sections';

/* call in a describe(): each test starts from the stores as they were, and leaves them that way */
export function keepProcedureStores() {
  let savedProcedures: Procedure[];
  let savedSections: ReturnType<typeof procedureSections>;
  let savedStorage: Record<string, string | null>;
  const keys = [STORAGE.procedures, STORAGE.procedureSections];

  beforeEach(() => {
    savedProcedures = structuredClone(procedures());
    savedSections = structuredClone(procedureSections());
    savedStorage = Object.fromEntries(keys.map(k => [k, localStorage.getItem(k)]));
  });

  afterEach(() => {
    procedures.set(savedProcedures);
    procedureSections.set(savedSections);
    for (const k of keys) {
      const v = savedStorage[k];
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    }
  });
}

/* WTN of every test procedure unless overridden */
export const TEST_WTN = '99.9-1';

/* a procedure (GWP gwp, WTN TEST_WTN) with every seeded section ticked and no section values */
export function testProcedure(gwp: string, overrides: Partial<Procedure> = {}): Procedure {
  return {
    title: 'Test procedure', status: 'draft',
    wtn: TEST_WTN, weldProcess: 'GTAW',
    gwp, revision: '0', effectiveDate: '2026-01-15',
    processType: 'Manual', application: '',
    rules: [], conditions: [],
    extraFields: {},
    sectionIds: [...SEEDED_SECTION_IDS],
    revisionHistory: [],
    createdBy: 'Test', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export const fakeRouter = () => jasmine.createSpyObj('Router', ['navigate']);

export const fakeRoute = (gwp?: string, wtn?: string) =>
  ({ snapshot: { paramMap: convertToParamMap(gwp && wtn ? { gwp, wtn } : {}) } });
