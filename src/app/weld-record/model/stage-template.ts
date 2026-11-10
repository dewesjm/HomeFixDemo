/* a Routing Settings row: the definition a joint's step is built from */
import { Job } from '../../data/jobs';
import { ConditionRule } from '../conditions/joint-conditions';
import { RouteToRule } from '../routing/route-to-rules';

/* one choice in a step's Type droplist (e.g. Fit/Weld Build-Up, MT/PT), with its Admin > Routing Signoff
   Types name and settings */
export interface StageOption {
  label: string;
  value: string;
  default?: boolean;
  /* the routing step this Type signs when picked on an earlier step (Layer's Final Weld); unset = this step */
  signsStep?: string;
}

/* the definition a joint's step is built from (data/routing-settings.ts, data/welding-steps.ts) */
export interface StageTemplate {
  description?: string; /* Plain-English reference text maintained in Routing Settings. */
  classification?: 'numbered' | 'added';
  lifecycle?: 'ordinary' | 'repair' | 'excavation' | 'engineering-hold';
  status?: 'draft' | 'active' | 'inactive';
  id: string;
  label: string;
  displayName?: string;  /* override label shown on routing table (e.g. 'Tack' for both 'tack' and 'deferred-tack') */
  decisionLabel?: string; /* override 'Decision' label (e.g. 'Inspection Results') */
  /* bool or predicate keyed off the job */
  required: boolean | ((job: Job) => boolean);
  /* stage id to route back to when this stage is rejected (empty = no routing) */
  rejectToStage?: string;
  /* persona that signs this routing */
  persona?: string;
  /* Ordered Joint Details conditions choose a persona; no match uses persona. */
  personaRules?: { when: ConditionRule; persona: string }[];
  /* admin-managed signoff type options (Admin > Signoff Type to Routing) (e.g. Fit/Weld Build-Up, MT/PT) */
  typeOptions?: StageOption[];
  /* when a joint gets this step (conditions/joint-conditions.ts); none = always */
  includeWhen?: ConditionRule[];
  /* on UNSAT, the first matching rule picks the target instead of rejectToStage (routing/route-to-rules.ts) */
  rejectRules?: RouteToRule[];
  /* On accepted signoff, the first matching rule selects the next routing. */
  thenRules?: RouteToRule[];
  /* set once Admin > Routing Settings saves this step's reject rules; until then the built-in ones apply */
  rejectRulesEdited?: boolean;
  /* Admin > Routing Settings "Fabrication editable": the Fabrication fields can be changed while this is the current step */
  fabricationEditable?: boolean;
}
