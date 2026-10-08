/* A joint's steps, built from the step templates and its Joint Details */
import { Job } from '../jobs';
import { conditionsMatch, usesStepAnswers } from '../step-conditions';
import { JobWorkflow, StageTemplate, WorkflowStage } from './types';
import { DEFAULT_SIGNOFF_FIELDS, getTemplates } from './stage-templates';
import { initialInspectionType } from './stage-rules';
import { WELD_OVERRIDE_FIELDS } from './weld-fields';
import { NdtPhase, jobNdtSteps } from './ndt';
import { seedFabricationData } from './seed-fabrication';

const WELD_STEP_IDS = ['tack', 'deferred-tack', 'root-weld', 'root-layer', 'final-weld'];

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
    const sf = t.signoffFields ?? DEFAULT_SIGNOFF_FIELDS;
    const inputs: Record<string, string> = t.id === 'fitup-insp' ? { releaseToWelding: 'yes' } : {};
    /* route NDT inspections to NQC Inspector when N Ind. is 1 or 2; Sold follows whichever Records track reviewed the job */
    const role = (t.role === 'Inspector' && (job.nInd === '1' || job.nInd === '2'))
      ? 'NQC Inspector' : t.id === 'sold' ? (hasO63Data ? 'O63 Records' : 'O04 Records') : (t.role ?? '');
    /* Only Root (not Final Weld) gets the 5X inspection field, and only when NDT Root allows 5X --
       answering yes auto-signs the Root 5X/VT stage */
    let fields = (t.id === 'root-weld' && (job.ndtRoot || '').trim().toUpperCase() === '5X')
      ? [...t.fields, { key: 'performed5x', label: 'Did you perform 5X inspection and was it successful?', type: 'select' as const,
          options: [{ label: 'No I didn\'t perform 5X', value: 'no' }, { label: 'Yes I performed 5X and it was successful', value: 'yes' }] }]
      : [...t.fields];
    /* Weld stages get override fields */
    if (WELD_STEP_IDS.includes(t.id)) {
      fields = [...fields, ...WELD_OVERRIDE_FIELDS.map(f => ({ ...f }))];
    }
    return {
      id: t.id,
      label: t.label,
      required,
      role,
      fields,
      inputs,
      signoffFields: sf.map(f => ({ ...f })),
      signoffInputs: {},
      result: null,
      rejectToStage: t.rejectToStage ?? '',
      signoffType: t.typeOptions?.find(o => o.default)?.value ?? t.typeOptions?.[0]?.value ?? 'standard',
      swapStageId: '',
      inspectionType: initialInspectionType(t),
      decisionLabel: t.decisionLabel ?? '',
      typeOptions: t.typeOptions,
      signed: false,
      signedAt: null,
    };
  };

  const ndtFor = jobNdtSteps(job);
  const phaseOf = (id: string) => /^(root|layer|final)-ndt-/.exec(id)?.[1] as NdtPhase | undefined;
  const stepFor = (id: string) => {
    const phase = phaseOf(id);
    return phase ? ndtFor[phase].find(st => id === `${phase}-ndt-${st.kind}`) : undefined;
  };
  return tradeStages.filter(included).map(toStage).map(s => {
    const step = stepFor(s.id);
    /* a step an admin rule adds without the NDT values calling for it offers every method */
    if (!step) return s;
    /* only the method(s) the Joint Details values allow; a default that isn't one of them leaves Type blank */
    const typeOptions = s.typeOptions?.filter(o => step.methods.includes(o.value));
    return { ...s, typeOptions, inspectionType: initialInspectionType({ id: s.id, typeOptions }) };
  });
}

/* a joint with nothing signed yet; Fabrication is pre-filled for the demo */
export function newWorkflow(job: Job): JobWorkflow {
  return {
    jobId: job.id,
    technician: job.technician,
    stages: buildStages(job),
    attachments: [],
    conditionCode: '',
    conditionCount: 0,
    history: [],
    fabricationData: seedFabricationData(job),
  };
}
