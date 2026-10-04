/* Sample vendor files for the External Loads page: a few dozen lines per load, enough to show each
   stage. Three versions of the file, each a small change from the one before:
     earlier  - what built the weld joints before the previous load
     previous - one bad date
     live     - two new joints, two updated, one removed, one protected joint missing, two status
                changes, one truncated line and one bad number */
import { HULLS, MATERIAL_TYPES, PIPE_SIZES, jointNumbers } from '../jobs';
import { FieldKey, LAYOUT, LINE_WIDTH, USED_WIDTH, recordKey } from './layout';
import { RawLine } from './convert';

type SeedRecord = Record<FieldKey, string>;

const COUNT = 32;
const SOURCE_HULLS = HULLS.slice(0, 3);
const JOINTS = jointNumbers(COUNT, 41);
const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DESCRIPTIONS = ['Butt weld, shell plate', 'Fillet weld, stiffener', 'Socket weld, branch', 'Seal weld, cover',
  'Butt weld, pipe spool', 'Attachment weld, bracket', 'Fillet weld, foundation', 'Overlay, flange face'];

function seeded(n: number) {
  let s = n * 9301 + 49297;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

function baseRecords(): SeedRecord[] {
  const rand = seeded(777);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  return Array.from({ length: COUNT }, (_, i) => {
    let xref = '';
    for (let j = 0; j < 5; j++) xref += ID_CHARS[Math.floor(rand() * ID_CHARS.length)];
    return {
      xrefid: i % 5 === 0 ? '' : xref,
      hull: SOURCE_HULLS[i % SOURCE_HULLS.length],
      drawing: `${i % 3 === 0 ? 'S' : 'H'}7${60 + (i % 7)}-${String(2000 + i * 13).padStart(4, '0')}`,
      joint: JOINTS[i],
      description: pick(DESCRIPTIONS),
      status: i === 7 ? 'SP' : 'AC',
      workBy: [4, 18, 25].includes(i) ? 'V' : 'Y',
      materialType1: pick(MATERIAL_TYPES),
      materialType2: pick(MATERIAL_TYPES),
      pipeSize: i % 3 === 0 ? '' : pick(PIPE_SIZES),
      weldLength: (1 + Math.floor(rand() * 400) / 4).toFixed(2).padStart(7, '0'),
      plannedDate: `202611${String(1 + (i % 28)).padStart(2, '0')}`,
      changedDate: '20260915',
    };
  });
}

export function formatLine(rec: SeedRecord, i: number): string {
  const used = LAYOUT.map(f => (rec[f.key] ?? '').padEnd(f.length).slice(0, f.length)).join('');
  /* vendor fields this load doesn't use, so the line looks like the real thing */
  const vendor = `VREF${String(100000 + i * 37)}  BATCH${String(i % 9)}  ${'X'.repeat(i % 4)}`;
  return (used + ' '.repeat(20) + vendor).padEnd(LINE_WIDTH).slice(0, LINE_WIDTH);
}

function toLines(records: SeedRecord[]): RawLine[] {
  return records.map((r, i) => ({ lineNo: i + 1, text: formatLine(r, i) }));
}

/* puts a new value into one field of a formatted line, without converting it */
function overwrite(line: RawLine, key: FieldKey, value: string): RawLine {
  const f = LAYOUT.find(l => l.key === key)!;
  const text = line.text.slice(0, f.start - 1) + value.padEnd(f.length).slice(0, f.length) + line.text.slice(f.start - 1 + f.length);
  return { ...line, text };
}

const BASE = baseRecords();
const at = (...idx: number[]) => idx.map(i => BASE[i]);
const changed = (rec: SeedRecord, patch: Partial<SeedRecord>): SeedRecord => ({ ...rec, ...patch, changedDate: '20261003' });

/* earlier file: records 0-29 plus one joint later dropped, record 3 with an older description */
const EARLIER: SeedRecord[] = [
  ...BASE.slice(0, 30).map((r, i) => (i === 3 ? { ...r, description: 'Butt weld, deck plate' } : r)),
  { ...BASE[31], joint: 'HV-19999', drawing: 'H769-9990' },
];

/* previous file: records 0-29 */
const PREVIOUS: SeedRecord[] = BASE.slice(0, 30);

/* live file: 14 and 16 gone, 5 and 10 changed, 20 and 22 cancelled, 30 and 31 new */
const LIVE: SeedRecord[] = [
  ...BASE.slice(0, 30)
    .map((r, i) => {
      if (i === 5) return changed(r, { pipeSize: '6"', plannedDate: '20261120' });
      if (i === 10) return changed(r, { description: 'Fillet weld, stiffener (revised)' });
      if (i === 20 || i === 22) return changed(r, { status: 'CN' });
      return r;
    })
    .filter((_, i) => i !== 14 && i !== 16),
  ...at(30, 31),
];

export const SEED_FILES = {
  earlier: toLines(EARLIER),
  previous: toLines(PREVIOUS).map(l => (l.lineNo === 12 ? overwrite(l, 'plannedDate', '20261345') : l)),
  live: toLines(LIVE).map(l => {
    if (l.lineNo === 9) return { ...l, text: l.text.slice(0, USED_WIDTH + 140) };
    if (l.lineNo === 26) return overwrite(l, 'weldLength', '00A2.50');
    return l;
  }),
};

/* joints that already have weld record data, so the load never removes them */
export const PROTECTED_KEYS = new Set(at(2, 6, 11, 16, 22).map(recordKey));
