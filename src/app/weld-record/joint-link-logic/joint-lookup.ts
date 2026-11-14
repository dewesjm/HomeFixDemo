import { JOBS, type Job } from '../../data/jobs';

export interface JointKey { xrefid?: string; hull?: string; drawing?: string; joint?: string; }

export type JointResult<T> = { ok: true; data: T } | { ok: false; error: string; title: string };

export const jointFailure = (error: string, title = 'Not found') => ({ ok: false as const, error, title });
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
      return jointFailure('Give an XREFID, or hull, drawing and joint.', 'Key missing');
    }
    found = jobs.filter(j => same(j.hull, key.hull!) && same(j.drawing, key.drawing!) && same(j.joint, key.joint!));
  }
  if (!found.length) return jointFailure(`There is no joint ${keyText(key)}.`);
  if (found.length > 1) return jointFailure(`${found.length} joints match ${keyText(key)}; give the XREFID.`, 'More than one joint');
  return { ok: true, data: found[0] };
}
