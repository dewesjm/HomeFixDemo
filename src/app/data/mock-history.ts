/* seeded mock activity for Work history, mirrors WorkflowService shapes */
import { JOBS, Job } from './jobs';
import { HistoryEntry, StageField, STAGE_TEMPLATES } from './workflow';
import { CONDITION_CODES } from './conditions';

export interface MockActivity {
  jobId: number;
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
  { name: 'Capacitor', part: 'CAP-440' },
  { name: 'Blower motor', part: 'BM-1175' },
  { name: 'Thermostat', part: 'TS-6P' },
  { name: 'Shutoff valve', part: 'SV-0.5' },
  { name: 'Circuit breaker', part: 'CB-20A' },
  { name: 'Flashing kit', part: 'FK-STD' },
  { name: 'Hinge set', part: 'HS-3.5' },
  { name: 'Gasket', part: 'GK-200' }
];

const FILES = [
  'before.jpg', 'after.jpg', 'invoice.pdf', 'permit.pdf', 'meter-reading.jpg',
  'warranty.pdf', 'site-photo.png', 'nameplate.jpg'
];

const NOTES = [
  'Customer notified of recommended follow-up.',
  'Parts on backorder; temporary fix applied.',
  'Work completed within the estimate.',
  'Recommended full replacement on next visit.',
  'Area cleared and tested before leaving site.'
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
  const stepAfter = (k: number) => (k + 1 < stages.length ? stages[k + 1].label : 'All stages complete');
  const push = (section: HistoryEntry['section'], action: string, step: string, from?: string, to?: string) => {
    t += (3 + Math.floor(rand() * 40)) * MIN;
    out.push({ jobId: job.id, entry: { when: new Date(t).toISOString(), who, section, action, from, to, step } });
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
    push('Sign-off', `${stage.label} — Signed off`, stepAfter(k), undefined, decision);
  }

  const restStep = stepAfter(signCount - 1);

  /* 2) work validation: component and/or condition code with count */
  if (rand() < 0.6) {
    const c = COMPONENTS[Math.floor(rand() * COMPONENTS.length)];
    const qty = 1 + Math.floor(rand() * 3);
    push('Work Validation', 'Component added', restStep, undefined, `${c.name} (×${qty}, P/N ${c.part})`);
  }
  if (rand() < 0.5) {
    const cc = CONDITION_CODES[Math.floor(rand() * CONDITION_CODES.length)];
    const count = 1 + Math.floor(rand() * 4);
    push('Work Validation', 'Condition code', restStep, '—', `${cc.code} (${cc.description})`);
    push('Work Validation', 'Number of conditions', restStep, '0', String(count));
  }
  if (rand() < 0.4) {
    push('Work Validation', 'Validation notes', restStep, '—', NOTES[Math.floor(rand() * NOTES.length)]);
  }

  /* 3) sometimes an attachment */
  if (rand() < 0.55) {
    push('Attachments', 'Attachment added', restStep, undefined, FILES[Math.floor(rand() * FILES.length)]);
  }

  return out;
}

/* seeded activity across a spread of jobs, newest near now */
export function generateMockActivity(jobCount = 28): MockActivity[] {
  const rand = seeded(7);
  const now = Date.now();
  /* stable pseudo-random job selection for variety */
  const chosen = JOBS.map(j => ({ j, key: rand() }))
    .sort((a, b) => a.key - b.key)
    .slice(0, jobCount)
    .map(x => x.j);
  return chosen.flatMap(j => activityForJob(j, rand, now));
}

export const MOCK_ACTIVITY: MockActivity[] = generateMockActivity();
