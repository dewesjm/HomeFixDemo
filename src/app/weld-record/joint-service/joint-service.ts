/* Weld Record's joint service: the reads another system (or Admin > Services) makes to Weld Record about
   one joint. Read-only for now; which writes belong here is still open (Tasks.md, Weld Record services).
   A joint is named by hull + drawing + joint (unique, as in the joint page's URL) or by its XREFID
   (can be blank; when given it wins). The internal id is never used. Every call answers { ok: true, data } or { ok: false, error, title }, never throws.
     getJoint(key)            = the joint's record fields, its current routing, Refit # and Repair #;
     getRouting(key)          = every routing on its path in order, signed or not, and which is current;
     getHistory(key, options) = its History entries, newest first, optionally one section only.
   In real life these are Weld Record's OData service; here they read the demo's joints and the saved
   workflows (WorkflowStore). */
import { Injectable, inject } from '@angular/core';
import { JOBS, type Job } from '../../data/jobs';
import { WorkflowStore } from '../services/workflow-store.service';
import { activeStageId, currentRoutingLabel } from '../routing-logic/current-routing';
import type { HistoryEntry } from '../model/history';

export interface JointKey { xrefid?: string; hull?: string; drawing?: string; joint?: string; }

export type JointResult<T> = { ok: true; data: T } | { ok: false; error: string; title: string };

export type JointRecord = Omit<Job, 'id' | '_fresh'> & { routing: string };

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

  getJoint(key: JointKey): JointResult<JointRecord> {
    const found = findJoint(key);
    if (!found.ok) return found;
    const { id: _id, _fresh, ...fields } = found.data;
    const wf = this.store.workflowFor(found.data)();
    return { ok: true, data: { ...fields, routing: currentRoutingLabel(wf.stages) } };
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
