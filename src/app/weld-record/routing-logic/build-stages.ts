/* A joint's steps, built from the step templates and its Joint Details */
import { routingPersona } from './routing-persona';
import { attributeTypeSettings, isJointsTwin, mayBeAddedLater, routingEffect } from '../attribute-codes-logic/exception-effects';
import { Job } from '../../data/jobs';
import { conditionsMatch, usesStepAnswers } from '../conditions-logic/joint-conditions';
import { JobWorkflow, WorkflowStage } from '../model/workflow-types';
import { StageTemplate } from '../model/stage-template';
import { isAddedTemplateId, getTemplates } from './routing-settings-rules';
import { initialInspectionType, typeValues } from '../signoff-forms-logic/stage-rules';
import { seedFabricationData } from '../../data/seed-fabrication';
import { isFitupInspId } from '../../data/welding-step-ids';

export function buildStages(job: Job, fab?: Record<string, string>): WorkflowStage[] {
  /* the Welding steps from the merged templates, no cycling; Sold is the end */
  const tradeStages = getTemplates(job.jointType).filter(t => !isAddedTemplateId(job.jointType, t.id));
  /* Admin > Routing Settings step conditions: Joint Details rules decide here whether the joint gets the step;
     a step with step-answer rules is always there and its rules set required (see applySignedFlags) */
  const routingIncluded = (t: StageTemplate) => usesStepAnswers(t.includeWhen, job.jointType) || conditionsMatch(t.includeWhen, job);
  /* then Admin > Attribute Code Exceptions: a row can drop the routing or add it (as the joint's NQC or
     regular row); a row waiting on a later answer puts it on the joint, not required, until it matches */
  const effectOf = (t: StageTemplate) => routingEffect(t.id, job);
  const addedByCode = (t: StageTemplate) => !!effectOf(t)?.add && isJointsTwin(t, job);
  const included = (t: StageTemplate) => !effectOf(t)?.drop
    && (routingIncluded(t) || addedByCode(t) || (mayBeAddedLater(t.id, job) && isJointsTwin(t, job)));

  const toStage = (t: StageTemplate): WorkflowStage => {
    const required = addedByCode(t) || (routingIncluded(t) && baseRequired(t, job, [], fab));
    const { typeOptions: exceptionOptions, attributeRules } = attributeTypeSettings(t.id, job);
    const typeOptions = exceptionOptions ?? t.typeOptions;
    const inputs: Record<string, string> = isFitupInspId(t.id) ? { releaseToWelding: 'yes' } : {};   /* Fit-Up Insp starts released to welding */
    const role = routingPersona(t, job);
    return {
      jointType: job.jointType,
      id: t.id,
      /* the joint shows the Display Name; the Routing name is for Admin > Routing Settings rules */
      label: t.displayName || t.label,
      required,
      role,
      inputs,
      signoffInputs: {},
      result: null,
      rejectToStage: t.rejectToStage ?? '',
      ...typeValues(initialInspectionType({ typeOptions })),
      decisionLabel: t.decisionLabel ?? '',
      typeOptions,
      ...(attributeRules ? { attributeRules } : {}),
      signed: false,
      signedAt: null,
    };
  };

  return tradeStages.filter(included).map(toStage);
}

/* required before any attribute code exception: a step with step-answer rules is required while they
   match (blank until signed), any other by its template */
export function baseRequired(t: StageTemplate, job: Job, stages: WorkflowStage[] = [], fab?: Record<string, string>): boolean {
  if (usesStepAnswers(t.includeWhen, job.jointType)) return conditionsMatch(t.includeWhen, job, stages, undefined, fab);
  return typeof t.required === 'function' ? t.required(job) : t.required;
}

/* a joint with nothing signed yet; Fabrication is pre-filled for the demo */
export function newWorkflow(job: Job): JobWorkflow {
  const fabricationData = seedFabricationData(job);
  return {
    jointType: job.jointType,
    jobId: job.id,
    technician: job.technician,
    stages: buildStages(job, fabricationData),
    references: [],
    history: [],
    fabricationData,
  };
}
