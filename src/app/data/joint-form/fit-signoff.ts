/* Pre-Fit and Fit's sign-off fields that must be filled in before signing (the fields shown are
   visibleSignoffFields(), workflow/shown-fields.ts) */
import { Job } from '../jobs';
import { SignoffField, WorkflowStage, visibleSignoffFields } from '../workflow';

type Fab = Record<string, string>;

/* Signoff fields currently required: shared by the sign blockers (reasons list) and field
   validation (per-field highlighting) so they can't drift out of sync. */
export function requiredSignoffFields(stage: WorkflowStage, job: Job | undefined, fab: Fab): SignoffField[] {
  return visibleSignoffFields(stage, job, fab).filter(f => f.required);
}
