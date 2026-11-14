/* Weld Record's joint service: the reads another system (or Admin > Services) makes to Weld Record about
   one joint. Read-only for now; which writes belong here is still open (Tasks.md, Weld Record services).
   A joint is named by hull + drawing + joint (unique, as in the joint page's URL) or by its XREFID
   (can be blank; when given it wins). The internal id is never used. Every joint answered carries
   url, the full Joint Details link, so other systems never build it themselves (jointUrl()). Every call answers { ok: true, data } or { ok: false, error, title }, never throws.
     getJoint(key)            = the joint's record fields, its current routing, Refit # and Repair #;
     findJoints(filter, opts) = for another system's logic: every joint matching all conditions (exact
                                values on any joint field or routing); whole records, no sort or paging;
     searchJoints(query)      = for a list screen: search text, column filters, sort, optional paging;
     getJointFields()         = every key a findJoints condition can name, with its label, group, type,
                                whether searchJoints has it as a column, and the values joints have
                                (choices) for fields picked from a list;
     getRouting(key)          = every routing on its path in order, signed or not, and which is current;
     getHistory(key, options) = its History entries, newest first, optionally one section only.
   In real life these are Weld Record's OData service; here they read the demo's joints and the saved
   workflows (WorkflowStore). */
import { Injectable, inject } from '@angular/core';
import { JOBS, type Job } from '../../data/jobs';
import { WorkflowStore } from '../services/workflow-store.service';
import { activeStageId, closesJoint, currentRoutingLabel } from '../routing-logic/current-routing';
import type { HistoryEntry } from '../model/history';
import { jointUrl } from '../joint-page/joint-route';
import { JOINT_FIELD_CATALOG } from '../catalogs/joint-fields';
import {
  SEARCH_COLUMNS, filterProblem, matchesFilter, searchProblem, searchRow, searchRows,
  type JointFilter, type JointRecord, type JointSearch, type JointSearchRow,
} from './joint-search';

export type { JointRecord, JointFilter, JointSearch, JointSearchRow } from './joint-search';

export interface JointKey { xrefid?: string; hull?: string; drawing?: string; joint?: string; }

export type JointResult<T> = { ok: true; data: T } | { ok: false; error: string; title: string };

export interface RoutingRow {
  id: string;
  label: string;
  required: boolean;
  signed: boolean;
  signedAt: string | null;
  signoffType: string;
  result: string | null;
  current: boolean;
}

/* the keys a findJoints condition can name: every joint field (never the internal id) plus routing */
export const JOINT_FIELDS: string[] = [...Object.keys(JOBS[0] ?? {}).filter(k => k !== 'id' && k !== '_fresh'), 'routing'];

export interface JointFieldDefinition {
  key: string;
  label: string;
  group: string;
  type: 'text' | 'number';
  /* searchJoints has it as a column (filters, sort) */
  searchColumn: boolean;
  /* fields picked from a list: the values joints have now, sorted */
  choices?: string[];
}

/* labels for joint fields Joint Details doesn't show; the catalog's currentRouting is routing here */
const OTHER_FIELDS: Record<string, { label: string; group: string }> = { technician: { label: 'Technician', group: 'Job' } };
const catalogKey = (key: string) => (key === 'routing' ? 'currentRouting' : key);

export const HISTORY_SECTIONS: HistoryEntry['section'][] = [
  'Stages', 'Sign-off', 'Correction', 'References', 'Fabrication', 'Release', 'Refit', 'Routing',
  'Deviation', 'Foreman Override', 'Engineering Override',
];

const fail = (error: string, title = 'Not found') => ({ ok: false as const, error, title });
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function keyText(k: JointKey): string {
  return k.xrefid?.trim() ? `XREFID ${k.xrefid.trim()}` : `hull ${k.hull ?? ''} / drawing ${k.drawing ?? ''} / joint ${k.joint ?? ''}`;
}

/* the one joint the key names: by XREFID when given, else hull + drawing + joint (all three needed) */
export function findJoint(key: JointKey, jobs: Job[] = JOBS): JointResult<Job> {
  const xrefid = key.xrefid?.trim() ?? '';
  let found: Job[];
  if (xrefid) {
    found = jobs.filter(j => j.xrefid && same(j.xrefid, xrefid));
  } else {
    if (!key.hull?.trim() || !key.drawing?.trim() || !key.joint?.trim()) {
      return fail('Give an XREFID, or hull, drawing and joint.', 'Key missing');
    }
    found = jobs.filter(j => same(j.hull, key.hull!) && same(j.drawing, key.drawing!) && same(j.joint, key.joint!));
  }
  if (!found.length) return fail(`There is no joint ${keyText(key)}.`);
  if (found.length > 1) return fail(`${found.length} joints match ${keyText(key)}; give the XREFID.`, 'More than one joint');
  return { ok: true, data: found[0] };
}

@Injectable({ providedIn: 'root' })
export class JointService {
  private store = inject(WorkflowStore);

  private record(job: Job): JointRecord {
    const { id: _id, _fresh, ...fields } = job;
    return { ...fields, routing: currentRoutingLabel(this.store.workflowFor(job)().stages), url: jointUrl(job) };
  }

  /* every joint as a record; openOnly leaves out joints at Sold */
  private records(openOnly?: boolean): JointRecord[] {
    const jobs = openOnly ? JOBS.filter(j => !this.isClosed(j)) : JOBS;
    return jobs.map(j => this.record(j));
  }

  private isClosed(job: Job): boolean {
    const id = activeStageId(this.store.workflowFor(job)().stages);
    return id === null || closesJoint(id);
  }

  getJoint(key: JointKey): JointResult<JointRecord> {
    const found = findJoint(key);
    return found.ok ? { ok: true, data: this.record(found.data) } : found;
  }

  findJoints(filter: JointFilter = {}, options: { openOnly?: boolean } = {}): JointResult<{ count: number; joints: JointRecord[] }> {
    const problem = filterProblem(filter, JOINT_FIELDS);
    if (problem) return fail(problem, 'Wrong value');
    const joints = this.records(options?.openOnly).filter(j => matchesFilter(j, filter ?? {}));
    return { ok: true, data: { count: joints.length, joints } };
  }

  searchJoints(query: JointSearch = {}): JointResult<{ total: number; page?: number; pageSize?: number; joints: JointSearchRow[] }> {
    const q = query ?? {};
    const problem = searchProblem(q);
    if (problem) return fail(problem, 'Wrong value');
    const found = searchRows(this.records(q.openOnly).map(searchRow), q);
    if (!q.pageSize) return { ok: true, data: { total: found.length, joints: found } };
    const page = q.page ?? 1;
    const start = (page - 1) * q.pageSize;
    return { ok: true, data: { total: found.length, page, pageSize: q.pageSize, joints: found.slice(start, start + q.pageSize) } };
  }

  getJointFields(): JointResult<{ fields: JointFieldDefinition[] }> {
    const records = this.records();
    const position = (key: string) => {
      const i = JOINT_FIELD_CATALOG.findIndex(c => c.key === catalogKey(key));
      return i < 0 ? JOINT_FIELD_CATALOG.length : i;
    };
    const fields = [...JOINT_FIELDS].sort((a, b) => position(a) - position(b)).map((key): JointFieldDefinition => {
      const entry = JOINT_FIELD_CATALOG.find(c => c.key === catalogKey(key));
      const { label, group } = entry ?? OTHER_FIELDS[key] ?? { label: key, group: 'Job' };
      const choices = entry?.kind === 'list'
        ? [...new Set(records.map(r => String(r[key as keyof JointRecord] ?? '')).filter(Boolean))].sort()
        : [];
      return {
        key, label, group, type: entry?.kind === 'number' ? 'number' : 'text',
        searchColumn: (SEARCH_COLUMNS as string[]).includes(key), ...(choices.length ? { choices } : {}),
      };
    });
    return { ok: true, data: { fields } };
  }

  getRouting(key: JointKey): JointResult<{ current: string; routings: RoutingRow[] }> {
    const found = findJoint(key);
    if (!found.ok) return found;
    const stages = this.store.workflowFor(found.data)().stages;
    const currentId = activeStageId(stages);
    return {
      ok: true,
      data: {
        current: currentRoutingLabel(stages),
        routings: stages.map(s => ({
          id: s.id, label: s.displayName || s.label, required: s.required, signed: s.signed, signedAt: s.signedAt,
          signoffType: s.signoffType, result: s.result, current: s.id === currentId,
        })),
      },
    };
  }

  getHistory(key: JointKey, options: { section?: HistoryEntry['section'] } = {}): JointResult<{ count: number; entries: HistoryEntry[] }> {
    const found = findJoint(key);
    if (!found.ok) return found;
    if (options.section && !HISTORY_SECTIONS.includes(options.section)) {
      return fail(`section must be one of ${HISTORY_SECTIONS.join(', ')}.`, 'Wrong value');
    }
    const all = this.store.workflowFor(found.data)().history;
    const entries = [...(options.section ? all.filter(e => e.section === options.section) : all)]
      .sort((a, b) => b.when.localeCompare(a.when));
    return { ok: true, data: { count: entries.length, entries } };
  }
}
