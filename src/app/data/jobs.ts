/* mock Job model + seeded generator, stands in for a backend */
import { CHARACTERISTIC_CODES } from './characteristics';

export interface Job {
  id: number;
  jobNumber: string;   /* 5-char code, e.g. K7P2M */
  title: string;
  trade: string;  /* dynamic — admin can add new trades */
  technician: string;
  drawingAndJoint: string;   /* drawing number / joint reference */
  jointDesign: string;       /* e.g. Butt, Fillet, Lap */
  weldType: string;          /* e.g. SMAW, GMAW, GTAW, FCAW */
  materialType1: string;     /* base material 1 */
  materialType2: string;     /* base material 2 / filler */
  wps: string;               /* Welding Procedure Specification */
  nde: string;               /* Non-Destructive Examination requirement */
  pwht: string;              /* Post Weld Heat Treatment */
  estimatedCost: number;
  estimatedHours: number;    /* labor hours */
  scheduledFor: Date;
  tags: string[];
  _fresh?: boolean;  /* skip seeded mid-stream stages, start at beginning */
}

const TECHNICIANS = ['Mike R.', 'Sara L.', 'Tom B.', 'Dave K.', 'Priya N.', 'Luis G.', 'Emma W.'];
const TRADES: Job['trade'][] = ['Welding', 'Plumbing', 'Electrical', 'HVAC', 'Roofing', 'Carpentry', 'Inspection'];
const TAG_POOL = ['Urgent', 'Warranty', 'Follow-up', 'Permit required', 'Safety', 'Recurring', 'Customer supplied', 'Emergency'];

/* welding-specific seed pools */
const DRAWINGS = ['DWG-101', 'DWG-202', 'DWG-303', 'DWG-404', 'DWG-505', 'P&ID-01', 'P&ID-02', 'ISO-100', 'ISO-200'];
const JOINT_DESIGNS = ['Butt', 'Fillet', 'Lap', 'Corner', 'Edge', 'T-joint'];
const WELD_TYPES = ['SMAW', 'GMAW', 'GTAW', 'FCAW', 'SAW', 'PAW'];
const MATERIALS_1 = ['A36 Carbon Steel', '304 Stainless', '316 Stainless', 'A516 Gr.70', 'A106 Gr.B', 'API 5L X52'];
const MATERIALS_2 = ['E7018', 'ER70S-6', '308L SS', '316L SS', 'ER80S-D2', 'ENiCrMo-3'];
const WPS_POOL = ['WPS-001', 'WPS-002', 'WPS-003', 'WPS-004', 'WPS-005', 'WPS-006'];
const NDE_POOL = ['Visual only', 'VT + UT', 'VT + RT', 'VT + MT', 'VT + PT', 'VT + UT + RT'];
const PWHT_POOL = ['None', 'Required — 600°C/2hr', 'Required — 620°C/1hr', 'Pending review'];

const TITLES_BY_TRADE: Record<Job['trade'], string[]> = {
  Plumbing:   ['Leaking faucet repair', 'Water heater replacement', 'Clogged drain clearing', 'Pipe leak inspection', 'Toilet reseal', 'Sump pump service'],
  Electrical: ['Panel upgrade', 'Outlet replacement', 'Lighting install', 'Wiring inspection', 'GFCI installation', 'Ceiling fan mount'],
  HVAC:       ['Furnace tune-up', 'AC recharge', 'Thermostat install', 'Duct cleaning', 'Filter replacement', 'Heat pump service'],
  Roofing:    ['Shingle repair', 'Gutter cleaning', 'Leak patch', 'Flashing replacement', 'Roof inspection', 'Skylight reseal'],
  Carpentry:  ['Door reframe', 'Deck board repair', 'Cabinet install', 'Trim replacement', 'Window sill repair', 'Shelving build'],
  Inspection: ['Annual safety inspection', 'Pre-sale inspection', 'Mold assessment', 'Foundation check', 'Radon test', 'Code compliance review'],
  Welding:    ['Pipe weld inspection', 'Structural steel weld', 'Tank repair weld', 'Handrail fabrication', 'Flange weld repair', 'Support bracket weld']
};

function seeded(n: number) {
  let s = n * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/* stable 5-char code from id, no ambiguous I/O/0/1, own seed stream */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeJobNumber(seed: number): string {
  const rand = seeded(seed * 31 + 7);
  let code = '';
  for (let k = 0; k < 5; k++) code += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)];
  return code;
}

/* up to 3 distinct codes per job, own seed stream keyed off id */
function pickCodes(seed: number): [string, string, string] {
  const rand = seeded(seed * 17 + 3);
  const pool = CHARACTERISTIC_CODES.map(c => c.code);
  const count = 1 + Math.floor(rand() * 3);
  const chosen: string[] = [];
  while (chosen.length < count) {
    const c = pool[Math.floor(rand() * pool.length)];
    if (!chosen.includes(c)) chosen.push(c);
  }
  return [chosen[0] ?? '', chosen[1] ?? '', chosen[2] ?? ''];
}

export function generateJobs(count = 120): Job[] {
  const rand = seeded(42);
  const out: Job[] = [];
  for (let i = 0; i < count; i++) {
    const trade = 'Welding';
    const titlePool = TITLES_BY_TRADE[trade];
    const title = titlePool[Math.floor(rand() * titlePool.length)];
    const technician = TECHNICIANS[Math.floor(rand() * TECHNICIANS.length)];
    const estimatedCost = Math.round((75 + rand() * 1925) * 100) / 100;
    const estimatedHours = Math.round((0.5 + rand() * 39.5) * 10) / 10;

    // schedule spread from ~6 months ago to ~6 months ahead
    const dayOffset = Math.floor(rand() * 360) - 180;
    const scheduledFor = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);

    const tagCount = 1 + Math.floor(rand() * 3);
    const tags: string[] = [];
    while (tags.length < tagCount) {
      const t = TAG_POOL[Math.floor(rand() * TAG_POOL.length)];
      if (!tags.includes(t)) tags.push(t);
    }

    const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

    out.push({
      id: i + 1,
      jobNumber: makeJobNumber(i + 1),
      title,
      trade,
      technician,
      drawingAndJoint: pick(DRAWINGS),
      jointDesign: pick(JOINT_DESIGNS),
      weldType: pick(WELD_TYPES),
      materialType1: pick(MATERIALS_1),
      materialType2: pick(MATERIALS_2),
      wps: pick(WPS_POOL),
      nde: pick(NDE_POOL),
      pwht: pick(PWHT_POOL),
      estimatedCost,
      estimatedHours,
      scheduledFor,
      tags
    });
  }
  return out;
}

export const JOBS: Job[] = generateJobs();
export const TECHNICIAN_OPTIONS = TECHNICIANS.map(t => ({ label: t, value: t }));
export const TAG_OPTIONS = TAG_POOL.map(t => ({ label: t, value: t }));

/* static fallback for initial load; components should prefer getTradeOptions() from workflow.ts */
export const TRADE_OPTIONS = TRADES.map(t => ({ label: t, value: t }));

/* add a test job for a given trade (for testing admin-added trades) */
let _nextCustomId = 10_000;
export function addTestJob(trade: string): Job {
  const id = _nextCustomId++;
  const job: Job = {
    id,
    jobNumber: makeJobNumber(id),
    title: `${trade} test job`,
    trade,
    technician: TECHNICIANS[id % TECHNICIANS.length],
    drawingAndJoint: '',
    jointDesign: '',
    weldType: '',
    materialType1: '',
    materialType2: '',
    wps: '',
    nde: '',
    pwht: '',
    estimatedCost: 0,
    estimatedHours: 0,
    scheduledFor: new Date(),
    tags: [],
    _fresh: true,
  };
  JOBS.push(job);
  return job;
}
