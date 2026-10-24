import { repairCodeRoutingError, isCustomRepairCode } from './repair-code-rules';
import { resolveInsertion, RoutingConfigurationError } from './generic-insertion';
import { insertionConfigurationErrors } from './insertion-validation';
import { insertionDefinitionId } from './instance-identity';
/* Signoff routing decisions; SignoffService owns saving and History. */
import { Job } from '../../data/jobs';
import { SignoffInput, WorkflowStage, JobWorkflow } from '../model/workflow-types';
import { setRoutingFrom } from './current-routing';
import { applySignedFlags, routeBack, moveRouting } from './route-changes';
import { fabricationSnapshot } from '../fabrication/fabrication-fields';
import { nextRepairStage, excavationNdtStageFor, stageFromTemplate, insertEngineeringHold, rejectHoldReason } from './added-steps';
import {
  isRepairStageId,
  isExcavationNdtStageId,
  baseStepId,
  stepOnJoint,
} from './step-ids';
import { hasDecision, initialInspectionType, typeValues } from '../signoff-definition/stage-rules';
import { getTemplates, routingTemplateId } from './stage-templates';
import { CUT_RESTARTS_AT } from './built-in-step-rules';
import { signedAsStep, signAsStep } from './type-routing';
import { describeConditions, matchingRejectRule, matchingThenRule, stageConditionFields, ENGINEERING_HOLD_TARGET } from './step-conditions';
import { RULE_TARGETS, isAddTarget, resolveRuleTarget } from './rule-targets';
import { signoffTypeOptions, usesReturningInspectionType } from '../signoff-definition/signoff-types';

const typeLabel = (s: WorkflowStage) => s.typeOptions?.find(o => o.value === s.signoffType)?.label ?? s.signoffType;

/* The first matching reject rule wins; otherwise use the routing's reject destination. */
function rejectTarget(stages: WorkflowStage[], job: Job, st: WorkflowStage, stageId: string) {
  const rule = matchingRejectRule((st.insertion?.definition ?? getTemplates()[job.trade]?.find(t => t.id === routingTemplateId(stageId)))?.rejectRules, job, stages, st);
  const at = stages.findIndex(s => s.id === stageId);
  const targetId = rule ? resolveRuleTarget(stages, st, rule.to) : '';
  const targetAt = stages.findIndex(s => s.id === stepOnJoint(stages, targetId)?.id);
  const usable = rule && (isAddTarget(rule.to) || (st.insertion && rule.to === 'continue') || (targetAt >= 0 && targetAt <= at));
  return { to: st.insertion && rule ? rule.to : usable ? rule.to : st.rejectToStage ?? '', rule: st.insertion && rule ? rule : usable ? rule : null };
}

export interface SignoffRouting {
  stages: WorkflowStage[];
  fabricationData: JobWorkflow['fabricationData'];
  /* the step this signoff is recorded on (a later step's id when the Type signs that step), as signed */
  recordedId: string;
  signed: WorkflowStage;
  /* the step it went back to, and the fit-up data as it was when going back to Fit or earlier blanked it */
  routedBack: { label: string; fabBefore?: SignoffInput[] } | null;
  /* the joint's new Refit # (a Cut) or Repair # (an NDT UNSAT), '' when unchanged */
  refitNumber: string;
  repairNumber: string;
  /* the special routing rules this signoff hit, for the routing preview's "Why" */
  reasons: string[];
}

/* engineeringHold: the signoff accepted deviations, so the joint goes to Engineering Hold */
export function routeSignoff(wf: JobWorkflow, job: Job, stageId: string, engineeringHold = false): SignoffRouting {
  let refitNumber = '';
  let repairNumber = '';
  const reasons: string[] = [];
  const signing = wf.stages.find(s => s.id === stageId)!;
  /* a Type that loads a later step's definition (Layer's Final Weld) is that step's signoff */
  const asStepId = signedAsStep(wf.stages, signing);
  if (isRepairStageId(stageId) && signing.result !== 'unsat') {
    const error = repairCodeRoutingError(signing, job, wf.stages, getTemplates()[job.trade]?.find(t => t.id === 'repair'));
    if (error) throw new RoutingConfigurationError(error);
  }
  const now = new Date().toISOString();
  /* an UNSAT whose reject target is this step (Records Review's default): the signoff is recorded, but
     the step isn't signed, so the joint stays there */
  const rejectsToItself = !asStepId && signing.result === 'unsat'
    && stepOnJoint(wf.stages, resolveRuleTarget(wf.stages, signing, rejectTarget(wf.stages, job, signing, stageId).to))?.id === stageId;
  /* stages with no SAT/UNSAT choice are accepted by signing */
  let stages: WorkflowStage[] = asStepId ? signAsStep(wf.stages, stageId, asStepId, now, wf.history.some(h => h.stageId === stageId && h.section === 'Sign-off')) : wf.stages.map(s => {
    if (s.id !== stageId) return s;
    return {
      ...s,
      result: hasDecision(s) ? s.result : (s.result ?? 'sat'),
      signed: !rejectsToItself,
      signedAt: rejectsToItself ? null : now,
    };
  });
  /* the History entry and the stage this signoff is recorded on */
  const recordedId = asStepId || stageId;
  const st = stages.find(s => s.id === recordedId)!;
  if (asStepId) reasons.push(`${typeLabel(signing)} is ${st.label}'s signoff, so ${st.label} is signed`);
  if (rejectsToItself) reasons.push(`rejected (UNSAT), and ${st.label}'s reject goes to itself, so the joint stays on ${st.label}`);

  /* go back (never un-sign): the current routing is set back to the target and every stage from
     there on comes up blank (routeBack). One History entry names where it went. */
  let fabricationData = wf.fabricationData;
  let routedBack: { label: string; fabBefore?: SignoffInput[] } | null = null;
  /* a built-in target means the joint's own step for it (its NQC or regular row) */
  const routeBackTo = (id: string) => {
    const target = stepOnJoint(stages, id);
    if (!target) return;
    const r = routeBack({ ...wf, stages, fabricationData }, job, target.id);
    stages = r.wf.stages;
    fabricationData = r.wf.fabricationData;
    routedBack = { label: target.label, fabBefore: r.fabReset ? fabricationSnapshot(wf.fabricationData) : undefined };
  };

  /* steps whose Admin > Routing Settings conditions use a signed answer (Defer Tack, Release to welding) turn on or off */
  const before = stages;
  stages = applySignedFlags(stages, job);
  if (st.result !== 'unsat') {
    stages.forEach((s, i) => {
      if (s.required === before[i].required) return;
      const rule = describeConditions(getTemplates()[job.trade]?.find(t => t.id === s.id)?.includeWhen);
      reasons.push(s.required ? `${s.label} is now required (included when ${rule})` : `${s.label} is skipped (included only when ${rule})`);
    });
  }

  /* Table targets share one executor for accepted and rejected signoffs. Counters and
     insertion bookkeeping belong here; the choice of destination belongs to the tables. */
  const executeTarget = (destination: string, reason = '') => {
    const currentIdx = stages.findIndex(s => s.id === stageId);
    if (insertionDefinitionId(destination)) {
      const templates = (getTemplates()[job.trade] ?? []).map(t => t.id === st.insertion?.definition.id ? st.insertion.definition : t);
      const errors = insertionConfigurationErrors(templates);
      if (errors.length) throw new RoutingConfigurationError(errors.join(' '));
      const inserted = resolveInsertion(templates, stages, job, st, destination, wf.history.flatMap(h => h.stageId ? [h.stageId] : []));
      stages = setRoutingFrom([...stages.slice(0, currentIdx + 1), inserted, ...stages.slice(currentIdx + 1)], inserted.id);
      reasons.push(`Insert ${inserted.label} (${inserted.role}; Types: ${inserted.typeOptions!.map(t => t.label).join(', ')})`);
      return;
    }
    if (destination === 'continue') {
      const id = st.insertion?.continueAt;
      if (!st.insertion) throw new RoutingConfigurationError('Continue requires an inserted routing.');
      if (id && !stages.some(s => s.id === id)) throw new RoutingConfigurationError('Continuation routing is missing.');
      if (id) stages = setRoutingFrom(stages, id);
      reasons.push('continue after the inserted work');
      return;
    }
    if (destination === ENGINEERING_HOLD_TARGET) {
      stages = insertEngineeringHold(stages, stageId, reason, job);
      reasons.push('an Engineering Hold is added');
      return;
    }
    if (destination === 'repair') {
      const repairStage = stageFromTemplate(nextRepairStage(stages, job), {
        originPhase: st.insertion?.originPhase || st.inputs['originPhase'] || baseStepId(stageId).split('-ndt-')[0],
        originStageId: st.insertion?.originStageId || st.inputs['originStageId'] || stageId,
        originInspectionType: st.insertion?.originInspectionType || st.inputs['originInspectionType'] || st.inspectionType,
      });
      const next = stages.slice(currentIdx + 1).find(s => !isRepairStageId(s.id) && !isExcavationNdtStageId(s.id));
      if (next) stages = routeBack({ ...wf, stages }, job, next.id).wf.stages;
      stages = setRoutingFrom([...stages.slice(0, currentIdx + 1), repairStage, ...stages.slice(currentIdx + 1)], repairStage.id);
      repairNumber = String(Number(job.repairNumber || '0') + 1).padStart(2, '0');
      reasons.push('a Repair is added');
      return;
    }
    if (destination === 'add-excavation-ndt') {
      if (!isRepairStageId(stageId)) return;
      const excavation = excavationNdtStageFor(job, st.inputs['originInspectionType'] ?? '', stageId);
      const id = excavation.id;
      if (!excavation.role || !excavation.typeOptions?.length) throw new RoutingConfigurationError('Cannot insert Excavation NDT: configure a persona and available inspection Types.');
      const resolved = excavation.typeOptions?.[0]?.value ?? '';
      excavation.inputs['typeChangedFromPtTo5x'] = st.inputs['originInspectionType'] === 'pt' && resolved === '5x' ? 'yes' : '';
      if (stages.some(s => s.id === id)) stages = stages.map(s => s.id === id ? excavation : s);
      else stages = [...stages.slice(0, currentIdx + 1), excavation, ...stages.slice(currentIdx + 1)];
      stages = setRoutingFrom(stages, id);
      reasons.push('Excavation NDT is added with the rejecting inspection’s Type and its Type exceptions');
      return;
    }
    const target = stepOnJoint(stages, resolveRuleTarget(stages, st, destination));
    if (!target) {
      if (st.insertion || (isRepairStageId(stageId) && isCustomRepairCode(st.inputs['repairType']))) throw new RoutingConfigurationError(`Destination ${destination} has no routing context.`);
      return;
    }
    const to = stages.findIndex(s => s.id === target.id);
    const cut = isRepairStageId(stageId) && st.inputs['repairType'] === 'cut' && target.id === CUT_RESTARTS_AT;
    if (to <= currentIdx) {
      routeBackTo(target.id);
      stages = stages.map(s => s.id === target.id ? { ...s, repeats: to === currentIdx ? (signing.repeats ?? 0) + 1 : target.repeats } : s);
      if (cut) {
        refitNumber = String(Number(job.refitNumber || '0') + 1).padStart(2, '0');
        routedBack = null;
      }
    } else {
      const moved = moveRouting({ ...wf, stages, fabricationData }, job, target.id);
      stages = moved.wf.stages;
      fabricationData = moved.wf.fabricationData;
    }
    /* Returned inspection context is data; the target's saved Type rules decide availability. */
    stages = stages.map(s => {
      if (s.id !== target.id) return s;
      const inputs = usesReturningInspectionType(s.id) ? { ...s.inputs, returningInspectionType: st.inspectionType } : s.inputs;
      const typeOptions = s.insertion ? s.typeOptions : signoffTypeOptions(s.id, job, inputs);
      return { ...s, inputs, typeOptions, ...typeValues(initialInspectionType({ typeOptions })) };
    });
  };

  if (st.result === 'unsat' && !rejectsToItself) {
    const { to, rule } = rejectTarget(stages, job, st, stageId);
    if (to) {
      reasons.push(rule ? `Reject rule ${describeConditions([rule.when], stageConditionFields(st))} -> ${to}` : `Rejected (UNSAT) -> ${to}`);
      executeTarget(to, rule ? rejectHoldReason(st, rule) : `${st.label} was UNSAT`);
    }
  }
  if (st.result !== 'unsat') {
    const rule = matchingThenRule((st.insertion?.definition ?? getTemplates()[job.trade]?.find(t => t.id === routingTemplateId(stageId)))?.thenRules, job, stages, signing);
    if (rule && (st.insertion || (isRepairStageId(stageId) && isCustomRepairCode(st.inputs['repairType'])) || isAddTarget(rule.to) || stepOnJoint(stages, resolveRuleTarget(stages, st, rule.to)))) {
      executeTarget(rule.to);
      reasons.push(`Then go to rule ${describeConditions([rule.when], stageConditionFields(signing))} -> ${RULE_TARGETS.find(t => t.id === rule.to)?.label ?? stepOnJoint(stages, rule.to)?.label ?? rule.to}`);
    }
  }

  if (st.insertion) {
    const definition = st.insertion.definition;
    const matched = st.result === 'unsat'
      ? matchingRejectRule(definition.rejectRules, job, stages, signing)
      : matchingThenRule(definition.thenRules, job, stages, signing);
    if (!matched && !(st.result === 'unsat' && st.rejectToStage)) executeTarget('continue');
  }

  /* accepted deviations: the joint waits on Engineering Hold, whatever else this sign-off did */
  if (engineeringHold) {
    stages = insertEngineeringHold(stages, recordedId, '', job);
    reasons.push('a deviation was accepted, so the joint goes to Engineering Hold');
  }

  return { stages, fabricationData, recordedId, signed: st, routedBack, refitNumber, repairNumber, reasons };
}
