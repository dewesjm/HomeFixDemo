/* The built-in Welding routing, in order. Admin > Routing Settings can reorder, edit and add to these
   (stage-templates.ts keeps those changes). Type options are in signoff-types.ts. */
import { StageTemplate } from '../weld-record/model/workflow-types';
import { ndtStage } from '../weld-record/routing/ndt';
import { NQC_SPLIT_STEP_IDS, nqcStepId } from '../weld-record/routing/step-ids';

const BUILT_IN_STEPS: StageTemplate[] = [
  { id: 'pre-fit', label: 'Pre-Fit', required: true, role: 'NQC Inspector' },
  { id: 'fit', label: 'Fit', required: true, role: 'Fitting' },
  { id: 'tack', label: 'Tack', displayName: 'Tack', required: true, role: 'Welding' },
  { id: 'fitup-insp', label: 'Fit-Up Insp', required: true, role: 'Foreman|Inspector', decisionLabel: 'Inspection Results', rejectToStage: 'fit' },
  { id: 'fitup-release', label: 'Fit-Up Release', displayName: 'Fit-Up Release', required: false, role: 'Foreman' },
  { id: 'deferred-tack', label: 'Deferred Tack', displayName: 'Tack', required: false, role: 'Welding' },
  { id: 'root-weld', label: 'Root', required: true, role: 'Welding' },
  ...(['vt5x', 'mtpt', 'utrt'] as const).map(kind => ndtStage('root', kind)),
  { id: 'root-layer', label: 'Layer', required: true, role: 'Welding' },
  ...(['vt5x', 'mtpt', 'utrt'] as const).map(kind => ndtStage('layer', kind)),
  { id: 'final-weld', label: 'Final Weld', required: true, role: 'Welding' },
  ...(['vt5x', 'mtpt', 'utrt'] as const).map(kind => ndtStage('final', kind)),
  { id: 'review-o63', label: 'O63 Records Review', required: true, role: 'O63 Records', rejectToStage: 'review-o63', decisionLabel: 'Inspection Results' },
  { id: 'review-o04', label: 'O04 Records Review', required: true, role: 'O04 Records', rejectToStage: 'review-o04', decisionLabel: 'Inspection Results' },
  { id: 'sold', label: 'Sold', required: true, role: 'O63 Records' },
];

/* each NQC_SPLIT_STEP_IDS step is followed by its NQC row: same step, signed by NQC Inspector, shown
   under the same Display Name (its Included when, seeded in step-conditions.ts, splits them by N Ind) */
export const WELDING_STEPS: StageTemplate[] = BUILT_IN_STEPS.flatMap(t => NQC_SPLIT_STEP_IDS.includes(t.id)
  ? [t, { ...t, id: nqcStepId(t.id), label: `NQC ${t.label}`, displayName: t.displayName ?? t.label, role: 'NQC Inspector' }]
  : [t]);
