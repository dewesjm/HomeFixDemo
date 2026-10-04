import { convertDate, convertLine, convertNumber } from './convert';
import { processRow } from './rules';
import { mergeIntoWeldJoints } from './merge';
import { fileChecks } from './file-checks';
import { FieldKey, LAYOUT, LINE_WIDTH, recordKey } from './layout';
import { formatLine } from './seed';
import { buildExternalLoads } from './loads';
import { lookupRecords } from './lookup';

type Rec = Record<FieldKey, string>;

const rec = (patch: Partial<Rec> = {}): Rec => ({
  xrefid: 'AB234', hull: 'S1234', drawing: 'H760-2000', joint: 'ST-10001', description: 'Butt weld',
  status: 'AC', workBy: 'Y', materialType1: '02-CS', materialType2: '04-AS', pipeSize: '2"',
  weldLength: '0012.50', plannedDate: '20261101', changedDate: '20260915', ...patch,
});
const line = (r: Rec, lineNo = 1) => ({ lineNo, text: formatLine(r, lineNo) });

describe('external loads: convert', () => {
  it('lays fields end to end within the line', () => {
    LAYOUT.slice(1).forEach((f, i) => expect(f.start).toBe(LAYOUT[i].start + LAYOUT[i].length));
    expect(line(rec()).text.length).toBe(LINE_WIDTH);
  });

  it('converts dates and numbers', () => {
    expect(convertDate('20261101')).toBe('2026-11-01');
    expect(convertDate('20261345')).toBeNull();
    expect(convertNumber('0012.50')).toBe('12.5');
    expect(convertNumber('00A2.50')).toBeNull();
  });

  it('cuts a line into converted values', () => {
    const row = convertLine(line(rec()));
    expect(row.errors).toEqual([]);
    expect(row.values.joint).toBe('ST-10001');
    expect(row.values.plannedDate).toBe('2026-11-01');
    expect(row.values.weldLength).toBe('12.5');
  });

  it('flags bad values, blank required fields and short lines without dropping the row', () => {
    const bad = line(rec({ plannedDate: '20261345', hull: '' }));
    const row = convertLine({ ...bad, text: bad.text.slice(0, 300) });
    expect(row.errors.map(e => e.field)).toEqual(['line', 'hull', 'plannedDate']);
    expect(row.values.plannedDate).toBe('20261345');
  });
});

describe('external loads: rules', () => {
  it('includes ordinary rows and says why others are left out', () => {
    expect(processRow(convertLine(line(rec()))).outcome).toBe('Included');
    expect(processRow(convertLine(line(rec({ workBy: 'V' })))).reason).toBe('Vendor Joint');
    expect(processRow(convertLine(line(rec({ status: 'CN' })))).reason).toBe('Excluded by status');
    expect(processRow(convertLine(line(rec({ plannedDate: 'BADDATE1' })))).outcome).toBe('Not converted');
  });
});

describe('external loads: merge', () => {
  const processed = (...recs: Rec[]) => recs.map((r, i) => processRow(convertLine(line(r, i + 1))));
  const kept = rec({ joint: 'ST-20000' });
  const gone = rec({ joint: 'ST-30000' });

  it('adds, updates and removes, but keeps joints with weld record data', () => {
    const before = [rec(), kept, gone].map(r => convertLine(line(r)).values);
    const result = mergeIntoWeldJoints(processed(rec({ description: 'Changed' }), rec({ joint: 'ST-40000' })), before,
      new Set([recordKey(kept)]));
    const action = (j: string) => result.find(r => r.values.joint === j)?.action;
    expect(action('ST-10001')).toBe('Updated');
    expect(action('ST-40000')).toBe('Added');
    expect(action('ST-30000')).toBe('Removed');
    expect(action('ST-20000')).toBe('Kept');
    expect(result.find(r => r.values.joint === 'ST-20000')!.keptBecause).toBe('Weld record data');
  });

  it('keeps a joint whose line could not be converted', () => {
    const before = [convertLine(line(rec())).values];
    const result = mergeIntoWeldJoints(processed(rec({ plannedDate: 'BADDATE1' })), before, new Set());
    expect(result[0].action).toBe('Kept');
    expect(result[0].keptBecause).toBe('Not converted');
  });

  it('ignores the changed date when comparing', () => {
    const before = [convertLine(line(rec())).values];
    expect(mergeIntoWeldJoints(processed(rec({ changedDate: '20261003' })), before, new Set())[0].action).toBe('Unchanged');
  });
});

describe('external loads: file checks', () => {
  it('fails an incomplete file', () => {
    const converted = [convertLine(line(rec()))];
    expect(fileChecks(1, 1, converted).every(c => c.passed)).toBeTrue();
    expect(fileChecks(5, 1, converted)[0].passed).toBeFalse();
  });
});

describe('external loads: sample loads', () => {
  const loads = buildExternalLoads(new Date(2026, 9, 4, 10, 7));

  it('times loads on the quarter hour', () => {
    expect(loads.live.run.startedAt).toEqual(new Date(2026, 9, 4, 10, 0));
    expect(loads.previous.run.startedAt).toEqual(new Date(2026, 9, 4, 9, 45));
  });

  it('shows every merge action and both exclusion reasons in the live load', () => {
    const actions = new Set(loads.live.weldJoints.map(j => j.action));
    ['Added', 'Updated', 'Unchanged', 'Removed', 'Kept'].forEach(a => expect(actions).toContain(a as any));
    const reasons = new Set(loads.live.processed.map(p => p.reason));
    ['Vendor Joint', 'Excluded by status', 'Conversion error'].forEach(r => expect(reasons).toContain(r));
  });

  it('logs conversion errors, protected joints and the failed check', () => {
    const types = new Set(loads.errors.map(e => e.type));
    expect(types).toContain('Conversion error');
    expect(types).toContain('Protected joint missing from source');
    expect(types).toContain('Protected joint excluded');
    expect(loads.errors.some(e => e.stage === 'File check')).toBeTrue();
  });

  it('looks a joint up by hull, drawing and joint across both kept loads', () => {
    const j = loads.live.weldJoints.find(w => w.action === 'Updated')!;
    const [result] = lookupRecords({ xrefid: '', hull: j.values.hull, drawing: j.values.drawing, joint: j.values.joint },
      [loads.live, loads.previous], loads.errors);
    expect(result.traces.length).toBe(2);
    expect(result.traces[0].weldJoint?.action).toBe('Updated');
  });

  it('looks a joint up by XREFID', () => {
    const j = loads.live.weldJoints.find(w => w.values.xrefid)!;
    const results = lookupRecords({ xrefid: j.values.xrefid.toLowerCase(), hull: '', drawing: '', joint: '' },
      [loads.live, loads.previous], loads.errors);
    expect(results.map(r => r.key)).toContain(j.key);
  });
});
