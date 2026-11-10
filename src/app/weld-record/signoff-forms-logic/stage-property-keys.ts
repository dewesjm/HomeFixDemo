/* the stage properties a field condition can read (signoff-forms-logic/condition-context.ts answers them) */

/* an "Engineering override is on/off" clause */
export const ENGINEERING_OVERRIDE_KEY = 'engineeringEntry';
/* a "Rejected phase has RT/UT" clause: on a Repair, whether the phase whose NDT rejected the joint has
   an RT/UT step on this joint */
export const REJECTED_PHASE_UTRT_KEY = 'rejectedPhaseHasUtrt';
