/* Runs the sample files through every stage so the External Loads page has load runs, stage tables
   and an error log that all agree. This stands in for the real load process; nothing here runs on a schedule. */
import { ConvertedRow, RawLine, convertLine } from './convert';
import { ProcessedRow, processRow } from './rules';
import { WeldJointRow, mergeIntoWeldJoints } from './merge';
import { FileCheck, fileChecks } from './file-checks';
import { FieldKey, KEY_FIELDS } from './layout';
import { PROTECTED_KEYS, SEED_FILES } from './seed';

export type RunStatus = 'Live' | 'Previous' | 'Failed check' | 'Replaced';

export interface LoadRun {
  id: number;
  startedAt: Date;
  finishedAt: Date;
  status: RunStatus;
  linesReceived: number;
  checks: FileCheck[];
  /* raw, converted and processed are kept for the live and previous loads only */
  dataKept: boolean;
  note: string;
}

export interface LoadData {
  run: LoadRun;
  raw: RawLine[];
  converted: ConvertedRow[];
  processed: ProcessedRow[];
  weldJoints: WeldJointRow[];
}

export type ErrorStage = 'File check' | 'Converted' | 'Merge';

export interface ErrorLogEntry {
  at: Date;
  loadId: number;
  stage: ErrorStage;
  type: string;
  xrefid: string;
  hull: string;
  drawing: string;
  joint: string;
  lineNo: number | null;
  message: string;
}

export interface ExternalLoads {
  runs: LoadRun[];
  live: LoadData;
  previous: LoadData;
  errors: ErrorLogEntry[];
}

const MINUTE = 60_000;
const LOAD_MINUTES = 15;

interface Stages { converted: ConvertedRow[]; processed: ProcessedRow[] }

function stages(raw: RawLine[]): Stages {
  const converted = raw.map(convertLine);
  return { converted, processed: converted.map(processRow) };
}

function includedValues(processed: ProcessedRow[]): Record<FieldKey, string>[] {
  return processed.filter(r => r.outcome === 'Included').map(r => r.values);
}

function run(id: number, startedAt: Date, status: RunStatus, raw: RawLine[], converted: ConvertedRow[],
             trailerCount: number, note: string): LoadRun {
  return {
    id, startedAt, status, note,
    finishedAt: new Date(startedAt.getTime() + (5 + (id % 3)) * MINUTE),
    linesReceived: raw.length,
    checks: fileChecks(trailerCount, raw.length, converted),
    dataKept: status === 'Live' || status === 'Previous',
  };
}

function keyOf(values: Partial<Record<FieldKey, string>>) {
  return Object.fromEntries(KEY_FIELDS.map(k => [k, values[k] ?? ''])) as Pick<ErrorLogEntry, 'hull' | 'drawing' | 'joint'>;
}

function loadErrors(load: LoadData): ErrorLogEntry[] {
  const at = load.run.finishedAt;
  const conversion = load.converted.filter(r => r.errors.length).map(r => ({
    at, loadId: load.run.id, stage: 'Converted' as const, type: 'Conversion error',
    xrefid: r.values.xrefid, ...keyOf(r.values), lineNo: r.lineNo,
    message: r.errors.map(e => e.message).join('; '),
  }));
  const protectedKept = load.weldJoints
    .filter(j => j.keptBecause === 'Weld record data')
    .map(j => ({
      at, loadId: load.run.id, stage: 'Merge' as const,
      type: j.missingFromFile ? 'Protected joint missing from source' : 'Protected joint excluded',
      xrefid: j.values.xrefid, ...keyOf(j.values), lineNo: null, message: j.detail,
    }));
  return [...conversion, ...protectedKept];
}

/* the most recent quarter hour, so the sample loads always look current */
function latestLoadTime(now: Date): Date {
  const d = new Date(now);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() - (d.getMinutes() % LOAD_MINUTES));
  return d;
}

export function buildExternalLoads(now = new Date()): ExternalLoads {
  const t = (loadsAgo: number) => new Date(latestLoadTime(now).getTime() - loadsAgo * LOAD_MINUTES * MINUTE);

  const earlier = stages(SEED_FILES.earlier);
  const previousStages = stages(SEED_FILES.previous);
  const liveStages = stages(SEED_FILES.live);
  const cutShort = SEED_FILES.previous.slice(0, 21);

  const previousJoints = mergeIntoWeldJoints(previousStages.processed, includedValues(earlier.processed), PROTECTED_KEYS);
  const afterPrevious = previousJoints.filter(j => j.action !== 'Removed').map(j => j.values);
  const liveJoints = mergeIntoWeldJoints(liveStages.processed, afterPrevious, PROTECTED_KEYS);

  const previous: LoadData = {
    run: run(1043, t(1), 'Previous', SEED_FILES.previous, previousStages.converted, SEED_FILES.previous.length,
      'Replaced by load 1044; kept for rollback'),
    raw: SEED_FILES.previous, ...previousStages, weldJoints: previousJoints,
  };
  const live: LoadData = {
    run: run(1044, t(0), 'Live', SEED_FILES.live, liveStages.converted, SEED_FILES.live.length, ''),
    raw: SEED_FILES.live, ...liveStages, weldJoints: liveJoints,
  };
  const failed = run(1042, t(2), 'Failed check', cutShort, cutShort.map(convertLine), SEED_FILES.previous.length,
    'Load 1041 stayed live until load 1043');
  const runs = [
    live.run, previous.run, failed,
    run(1041, t(3), 'Replaced', SEED_FILES.earlier, earlier.converted, SEED_FILES.earlier.length, ''),
    run(1040, t(4), 'Replaced', SEED_FILES.earlier, earlier.converted, SEED_FILES.earlier.length, ''),
  ];

  const failedEntries: ErrorLogEntry[] = failed.checks.filter(c => !c.passed).map(c => ({
    at: failed.finishedAt, loadId: failed.id, stage: 'File check', type: `Failed: ${c.name}`,
    xrefid: '', hull: '', drawing: '', joint: '', lineNo: null, message: `${c.detail}. The load did not go live.`,
  }));

  return { runs, live, previous, errors: [...loadErrors(live), ...loadErrors(previous), ...failedEntries] };
}

export const EXTERNAL_LOADS = buildExternalLoads();
