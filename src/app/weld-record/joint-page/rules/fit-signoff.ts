import { FormField } from '../../signoff-definition/field-catalog';
/* Pre-Fit and Fit's sign-off fields that must be filled in before signing (the fields shown are
   visibleSignoffFields(), workflow/shown-fields.ts) */
import { Job } from '../../../data/jobs';
import { WorkflowStage } from '../../model/workflow-types';
import { visibleSignoffFields } from '../../signoff-definition/shown-fields';

type Fab = Record<string, string>;

/* Signoff fields currently required: shared by the sign blockers (reasons list) and field
   validation (per-field highlighting) so they can't drift out of sync. */
export function requiredSignoffFields(stage: WorkflowStage, job: Job | undefined, fab: Fab): FormField[] {
  return visibleSignoffFields(stage, job, fab).filter(f => f.required);
}
