/* Facts about a joint that field conditions read as virtual Joint Details keys ('yes' or ''),
   and how Admin > Signoff Type Definition words them */
import { Job } from '../jobs';
import { isTitaniumJoint } from '../material-classification';
import { requiresTraceability } from '../mcl-traceability';
import { getJointDesign } from '../joint-designs';

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

interface VirtualJointDetail {
  value: (job: Job | undefined, fab: Fab) => boolean;
  yesText: string;
  noText: string;
}

export const VIRTUAL_JOINT_DETAILS: Record<string, VirtualJointDetail> = {
  titanium: {
    value: job => !!job && isTitaniumJoint(job),
    yesText: 'the joint is titanium', noText: 'the joint is not titanium',
  },
  consumableInsertRequired: {
    value: jointDesignRequiresInsert,
    yesText: 'the joint design needs a consumable insert', noText: 'the joint design doesn\'t need a consumable insert',
  },
  backingRingRequired: {
    value: jointDesignRequiresBackingRing,
    yesText: 'the joint design needs a backing ring', noText: 'the joint design doesn\'t need a backing ring',
  },
  materialTraceability: {
    value: job => jointRequiresTraceability(job),
    yesText: 'either part requires material traceability', noText: 'neither part requires material traceability',
  },
};
