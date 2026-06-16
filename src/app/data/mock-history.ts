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

const dash = (v: string) => (v && v.length ? `“${v}”` : '—');

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
  const push = (section: HistoryEntry['section'], change: string, step: string) => {
    t += (3 + Math.floor(rand() * 40)) * MIN;
    out.push({ jobId: job.id, entry: { when: new Date(t).toISOString(), who, section, change, step } });
  };

  /* stages progressed through, completed jobs fully signed */
  const signCount = job.status === 'completed'
    ? stages.length
    : 1 + Math.floor(rand() * Math.min(2, stages.length));

  /* 1) walk stages in order, record reading then sign off */
  for (let k = 0; k < signCount; k++) {
    const stage = stages[k];
    if (stage.fields.length && rand() < 0.85) {
      const f = stage.fields[0];
      push('Stages', `Stage “${stage.label}” — ${f.label}: — → ${dash(fieldValue(f, rand))}`, stage.label);
    }
    const decision = rand() < 0.85 ? 'ACCEPT' : 'REJECT';
    push('Sign-off', `Stage “${stage.label}” signed — ${decision} by ${who}`, stepAfter(k));
  }

  const restStep = stepAfter(signCount - 1);

  /* 2) work validation: component and/or condition code with count */
  if (rand() < 0.6) {
    const c = COMPONENTS[Math.floor(rand() * COMPONENTS.length)];
    const qty = 1 + Math.floor(rand() * 3);
    push('Work Validation', `Added component: ${c.name} (×${qty}, P/N ${c.part})`, restStep);
  }
  if (rand() < 0.5) {
    const cc = CONDITION_CODES[Math.floor(rand() * CONDITION_CODES.length)];
    const count = 1 + Math.floor(rand() * 4);
    push('Work Validation', `Condition code: — → ${cc.code} (${cc.description})`, restStep);
    push('Work Validation', `Number of conditions: 0 → ${count}`, restStep);
  }
  if (rand() < 0.4) {
    push('Work Validation', `Validation notes: — → ${dash(NOTES[Math.floor(rand() * NOTES.length)])}`, restStep);
  }

  /* 3) sometimes an attachment */
  if (rand() < 0.55) {
    push('Attachments', `Attachment added: ${FILES[Math.floor(rand() * FILES.length)]}`, restStep);
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
