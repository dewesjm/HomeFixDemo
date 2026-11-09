/* Facts about a joint that field conditions read as virtual Joint Details keys ('yes' or ''),
   and how Admin > Signoff Type Forms words them */
import { Job } from '../../data/jobs';
import { requiresTraceability } from '../../data/mcl-traceability';
import { getJointDesign } from '../../data/joint-designs';

type Fab = Record<string, string>;

/* Revised Joint Design takes priority; falls back to the Joint Details joint design */
function effectiveJointDesign(job: Job | undefined, fab: Fab): string {
  return (fab['revisedJointDesign'] ?? '').trim() || (job?.jointDesign ?? '');
}

export function jointDesignRequiresInsert(job: Job | undefined, fab: Fab): boolean {
  const code = effectiveJointDesign(job, fab);
  return !!code && !!getJointDesign(code)?.requiresConsumableInsert;
}

export function jointDesignRequiresBackingRing(job: Job | undefined, fab: Fab): boolean {
  const code = effectiveJointDesign(job, fab);
  return !!code && !!getJointDesign(code)?.requiresBackingRing;
}

/* either joint member's MCL requires material traceability (Admin > Material Traceability) */
export function jointRequiresTraceability(job: Job | undefined): boolean {
  return !!job && (requiresTraceability(job.mcl1) || requiresTraceability(job.mcl2));
}
