/* Weld Engineering's procedure service: the calls that read or change a procedure (one WTN), named by
   its GWP + WTN. Every write goes through here, from the edit form, Load Procedures, Delete and Admin >
   Services alike, so they all run the same checks. Every call answers { ok: true, data } or
   { ok: false, error, title } with a message saying what's wrong, never throws.
   Reads:  getProcedure(key, options) = everything on a WTN, or only the fields asked for;
           findProcedures(filter, options) = every procedure matching a condition, header only unless fields are asked for;
           searchProcedures(query) = a list screen's rows: search text, column filters, sort, optional paging;
           getProcedurePdf(key, options) = the procedure's official PDF (answers asynchronously).
   Writes: createProcedure(procedure), updateProcedure(key, changes, revisionNote), updateProcedureFields(key,
           values, revisionNote) (section values only), deleteProcedure(key), importProcedures(rows, revisionNote)
           (many at once, each row saved or refused on its own).
   The section and field definitions have their own service, section-service.ts.
   Reads ask for fields by key (procedure-sections.ts), never by section name or number, since sections
   can be renamed and fields moved. Status defaults to Active. The demo keeps only each procedure's
   current values, so asking for an older revision is answered with an error.
   In real life this would be Weld Engineering's own backend and writes would need restricted access. */
import {
  procedures, getProcedure as procedureRow, addProcedure, updateProcedure as storeUpdate, deleteProcedure as storeDelete,
  isProcedure, procedureName, PROCEDURE_STATUS_OPTIONS, type Procedure, type ProcedureStatus,
} from '../../../data/procedures';
import { procedureSections, findField, type ExtraFields } from '../procedure-sections';
import { compactExtras } from '../procedure-field-values';
import {
  procedureHeader, procedureRecord, procedureSubset, missingReason,
  type MissingField, type ProcedureHeader, type ProcedureKey, type ProcedureRecord,
} from './procedure-record';
import { filterProblem, matchesFilter, type ProcedureFilter } from './procedure-filter';
import { searchProblem, searchRow, searchRows, type ProcedureSearch, type ProcedureSearchRow } from './procedure-search';
import { parseFieldInput } from './procedure-field-input';
import { choiceProblem, procedureSaveProblem } from './procedure-save-checks';
import { changesProblem, type ProcedureChanges } from './procedure-changes';
import { procedurePdfBase64 } from '../procedure-pdf/procedure-pdf-actions';

import { fail, type ServiceResult } from './service-result';

export type { ProcedureChanges } from './procedure-changes';
export type { ServiceResult } from './service-result';

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

/* the revision note error, as the edit form shows it */
export const REVISION_NOTE_REQUIRED = 'This procedure is Active -- describe the change before saving';

const statusLabel = (s: ProcedureStatus) => PROCEDURE_STATUS_OPTIONS.find(o => o.value === s)?.label ?? s;
const noSuchProcedure = (key: ProcedureKey) =>
  fail(`There is no procedure GWP ${key.gwp || '(blank)'} / WTN ${key.wtn || '(blank)'}.`, 'Not found');
const text = (v: unknown) => (typeof v === 'string' ? v : '');
const rowFor = (key: ProcedureKey) => procedureRow(key.gwp?.trim(), key.wtn?.trim());

function statusProblem(status: unknown): string {
  return PROCEDURE_STATUS_OPTIONS.some(o => o.value === status) ? '' : `Status must be one of ${PROCEDURE_STATUS_OPTIONS.map(o => o.value).join(', ')}.`;
}

function answer(p: Procedure, fields?: string[]): ProcedureAnswer {
  const sections = procedureSections();
  if (!fields?.length) return { procedure: procedureRecord(p, sections), missing: [] };
  const { record, missing } = procedureSubset(p, fields, sections);
  return { procedure: record, missing };
}

/* ── Reads ── */
/* the stored procedure a read names, with the status and revision asked for */
function readable(key: ProcedureKey, options: { status?: ProcedureStatus; revision?: string }): ServiceResult<Procedure> {
  const status = options.status ?? 'active';
  if (statusProblem(status)) return fail(statusProblem(status));
  const p = rowFor(key);
  if (!p) return noSuchProcedure(key);
  if (p.status !== status) return fail(`${procedureName(p)} is ${statusLabel(p.status)}, not ${statusLabel(status)}.`, 'Not found');
  const revision = options.revision?.trim();
  if (revision && revision !== p.revision) {
    return fail(`Revision ${revision} of ${procedureName(p)} isn't stored. This demo keeps only the current revision (${p.revision}).`, 'Not found');
  }
  return { ok: true, data: p };
}

export function getProcedure(key: ProcedureKey, options: GetOptions = {}): ServiceResult<ProcedureAnswer> {
  const found = readable(key, options);
  return found.ok ? { ok: true, data: answer(found.data, options.fields) } : found;
}

export interface ProcedurePdf {
  fileName: string;
  contentType: 'application/pdf';
  /* the PDF file, base64 encoded */
  base64: string;
}

/* The procedure's official PDF, the same document every system gets (procedure-pdf/). Same status and
   revision rules as getProcedure. Answers later (the PDF is built asynchronously); never rejects. */
export async function getProcedurePdf(
  key: ProcedureKey, options: { status?: ProcedureStatus; revision?: string } = {}
): Promise<ServiceResult<ProcedurePdf>> {
  const found = readable(key, options);
  if (!found.ok) return found;
  const p = found.data;
  try {
    const base64 = await procedurePdfBase64(p);
    return { ok: true, data: { fileName: `${p.gwp}-${p.wtn}.pdf`, contentType: 'application/pdf', base64 } };
  } catch {
    return fail(`The PDF for ${procedureName(p)} couldn't be made.`, 'PDF not made');
  }
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

/* A list screen's rows (Procedure Lookup): search text, column filters, sort and optional paging
   (procedure-search.ts). Status is Active unless filtered. Answers the total matched and that page's rows. */
export function searchProcedures(
  query: ProcedureSearch = {}
): ServiceResult<{ total: number; page?: number; pageSize?: number; procedures: ProcedureSearchRow[] }> {
  const q = query ?? {};
  const problem = searchProblem(q);
  if (problem) return fail(problem);
  const sections = procedureSections();
  const found = searchRows(procedures().map(p => searchRow(p, sections)), q);
  if (!q.pageSize) return { ok: true, data: { total: found.length, procedures: found } };
  const page = q.page ?? 1;
  const start = (page - 1) * q.pageSize;
  return { ok: true, data: { total: found.length, page, pageSize: q.pageSize, procedures: found.slice(start, start + q.pageSize) } };
}

/* ── Writes ── */
/* Every write ends here. Checks, in order: the changed section values have the right shape, the edit
   form's save checks (GWP and WTN set, no duplicate pair, base metals agree across the GWP, section
   values), changed choices are allowed, and an Active procedure gets a revision note, added to its
   Revision Record. Blank values aren't stored. */
function save(original: Procedure | undefined, next: Procedure, revisionNote: string, by: string): ServiceResult<Procedure> {
  const sections = procedureSections();
  const before = original?.extraFields ?? {};
  for (const [k, v] of Object.entries(next.extraFields)) {
    const field = findField(k, sections);
    if (!field || JSON.stringify(v) === JSON.stringify(before[k])) continue;
    const parsed = parseFieldInput(field, v);
    if ('problem' in parsed) return fail(parsed.problem, 'Wrong value');
  }
  const form: Procedure = { ...next, extraFields: compactExtras(next.extraFields) };
  const others = procedures().filter(p => !(original && isProcedure(p, original.gwp, original.wtn)));
  const problem = procedureSaveProblem(form, others, sections) ?? choiceProblem(form, before, sections);
  if (problem) return fail(problem.detail, problem.summary);

  const note = revisionNote.trim();
  const wasActive = original?.status === 'active';
  if (wasActive && !note) return fail(REVISION_NOTE_REQUIRED, 'Revision note required');
  if (wasActive) {
    form.revisionHistory = [...form.revisionHistory, { revision: form.revision, date: new Date().toISOString().slice(0, 10), note, by }];
  }

  if (original) {
    const { createdAt, updatedAt, createdBy, ...rest } = form;
    storeUpdate(original.gwp, original.wtn, rest);
  } else {
    const { createdAt, updatedAt, ...rest } = form;
    addProcedure(rest);
  }
  return { ok: true, data: procedureRow(form.gwp, form.wtn)! };
}

/* a new procedure; anything not sent starts blank (Draft), with every section ticked */
export function createProcedure(input: ProcedureChanges & ProcedureKey, by = 'Service'): ServiceResult<ProcedureAnswer> {
  const problem = changesProblem(input ?? {}, procedureSections());
  if (problem) return fail(problem, 'Wrong value');
  const next: Procedure = {
    title: '', status: 'draft', weldProcess: '', revision: '', effectiveDate: '', processType: '', application: '',
    rules: [], conditions: [], extraFields: {}, sectionIds: procedureSections().map(s => s.id),
    ...input, gwp: input.gwp?.trim() ?? '', wtn: input.wtn?.trim() ?? '',
    revisionHistory: [], createdBy: by, createdAt: '', updatedAt: '',
  };
  const saved = save(undefined, next, '', by);
  return saved.ok ? { ok: true, data: answer(saved.data) } : saved;
}

/* changes header fields, section ticks, rules, conditions and section values (extraFields replaces
   the whole set); GWP and WTN can be changed too */
export function updateProcedure(
  key: ProcedureKey, changes: ProcedureChanges, revisionNote = '', by = 'Service'
): ServiceResult<ProcedureAnswer> {
  const p = rowFor(key);
  if (!p) return noSuchProcedure(key);
  const problem = changesProblem(changes ?? {}, procedureSections());
  if (problem) return fail(problem, 'Wrong value');
  const saved = save(p, { ...p, ...changes }, revisionNote, by);
  return saved.ok ? { ok: true, data: answer(saved.data) } : saved;
}

/* Changes only the section values sent, by field key; null or an empty value clears one. Each key
   must be a field on a section this procedure has. Answers with the changed fields as they now read. */
export function updateProcedureFields(
  key: ProcedureKey, values: Record<string, unknown>, revisionNote = '', by = 'Service'
): ServiceResult<ProcedureAnswer> {
  const p = rowFor(key);
  if (!p) return noSuchProcedure(key);
  const keys = Object.keys(values ?? {});
  if (!keys.length) return fail('Send at least one field value to change.');

  const sections = procedureSections();
  const extraFields: ExtraFields = { ...p.extraFields };
  for (const k of keys) {
    const reason = missingReason(k, p, sections);
    if (reason) return fail(`${k}: ${reason}`, 'Wrong value');
    const parsed = parseFieldInput(findField(k, sections)!, values[k]);
    if ('problem' in parsed) return fail(parsed.problem, 'Wrong value');
    extraFields[k] = parsed.value;
  }
  const saved = save(p, { ...p, extraFields }, revisionNote, by);
  return saved.ok ? { ok: true, data: answer(saved.data, keys) } : saved;
}

export function deleteProcedure(key: ProcedureKey): ServiceResult<{ deleted: ProcedureKey }> {
  const p = rowFor(key);
  if (!p) return noSuchProcedure(key);
  storeDelete(p.gwp, p.wtn);
  return { ok: true, data: { deleted: { gwp: p.gwp, wtn: p.wtn } } };
}

/* one row of importProcedures' answer, in the order sent */
export type ImportedRow = ProcedureKey & ({ ok: true; action: 'created' | 'updated' } | { ok: false; error: string; title: string });

/* Many procedures in one call (Load Procedures). Each row saves or is refused on its own, in order: a row
   whose GWP + WTN exists updates it (with revisionNote when it's Active), any other row creates one.
   Each row runs the same checks as createProcedure / updateProcedure. Answers every row's outcome. */
export function importProcedures(
  rows: (ProcedureChanges & ProcedureKey)[], revisionNote = '', by = 'Service'
): ServiceResult<{ created: number; updated: number; refused: number; rows: ImportedRow[] }> {
  if (!Array.isArray(rows) || !rows.length) return fail('Send at least one procedure row.');
  const out: ImportedRow[] = rows.map(row => {
    const key = { gwp: text(row?.gwp).trim(), wtn: text(row?.wtn).trim() };
    const existing = rowFor(key);
    const result = existing ? updateProcedure(existing, row, revisionNote, by) : createProcedure(row, by);
    return result.ok
      ? { ...key, ok: true, action: existing ? 'updated' : 'created' }
      : { ...key, ok: false, error: result.error, title: result.title };
  });
  const count = (f: (r: ImportedRow) => boolean) => out.filter(f).length;
  return {
    ok: true,
    data: {
      created: count(r => r.ok && r.action === 'created'), updated: count(r => r.ok && r.action === 'updated'),
      refused: count(r => !r.ok), rows: out,
    },
  };
}
