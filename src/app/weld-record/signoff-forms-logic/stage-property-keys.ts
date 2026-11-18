/* the stage properties a field condition can read (signoff-forms-logic/condition-context.ts answers them) */

/* an "Engineering override is on/off" clause */
export const ENGINEERING_OVERRIDE_KEY = 'engineeringEntry';
/* "Rejected phase has RT/UT" / "Rejected phase has NQC RT/UT" clauses: on a Repair, whether the phase
   whose NDT rejected the joint has that exact RT/UT routing (regular or NQC row) on this joint */
export const REJECTED_PHASE_UTRT_KEY = 'rejectedPhaseHasUtrt';
export const REJECTED_PHASE_NQC_UTRT_KEY = 'rejectedPhaseHasNqcUtrt';
