/* Facts about a joint that field conditions read as virtual Joint Details keys ('yes' or ''),
   and how Admin > Signoff Type Forms words them */
import { Job } from '../../data/jobs';
import { isTitaniumJoint } from '../../data/material-classification';
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

interface VirtualJointDetail {
  /* its name in the condition editor's Joint detail picker */
  label: string;
  value: (job: Job | undefined, fab: Fab) => boolean;
  yesText: string;
  noText: string;
}

export const VIRTUAL_JOINT_DETAILS: Record<string, VirtualJointDetail> = {
  titanium: {
    label: 'Titanium joint',
    value: job => !!job && isTitaniumJoint(job),
    yesText: 'the joint is titanium', noText: 'the joint is not titanium',
  },
  consumableInsertRequired: {
    label: 'Joint design needs a consumable insert',
    value: jointDesignRequiresInsert,
    yesText: 'the joint design needs a consumable insert', noText: 'the joint design doesn\'t need a consumable insert',
  },
  backingRingRequired: {
    label: 'Joint design needs a backing ring',
    value: jointDesignRequiresBackingRing,
    yesText: 'the joint design needs a backing ring', noText: 'the joint design doesn\'t need a backing ring',
  },
  materialTraceability: {
    label: 'Either part requires material traceability',
    value: job => jointRequiresTraceability(job),
    yesText: 'either part requires material traceability', noText: 'neither part requires material traceability',
  },
  part1Traceability: {
    label: 'Part 1 requires material traceability',
    value: job => !!job && requiresTraceability(job.mcl1),
    yesText: 'part 1 requires material traceability', noText: 'part 1 does not require material traceability',
  },
  part2Traceability: {
    label: 'Part 2 requires material traceability',
    value: job => !!job && requiresTraceability(job.mcl2),
    yesText: 'part 2 requires material traceability', noText: 'part 2 does not require material traceability',
  },
  revisedJointDesignEntered: {
    label: 'Revised Joint Design entered',
    value: (_job, fab) => !!(fab['revisedJointDesign'] ?? '').trim(),
    yesText: 'a Revised Joint Design is entered', noText: 'no Revised Joint Design is entered',
  },
};
