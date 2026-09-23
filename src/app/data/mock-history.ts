/* seeded mock activity for Work history, mirrors workflow.ts's HistoryEntry shape */
import { JOBS, Job } from './jobs';
import { stampWho } from './people';
import { HistoryEntry, StageField, WorkflowStage, buildStages, snapshotInputs, fieldsShown, seedFabricationData, fabricationSnapshot } from './workflow';

export interface MockActivity {
  jobId: string;
  entry: HistoryEntry;
}

/* deterministic PRNG like jobs.ts, identical every load */
function seeded(n: number) {
  let s = n * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const DAY = 24 * 60 * 60 * 1000;
const MIN = 60 * 1000;

const FILES = [
  'before.jpg', 'after.jpg', 'wps.pdf', 'permit.pdf', 'ndt-report.jpg',
  'weld-map.pdf', 'site-photo.png', 'nameplate.jpg'
];

const FREEFORM_NOTES = [
  'Weld completed per WPS requirements.',
  'NDT report attached — no indications found.',
  'Fit-up verified against drawing revision.',
  'Preheat temperature recorded before welding.',
  'Post-weld visual inspection passed.'
];

/* plausible recorded value for a stage field */
function fieldValue(f: StageField, rand: () => number): string {
  if (f.type === 'select' && f.options?.length) {
    return f.options[Math.floor(rand() * f.options.length)].value;
  }
  if (f.placeholder && f.placeholder.startsWith('e.g. ')) {
    return f.placeholder.slice(5);
  }
  if (f.type === 'number') {
    const n = 1 + Math.floor(rand() * 120);
    return f.unit ? `${n} ${f.unit}` : `${n}`;
  }
  if (f.key === 'comments' || f.key === 'notes') {
    return FREEFORM_NOTES[Math.floor(rand() * FREEFORM_NOTES.length)];
  }
  /* no plausible canned value for this field type — leave it blank rather than fabricate one */
  return '';
}

/* short believable activity sequence for one job */
function activityForJob(job: Job, rand: () => number, now: number): MockActivity[] {
  /* the job's real routing (buildStages), not the raw trade template — that still carries the
     old generic Prep/Handover stages (Customer walkthrough, etc.) that Welding never uses */
  const stages = buildStages(job);
  const who = job.technician;
  const out: MockActivity[] = [];

  /* anchor to a random moment in past ~45 days, then step forward */
  let t = now - Math.floor(rand() * 45) * DAY - Math.floor(rand() * 8) * 60 * MIN;
  const stageAfter = (k: number): WorkflowStage | undefined => stages[k + 1];
  /* fabrication data doesn't get its own history in the mock, so every sign-off for this job
     snapshots the same seeded values — matches the real app closely enough since fab fields change rarely */
  const fabInputs = job.trade === 'Welding' ? fabricationSnapshot(seedFabricationData(job)) : undefined;
  const push = (section: HistoryEntry['section'], action: string, routing: string, from?: string, to?: string, inputs?: HistoryEntry['inputs']) => {
    t += (3 + Math.floor(rand() * 40)) * MIN;
    out.push({ jobId: job.id, entry: { when: new Date(t).toISOString(), who, ...stampWho(who), section, action, from, to, routing, inputs, fabInputs: section === 'Sign-off' ? fabInputs : undefined } });
  };
  /* matches JointPageComponent.isNdtStage: Attachments only shows for NDT stages + Repair */
  const isNdtStageId = (id: string) => id.startsWith('root-ndt') || id.startsWith('layer-ndt') || id.startsWith('final-ndt') || id === 'repair';

  /* stages progressed through; some jobs fully signed, most a step or two in */
  const signCount = rand() < 0.3
    ? stages.length
    : 1 + Math.floor(rand() * Math.min(2, stages.length));

  /* 1) walk stages in order, signing each off with every editable field's value at that moment (some left blank) */
  let restStage: WorkflowStage | undefined = stages[0];
  for (let k = 0; k < signCount; k++) {
    const stage = stages[k];
    /* only rejectable stages get a SAT/UNSAT decision — matches the real signoff panel, which
       hides Decision (and auto-accepts) for stages without a rejectToStage */
    const isRejectable = !!stage.rejectToStage;
    const decision: 'sat' | 'unsat' | null = isRejectable ? (rand() < 0.85 ? 'sat' : 'unsat') : null;
    const inputs: Record<string, string> = {};
    /* Fit-Up Insp can't actually be signed off with any box unchecked (signBlockers() in
       joint-page.component.ts requires every checkbox = 'yes'), so don't fabricate a blank/'No' here */
    const forceChecked = stage.id === 'fitup-insp';
    for (const f of stage.fields) {
      if (forceChecked && f.type === 'checkbox') inputs[f.key] = 'yes';
      else inputs[f.key] = rand() < 0.85 ? fieldValue(f, rand) : '';
    }
    const signoffInputs: Record<string, string> = {};
    for (const f of stage.signoffFields) signoffInputs[f.key] = f.key === 'inspectorName' ? who : fieldValue(f, rand);
    const view: WorkflowStage = {
      ...stage, inputs, signoffInputs, result: decision,
      inspectionType: stage.routingOptions?.find(o => o.default)?.value ?? stage.routingOptions?.[0]?.value ?? '',
    };
    /* routing = the stage this action was for, not what it moved to afterward */
    push('Sign-off', `${stage.label} — Signed off`, stage.label, undefined, decision ? decision.toUpperCase() : '',
      snapshotInputs(view, fieldsShown(view), stage.signoffFields));

    if (decision === 'unsat') {
      /* an UNSAT rejects work back to an earlier stage rather than advancing — stop here
         rather than pretending later stages were reached without a resign cycle */
      restStage = stages.find(s => s.id === stage.rejectToStage) ?? stage;
      break;
    }
    restStage = stageAfter(k);
  }
  const restRouting = restStage?.label ?? 'All stages complete';

  /* 2) sometimes an attachment — only on the NDT/Repair stages that actually show Attachments */
  if (restStage && isNdtStageId(restStage.id) && rand() < 0.55) {
    push('Attachments', 'Attachment added', restRouting, undefined, FILES[Math.floor(rand() * FILES.length)]);
  }

  return out;
}

/* seeded activity for all jobs */
export function generateMockActivity(): MockActivity[] {
  const rand = seeded(7);
  const now = Date.now();
  return JOBS.flatMap(j => activityForJob(j, rand, now));
}

export const MOCK_ACTIVITY: MockActivity[] = generateMockActivity();
