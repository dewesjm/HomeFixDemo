/* Weld Engineering's procedure service: the calls another system would make to read or change a
   procedure (one WTN), named by its GWP + WTN. Every call answers { ok: true, data } or
   { ok: false, error } with a message saying what's wrong, never throws.
   - getProcedure(key, options): everything on a WTN, or only the fields asked for.
   - findProcedures(filter, options): every procedure matching a condition, header only unless fields are asked for.
   - updateProcedureFields(key, values, revisionNote): change section values, with the same checks as the edit form.
   Reads ask for fields by key (procedure-sections.ts), never by section name or number, since sections
   can be renamed and fields moved. Status defaults to Active. The demo keeps only each procedure's
   current values, so asking for an older revision is answered with an error.
   In real life this would be Weld Engineering's own backend and writes would need restricted access. */
import {
  procedures, getProcedure as procedureRow, updateProcedure, procedureName, PROCEDURE_STATUS_OPTIONS,
  type Procedure, type ProcedureStatus,
} from '../../../data/procedures';
import { procedureSections, sectionsOnProcedure, findField, type ExtraFields } from '../procedure-sections';
import { compactExtras, extraFieldProblems } from '../procedure-field-values';
import {
  procedureHeader, procedureRecord, procedureSubset, missingReason,
  type MissingField, type ProcedureHeader, type ProcedureKey, type ProcedureRecord,
} from './procedure-record';
import { filterProblem, matchesFilter, type ProcedureFilter } from './procedure-filter';
import { parseFieldInput } from './procedure-field-input';

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface ReadOptions {
  /* field keys to return; all of the procedure's sections when left out */
  fields?: string[];
  /* default Active */
  status?: ProcedureStatus;
}

export interface GetOptions extends ReadOptions {
  /* default: the current revision */
  revision?: string;
}

export interface ProcedureAnswer {
  procedure: ProcedureRecord;
  /* fields asked for that this procedure doesn't have */
  missing: MissingField[];
}

export interface FoundProcedure {
  header: ProcedureHeader;
  /* only when fields were asked for */
  sections?: ProcedureRecord['sections'];
  missing?: MissingField[];
}

const fail = (error: string) => ({ ok: false as const, error });
const statusLabel = (s: ProcedureStatus) => PROCEDURE_STATUS_OPTIONS.find(o => o.value === s)?.label ?? s;

function statusProblem(status: unknown): string {
  return PROCEDURE_STATUS_OPTIONS.some(o => o.value === status) ? '' : `Status must be one of ${PROCEDURE_STATUS_OPTIONS.map(o => o.value).join(', ')}.`;
}

function answer(p: Procedure, fields: string[] | undefined): ProcedureAnswer {
  const sections = procedureSections();
  if (!fields?.length) return { procedure: procedureRecord(p, sections), missing: [] };
  const { record, missing } = procedureSubset(p, fields, sections);
  return { procedure: record, missing };
}

export function getProcedure(key: ProcedureKey, options: GetOptions = {}): ServiceResult<ProcedureAnswer> {
  const status = options.status ?? 'active';
  if (statusProblem(status)) return fail(statusProblem(status));
  const p = procedureRow(key.gwp?.trim(), key.wtn?.trim());
  if (!p) return fail(`There is no procedure GWP ${key.gwp || '(blank)'} / WTN ${key.wtn || '(blank)'}.`);
  if (p.status !== status) return fail(`${procedureName(p)} is ${statusLabel(p.status)}, not ${statusLabel(status)}.`);
  const revision = options.revision?.trim();
  if (revision && revision !== p.revision) {
    return fail(`Revision ${revision} of ${procedureName(p)} isn't stored. This demo keeps only the current revision (${p.revision}).`);
  }
  return { ok: true, data: answer(p, options.fields) };
}

export function findProcedures(filter: ProcedureFilter = {}, options: ReadOptions = {}): ServiceResult<{ count: number; procedures: FoundProcedure[] }> {
  const status = options.status ?? 'active';
  if (statusProblem(status)) return fail(statusProblem(status));
  const sections = procedureSections();
  const problem = filterProblem(filter, sections);
  if (problem) return fail(problem);
  const found = procedures()
    .filter(p => p.status === status && matchesFilter(p, filter, sections))
    .map((p): FoundProcedure => {
      if (!options.fields?.length) return { header: procedureHeader(p) };
      const { procedure, missing } = answer(p, options.fields);
      return { header: procedure.header, sections: procedure.sections, missing };
    });
  return { ok: true, data: { count: found.length, procedures: found } };
}

/* Changes section values; header fields and section ticks are changed on the edit form only. A key
   with null or an empty value clears that field. Checks, in order: the procedure exists, each key is a
   field on a section this procedure has, each value has the right shape and allowed choices, the
   result passes the edit form's value checks, and an Active procedure gets a revision note (added to
   its Revision Record). Answers with the changed fields as they now read. */
export function updateProcedureFields(
  key: ProcedureKey, values: Record<string, unknown>, revisionNote = '', by = 'Service'
): ServiceResult<ProcedureAnswer> {
  const p = procedureRow(key.gwp?.trim(), key.wtn?.trim());
  if (!p) return fail(`There is no procedure GWP ${key.gwp || '(blank)'} / WTN ${key.wtn || '(blank)'}.`);
  const keys = Object.keys(values ?? {});
  if (!keys.length) return fail('Send at least one field value to change.');

  const sections = procedureSections();
  const extraFields: ExtraFields = { ...p.extraFields };
  for (const k of keys) {
    const reason = missingReason(k, p, sections);
    if (reason) return fail(`${k}: ${reason}`);
    const parsed = parseFieldInput(findField(k, sections)!, values[k]);
    if ('problem' in parsed) return fail(parsed.problem);
    extraFields[k] = parsed.value;
  }

  const compact = compactExtras(extraFields);
  const problems = extraFieldProblems(sectionsOnProcedure(p.sectionIds, sections).map(s => s.section), compact);
  if (problems.length) return fail(problems.join(' '));

  const note = revisionNote.trim();
  if (p.status === 'active' && !note) return fail(`${procedureName(p)} is Active: send a revision note describing the change.`);
  const revisionHistory = p.status === 'active'
    ? [...p.revisionHistory, { revision: p.revision, date: new Date().toISOString().slice(0, 10), note, by }]
    : p.revisionHistory;

  updateProcedure(p.gwp, p.wtn, { extraFields: compact, revisionHistory });
  return { ok: true, data: answer(procedureRow(p.gwp, p.wtn)!, keys) };
}
