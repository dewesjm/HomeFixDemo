/* seeded mock activity for Work history, mirrors WorkflowService shapes */
import { JOBS, Job } from './jobs';
import { HistoryEntry, StageField, STAGE_TEMPLATES } from './workflow';

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

const COMPONENTS = [
  { name: 'Welding rod', part: 'E7018-3/32' },
  { name: 'TIG filler wire', part: 'ER70S-6-1/16' },
  { name: 'Backing ring', part: 'BR-ST-200' },
  { name: 'Consumable insert', part: 'CI-316L' },
  { name: 'Nozzle tip', part: 'NT-12AG' },
  { name: 'Gas lens collet', part: 'GLC-3/32' },
  { name: 'Clamp strap', part: 'CS-200' },
  { name: 'Gasket set', part: 'GKS-316' }
];

const FILES = [
  'before.jpg', 'after.jpg', 'wps.pdf', 'permit.pdf', 'ndt-report.jpg',
  'weld-map.pdf', 'site-photo.png', 'nameplate.jpg'
];

const NOTES = [
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
  return 'recorded';
}

/* short believable activity sequence for one job */
function activityForJob(job: Job, rand: () => number, now: number): MockActivity[] {
  const stages = STAGE_TEMPLATES[job.trade];
  const who = job.technician;
  const out: MockActivity[] = [];

  /* anchor to a random moment in past ~45 days, then step forward */
  let t = now - Math.floor(rand() * 45) * DAY - Math.floor(rand() * 8) * 60 * MIN;
  const routingAfter = (k: number) => (k + 1 < stages.length ? stages[k + 1].label : 'All stages complete');
  const push = (section: HistoryEntry['section'], action: string, routing: string, from?: string, to?: string) => {
    t += (3 + Math.floor(rand() * 40)) * MIN;
    out.push({ jobId: job.id, entry: { when: new Date(t).toISOString(), who, section, action, from, to, routing } });
  };

  /* stages progressed through; some jobs fully signed, most a step or two in */
  const signCount = rand() < 0.3
    ? stages.length
    : 1 + Math.floor(rand() * Math.min(2, stages.length));

  /* 1) walk stages in order, record reading then sign off */
  for (let k = 0; k < signCount; k++) {
    const stage = stages[k];
    if (stage.fields.length && rand() < 0.85) {
      const f = stage.fields[0];
      push('Stages', `${stage.label} — ${f.label}`, stage.label, '—', fieldValue(f, rand));
    }
    const decision = rand() < 0.85 ? 'ACCEPT' : 'REJECT';
    push('Sign-off', `${stage.label} — Signed off`, routingAfter(k), undefined, decision);
  }

  const restRouting = routingAfter(signCount - 1);

  /* 2) work validation: component and/or condition code with count */
  if (rand() < 0.6) {
    const c = COMPONENTS[Math.floor(rand() * COMPONENTS.length)];
    const qty = 1 + Math.floor(rand() * 3);
    push('Work Validation', 'Component added', restRouting, undefined, `${c.name} (×${qty}, P/N ${c.part})`);
  }
  if (rand() < 0.4) {
    push('Work Validation', 'Validation notes', restRouting, '—', NOTES[Math.floor(rand() * NOTES.length)]);
  }

  /* 3) sometimes an attachment */
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
