/* seeded mock activity for Work history, mirrors WorkflowService shapes */
import { JOBS, Job } from './jobs';
import { stampWho } from './people';
import { HistoryEntry, StageField, WorkflowStage, buildStages, snapshotInputs, fieldsShown } from './workflow';

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
  return 'recorded';
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
  const routingAfter = (k: number) => (k + 1 < stages.length ? stages[k + 1].label : 'All stages complete');
  const push = (section: HistoryEntry['section'], action: string, routing: string, from?: string, to?: string, inputs?: HistoryEntry['inputs']) => {
    t += (3 + Math.floor(rand() * 40)) * MIN;
    out.push({ jobId: job.id, entry: { when: new Date(t).toISOString(), who, ...stampWho(who), section, action, from, to, routing, inputs } });
  };

  /* stages progressed through; some jobs fully signed, most a step or two in */
  const signCount = rand() < 0.3
    ? stages.length
    : 1 + Math.floor(rand() * Math.min(2, stages.length));

  /* 1) walk stages in order, signing each off with every editable field's value at that moment (some left blank) */
  for (let k = 0; k < signCount; k++) {
    const stage = stages[k];
    /* matches WorkflowService.signStage: result is 'sat'/'unsat', recorded uppercase */
    const decision = rand() < 0.85 ? 'sat' : 'unsat';
    const inputs: Record<string, string> = {};
    for (const f of stage.fields) inputs[f.key] = rand() < 0.85 ? fieldValue(f, rand) : '';
    const signoffInputs: Record<string, string> = {};
    for (const f of stage.signoffFields) signoffInputs[f.key] = f.key === 'inspectorName' ? who : fieldValue(f, rand);
    const view: WorkflowStage = {
      ...stage, inputs, signoffInputs, result: decision,
      inspectionType: stage.routingOptions?.find(o => o.default)?.value ?? stage.routingOptions?.[0]?.value ?? '',
    };
    push('Sign-off', `${stage.label} — Signed off`, routingAfter(k), undefined, decision.toUpperCase(),
      snapshotInputs(view, fieldsShown(view), stage.signoffFields));
  }

  const restRouting = routingAfter(signCount - 1);

  /* 2) sometimes an attachment */
  if (rand() < 0.55) {
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
