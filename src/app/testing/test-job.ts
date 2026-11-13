/* Test-only fixtures shared by Weld Record specs: a small joint whose every field is written out here,
   so a test's routing doesn't change when the seeded JOBS generator or its attribute codes change,
   plus helpers that put the clock and saved data back the way each test found them. */
import type { Job } from '../data/jobs';

/* a plain joint: no attribute codes, no engineering notes, N Ind 3, VT on every NDT phase, no RT */
export function testJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'TEST-0001', xrefid: 'TEST-0001', ship: '100', hull: 'T0001', technician: 'Test Technician',
    drawing: 'H000-0001', drawingRev: 'A', joint: '1', jointDesign: 'C-24', weldType: 'Butt',
    pipeSize: '2"', wallThickness: '0.154"', materialType1: '02-CS', materialType2: '02-CS',
    mcl1: 'STD', mcl2: 'STD', joiningItem: 'Pipe A', joinToItem: 'Pipe B', sequenceNumber: '1',
    engineeringNotes: '', ndt: 'Visual only', pwht: 'None', nInd: '3',
    rtRoot: '', rtFinal: '', ndtRoot: 'VT', ndtEach: '', ndtFinal: 'VT', ut: '',
    order: '200000001', workPackage: 'WP-TEST', workPermit: '', waff: '',
    serialNumber: '100000001A', refitNumber: '00', repairNumber: '00',
    ss: 'NS', sfff: '', dssAaa: 'N', er1: '', er2: '', er3: '', er4: '',
    attributeCode1: '', attributeCode2: '', attributeCode3: '', attributeCode4: '',
    estimatedHours: 4,
    ...overrides,
  };
}

/* call in a describe(): Date and timers run on Jasmine's mock clock, starting at `iso`; advance with
   jasmine.clock().tick(ms). Uninstalled after each test. */
export function useFixedClock(iso = '2026-01-15T12:00:00.000Z') {
  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(iso));
  });
  afterEach(() => jasmine.clock().uninstall());
}

/* call in a describe(): each test starts with localStorage as it was, and leaves it that way */
export function keepLocalStorage() {
  let saved: [string, string][] = [];
  beforeEach(() => {
    saved = Object.keys(localStorage).map(k => [k, localStorage.getItem(k)!]);
  });
  afterEach(() => {
    localStorage.clear();
    for (const [k, v] of saved) localStorage.setItem(k, v);
  });
}
