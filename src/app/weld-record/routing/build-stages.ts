/* A joint's steps, built from the step templates and its Joint Details */
import { Job } from '../../data/jobs';
import { conditionsMatch, usesStepAnswers } from './step-conditions';
import { JobWorkflow, StageTemplate, WorkflowStage } from '../model/workflow-types';
import { getTemplates } from './stage-templates';
import { initialInspectionType, typeValues } from '../signoff-definition/stage-rules';
import { WELD_OVERRIDE_FIELDS } from '../signoff-definition/weld-fields';
import { NdtPhase, jobNdtSteps } from './ndt';
import { seedFabricationData } from '../../data/seed-fabrication';
import { baseStepId, isFitupInspId } from './step-ids';

export function buildStages(job: Job): WorkflowStage[] {
  /* the Welding steps from the merged templates, no cycling; Sold is the end */
  const tradeStages = getTemplates()['Welding'] ?? [];
  /* Admin > Routing Settings step conditions: Joint Details rules decide here whether the joint gets the step;
     a step with step-answer rules is always there and its rules set required (see applySignedFlags) */
  const included = (t: StageTemplate) => usesStepAnswers(t.includeWhen) || conditionsMatch(t.includeWhen, job);
  /* Sold follows whichever Records Review the joint got */
  const hasO63Data = tradeStages.some(t => t.id === 'review-o63' && included(t));

  const toStage = (t: StageTemplate): WorkflowStage => {
    const required = usesStepAnswers(t.includeWhen) ? conditionsMatch(t.includeWhen, job)
      : typeof t.required === 'function' ? t.required(job) : t.required;
    const inputs: Record<string, string> = isFitupInspId(t.id) ? { releaseToWelding: 'yes' } : {};
    /* Sold follows whichever Records track reviewed the job */
    const role = t.id === 'sold' ? (hasO63Data ? 'O63 Records' : 'O04 Records') : (t.role ?? '');
    let fields = [...t.fields];
    /* steps that record a WTN get the override fields (shown for matching WTNs) */
    if (fields.some(f => f.key === 'wtn')) {
      fields = [...fields, ...WELD_OVERRIDE_FIELDS.map(f => ({ ...f }))];
    }
    return {
      id: t.id,
      /* the joint shows the Display Name; the Routing name is for Admin > Routing Settings rules */
      label: t.displayName || t.label,
      required,
      role,
      fields,
      inputs,
      signoffFields: (t.signoffFields ?? []).map(f => ({ ...f })),
      signoffInputs: {},
      result: null,
      rejectToStage: t.rejectToStage ?? '',
      ...typeValues(initialInspectionType(t)),
      swapStageId: '',
      decisionLabel: t.decisionLabel ?? '',
      typeOptions: t.typeOptions,
      signed: false,
      signedAt: null,
    };
  };

  const ndtFor = jobNdtSteps(job);
  const phaseOf = (id: string) => /^(root|layer|final)-ndt-/.exec(baseStepId(id))?.[1] as NdtPhase | undefined;
  const stepFor = (id: string) => {
    const phase = phaseOf(id);
    return phase ? ndtFor[phase].find(st => baseStepId(id) === `${phase}-ndt-${st.kind}`) : undefined;
  };
  return tradeStages.filter(included).map(toStage).map(s => {
    const step = stepFor(s.id);
    /* a step an admin rule adds without the NDT values calling for it offers every method */
    if (!step) return s;
    /* only the method(s) the Joint Details values allow; a default that isn't one of them leaves Type blank */
    const typeOptions = s.typeOptions?.filter(o => step.methods.includes(o.value));
    return { ...s, typeOptions, ...typeValues(initialInspectionType({ id: s.id, typeOptions })) };
  });
}

/* a joint with nothing signed yet; Fabrication is pre-filled for the demo */
export function newWorkflow(job: Job): JobWorkflow {
  return {
    jobId: job.id,
    technician: job.technician,
    stages: buildStages(job),
    references: [],
    conditionCode: '',
    conditionCount: 0,
    history: [],
    fabricationData: seedFabricationData(job),
  };
}
