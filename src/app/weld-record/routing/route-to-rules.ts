/* Admin > Routing Settings "Reject routes to" and "Then go to" rules: when a routing is signed UNSAT
   (Reject) or accepted (Then), the first rule whose conditions all match picks where the joint goes;
   none matching = the routing's normal target. Besides Joint Details, a clause can test the signed
   routing's own answers ('self.<key>', raw option values). Conditions are joint-conditions.ts. */
import { Job } from '../../data/jobs';
import { Fabrication, StageAnswers } from '../catalogs/field-catalog';
import { ConditionRule, ruleMatches } from '../conditions/joint-conditions';

export interface RejectRule {
  when: ConditionRule;
  to: string;             /* stage id; 'repair' on an NDT routing adds a Repair */
}

/* reject target that puts the joint on Engineering Hold instead (routing/inserted/added-routings.ts insertEngineeringHold) */
export const ENGINEERING_HOLD_TARGET = 'engineering-hold';

/* the first reject rule matching the rejected routing `self`, if any */
export function matchingRejectRule(rules: RejectRule[] | undefined, job: Job, stages: StageAnswers[], self: StageAnswers, fab?: Fabrication): RejectRule | undefined {
  return rules?.find(r => ruleMatches(r.when, job, stages, self, fab));
}

/* the first accepted-signoff rule whose conditions match */
export function matchingThenRule(rules: RejectRule[] | undefined, job: Job, stages: StageAnswers[], self: StageAnswers, fab?: Fabrication): RejectRule | undefined {
  return rules?.find(r => ruleMatches(r.when, job, stages, self, fab));
}
