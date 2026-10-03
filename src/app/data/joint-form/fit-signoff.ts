/* Pre-Fit and Fit's Consumable Insert / Backing Ring sign-off fields: shown when the joint design
   calls for them, their MICs required only when traceability applies */
import { Job } from '../jobs';
import { SignoffField, WorkflowStage } from '../workflow';
import { getJointDesign } from '../joint-designs';
import { micApplies } from './fabrication-form';

type Fab = Record<string, string>;

const INSERT_KEYS = ['consumableInsertType', 'consumableInsertSize', 'consumableInsertId'];
const BACKING_RING_KEYS = ['backingRingType', 'backingRingId'];

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

/* signoff fields shown (showIf, and Pre-Fit/Fit's joint-design gating) */
export function visibleSignoffFields(stage: WorkflowStage, job: Job | undefined, fab: Fab): SignoffField[] {
  return stage.signoffFields.filter(f => {
    if (f.showIf && stage.signoffInputs[f.showIf.key] !== f.showIf.equals) return false;
    if (stage.id === 'fit' || stage.id === 'pre-fit') {
      if (INSERT_KEYS.includes(f.key) && !jointDesignRequiresInsert(job, fab)) return false;
      if (BACKING_RING_KEYS.includes(f.key) && !jointDesignRequiresBackingRing(job, fab)) return false;
    }
    return true;
  });
}

/* Signoff fields currently required, accounting for Pre-Fit/Fit's joint-design and traceability
   conditions -- shared by the sign blockers (reasons list) and field validation (per-field
   highlighting) so they can't drift out of sync. */
export function requiredSignoffFields(stage: WorkflowStage, job: Job | undefined, fab: Fab): SignoffField[] {
  return stage.signoffFields.filter(f => {
    if (stage.id === 'fit' || stage.id === 'pre-fit') {
      const insertApplies = jointDesignRequiresInsert(job, fab);
      const backingApplies = jointDesignRequiresBackingRing(job, fab);
      const micRequired = micApplies(job, 'id1') || micApplies(job, 'id2');
      if (f.key === 'consumableInsertType' || f.key === 'consumableInsertSize') return insertApplies;
      if (f.key === 'consumableInsertId') return insertApplies && micRequired;
      if (f.key === 'backingRingType') return backingApplies;
      if (f.key === 'backingRingId') return backingApplies && micRequired;
    }
    return !!f.required;
  });
}
