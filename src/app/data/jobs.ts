// Mock data — the Job model plus a seeded generator that produces 120 sample
// repair/inspection jobs (incl. a stable 5-char jobNumber). Stands in for a backend;
// lives in memory. Also exports STATUS_OPTIONS + statusLabel() for value→label display.
import { CHARACTERISTIC_CODES } from './characteristics';

export interface Job {
  id: number;
  jobNumber: string;   // 5-char human-friendly code, e.g. "K7P2M"
  title: string;
  trade: 'Plumbing' | 'Electrical' | 'HVAC' | 'Roofing' | 'Carpentry' | 'Inspection';
  technician: string;
  make: string;              // equipment manufacturer
  model: string;             // equipment model / part designation
  code1: string;             // characteristic codes — special designations (see characteristics.ts)
  code2: string;
  code3: string;
  estimatedCost: number;
  inspectionScore: number;   // 0–5 quality / condition score
  estimatedHours: number;    // labor hours
  status: 'completed' | 'in-progress' | 'overdue';
  scheduledFor: Date;
  tags: string[];
}

const TECHNICIANS = ['Mike R.', 'Sara L.', 'Tom B.', 'Dave K.', 'Priya N.', 'Luis G.', 'Emma W.'];
const TRADES: Job['trade'][] = ['Plumbing', 'Electrical', 'HVAC', 'Roofing', 'Carpentry', 'Inspection'];
const TAG_POOL = ['urgent', 'warranty', 'follow-up', 'permit-required', 'safety', 'recurring', 'customer-supplied', 'emergency'];

// Made-up but trade-appropriate equipment make/model pairs.
const EQUIPMENT_BY_TRADE: Record<Job['trade'], { make: string; model: string }[]> = {
  Plumbing:   [{ make: 'Rheem', model: 'Performance 50' }, { make: 'A.O. Smith', model: 'Signature 40' }, { make: 'Kohler', model: 'Cimarron' }, { make: 'Moen', model: '1255 Duralast' }],
  Electrical: [{ make: 'Square D', model: 'QO140M200' }, { make: 'Eaton', model: 'BR2040B200' }, { make: 'Siemens', model: 'P4080B1200' }, { make: 'Leviton', model: 'GFTR1-W' }],
  HVAC:       [{ make: 'Carrier', model: '59TP6' }, { make: 'Trane', model: 'XR16' }, { make: 'Lennox', model: 'EL296V' }, { make: 'Goodman', model: 'GMVC96' }],
  Roofing:    [{ make: 'GAF', model: 'Timberline HDZ' }, { make: 'Owens Corning', model: 'Duration' }, { make: 'CertainTeed', model: 'Landmark Pro' }, { make: 'Malarkey', model: 'Highlander' }],
  Carpentry:  [{ make: 'Simpson Strong-Tie', model: 'LUS28' }, { make: 'Kreg', model: 'K5' }, { make: 'Andersen', model: '400 Series' }, { make: 'Pella', model: 'Lifestyle' }],
  Inspection: [{ make: 'Honeywell', model: 'T6 Pro' }, { make: 'Generac', model: 'Guardian 24kW' }, { make: 'Kidde', model: 'P4010ACSCO' }, { make: 'First Alert', model: 'SC9120B' }]
};

const TITLES_BY_TRADE: Record<Job['trade'], string[]> = {
  Plumbing:   ['Leaking faucet repair', 'Water heater replacement', 'Clogged drain clearing', 'Pipe leak inspection', 'Toilet reseal', 'Sump pump service'],
  Electrical: ['Panel upgrade', 'Outlet replacement', 'Lighting install', 'Wiring inspection', 'GFCI installation', 'Ceiling fan mount'],
  HVAC:       ['Furnace tune-up', 'AC recharge', 'Thermostat install', 'Duct cleaning', 'Filter replacement', 'Heat pump service'],
  Roofing:    ['Shingle repair', 'Gutter cleaning', 'Leak patch', 'Flashing replacement', 'Roof inspection', 'Skylight reseal'],
  Carpentry:  ['Door reframe', 'Deck board repair', 'Cabinet install', 'Trim replacement', 'Window sill repair', 'Shelving build'],
  Inspection: ['Annual safety inspection', 'Pre-sale inspection', 'Mold assessment', 'Foundation check', 'Radon test', 'Code compliance review']
};

function seeded(n: number) {
  let s = n * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Stable, random-looking 5-char job code (no ambiguous I/O/0/1). Derived from the id
// via its own seeded stream so it doesn't perturb the rest of the generated data.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeJobNumber(seed: number): string {
  const rand = seeded(seed * 31 + 7);
  let code = '';
  for (let k = 0; k < 5; k++) code += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)];
  return code;
}

// Up to three distinct characteristic codes per job, drawn from a separate seeded
// stream (keyed off the id) so adding them doesn't perturb the rest of the data.
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
    const trade = TRADES[Math.floor(rand() * TRADES.length)];
    const titlePool = TITLES_BY_TRADE[trade];
    const title = titlePool[Math.floor(rand() * titlePool.length)];
    const technician = TECHNICIANS[Math.floor(rand() * TECHNICIANS.length)];
    const equipment = EQUIPMENT_BY_TRADE[trade][Math.floor(rand() * EQUIPMENT_BY_TRADE[trade].length)];
    const estimatedCost = Math.round((75 + rand() * 1925) * 100) / 100;
    const estimatedHours = Math.round((0.5 + rand() * 39.5) * 10) / 10;
    const inspectionScore = Math.round(rand() * 50) / 10;

    const roll = rand();
    const status: Job['status'] =
      roll < 0.5 ? 'completed' : roll < 0.82 ? 'in-progress' : 'overdue';

    // schedule spread from ~6 months ago to ~6 months ahead
    const dayOffset = Math.floor(rand() * 360) - 180;
    const scheduledFor = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);

    const tagCount = 1 + Math.floor(rand() * 3);
    const tags: string[] = [];
    while (tags.length < tagCount) {
      const t = TAG_POOL[Math.floor(rand() * TAG_POOL.length)];
      if (!tags.includes(t)) tags.push(t);
    }

    const [code1, code2, code3] = pickCodes(i + 1);

    out.push({
      id: i + 1,
      jobNumber: makeJobNumber(i + 1),
      title,
      trade,
      technician,
      make: equipment.make,
      model: equipment.model,
      code1,
      code2,
      code3,
      estimatedCost,
      inspectionScore,
      estimatedHours,
      status,
      scheduledFor,
      tags
    });
  }
  return out;
}

export const JOBS: Job[] = generateJobs();
export const TRADE_OPTIONS = TRADES.map(t => ({ label: t, value: t }));
export const TECHNICIAN_OPTIONS = TECHNICIANS.map(t => ({ label: t, value: t }));
export const STATUS_OPTIONS: { label: string; value: Job['status'] }[] = [
  { label: 'Completed', value: 'completed' },
  { label: 'In progress', value: 'in-progress' },
  { label: 'Overdue', value: 'overdue' }
];
export const TAG_OPTIONS = TAG_POOL.map(t => ({ label: t, value: t }));

/** Human-friendly label for a status value (e.g. 'in-progress' → 'In progress'). */
export function statusLabel(s: Job['status']): string {
  return STATUS_OPTIONS.find(o => o.value === s)?.label ?? s;
}
