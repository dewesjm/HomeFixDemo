/* The routing preview's "Why" for routings a signoff turned on or off or whose Types changed: an
   Admin > Attribute Code Exceptions row names its code, otherwise the Routing Settings Included when is named. */
import { Job } from '../../data/jobs';
import { WorkflowStage } from '../model/workflow-types';
import { RoutingEffect, hasLaterAnswerRows, routingEffect } from '../attribute-codes/exception-effects';
import { getTemplates } from './stage-templates';
import { describeConditions } from './step-conditions';

export interface SignedFlagChange { id: string; required: boolean; types: string; reason: string }

const typesKey = (s: WorkflowStage) => (s.typeOptions ?? []).map(o => o.value).join(',');
const codeText = (e: RoutingEffect) => `attribute code${e.codes.length > 1 ? 's' : ''} ${e.codes.join(', ')}`;

/* `before`/`after`: the stages around applySignedFlags; `fab` is the joint's Fabrication values */
export function signedFlagChanges(before: WorkflowStage[], after: WorkflowStage[], job: Job, fab?: Record<string, string>): SignedFlagChange[] {
  const templates = getTemplates()[job.trade] ?? [];
  return after.flatMap((s, i) => {
    const was = before[i];
    const typesChanged = typesKey(s) !== typesKey(was);
    if (s.required === was.required && !typesChanged) return [];
    const template = templates.find(t => t.id === s.id);
    const name = template?.label || s.label;
    const byCode = hasLaterAnswerRows(s.id, job);
    const now = byCode ? routingEffect(s.id, job, after, fab) : null;
    const prev = byCode ? routingEffect(s.id, job, before, fab) : null;
    const change = (reason: string): SignedFlagChange => ({ id: s.id, required: s.required, types: typesKey(s), reason });
    const out: SignedFlagChange[] = [];
    if (s.required !== was.required) {
      if (s.required && now?.add) out.push(change(`${name} is added by ${codeText(now)}`));
      else if (!s.required && now?.drop) out.push(change(`${name} is dropped by ${codeText(now)}`));
      else if (s.required && prev?.drop) out.push(change(`${name} is now required (${codeText(prev)} no longer drops it)`));
      else if (!s.required && prev?.add) out.push(change(`${name} is skipped (${codeText(prev)} no longer adds it)`));
      else {
        const rule = describeConditions(template?.includeWhen);
        out.push(change(s.required ? `${name} is now required (included when ${rule})` : `${name} is skipped (included only when ${rule})`));
      }
    }
    if (typesChanged && s.required) {
      const labels = (s.typeOptions ?? []).map(o => o.label).join(', ') || 'none';
      const source = now ? ` (${codeText(now)})` : prev ? ` (${codeText(prev)} no longer applies)` : '';
      out.push(change(`${name} now offers ${labels}${source}`));
    }
    return out;
  });
}

/* the changes still true once the signoff finished (an UNSAT route-back can rebuild a routing again) */
export function lastingReasons(changes: SignedFlagChange[], stages: WorkflowStage[]): string[] {
  return changes.filter(c => {
    const s = stages.find(x => x.id === c.id);
    return s && s.required === c.required && typesKey(s) === c.types;
  }).map(c => c.reason);
}
