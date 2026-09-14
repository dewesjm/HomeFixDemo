/* mock Job model + seeded generator, stands in for a backend */
import { CHARACTERISTIC_CODES } from './characteristics';

export interface Job {
  id: number;
  jobNumber: string;   /* 5-char code: letter + 4 digits, e.g. K7234 */
  title: string;
  trade: string;  /* dynamic — admin can add new trades */
  technician: string;
  drawing: string;           /* drawing number */
  drawingRev: string;        /* drawing revision */
  joint: string;             /* joint reference */
  jointDesign: string;       /* e.g. Butt, Fillet, Lap */
  weldType: string;          /* e.g. SMAW, GMAW, GTAW, FCAW */
  pipeSize: string;          /* pipe size */
  wallThickness: string;     /* wall thickness */
  materialType1: string;     /* base material 1 */
  materialType2: string;     /* base material 2 / filler */
  mcl1: string;              /* MCL 1 */
  mcl2: string;              /* MCL 2 */
  joiningItem: string;       /* joining item */
  joinToItem: string;        /* join to item */
  sequenceNumber: string;    /* sequence # */
  engineeringNotes: string;  /* engineering notes */
  wps: string;               /* Welding Procedure Specification */
  ndt: string;               /* Non-Destructive Examination requirement */
  pwht: string;              /* Post Weld Heat Treatment */
  nInd: string;              /* N Ind.: 1, 2, or 3 */
  /* NDT data */
  rtRoot: string;
  rtFinal: string;
  ndtRoot: string;
  ndtEach: string;
  ndtFinal: string;
  ut: string;
  /* additional data (show more) */
  order: string;
  workPackage: string;
  workPermit: string;
  waff: string;
  serialNumber: string;
  refitNumber: string;
  repairNumber: string;
  ss: string;
  sfff: string;
  dssAaa: string;
  er1: string;
  er2: string;
  er3: string;
  er4: string;
  attributeCode1: string;
  attributeCode2: string;
  attributeCode3: string;
  attributeCode4: string;
  estimatedCost: number;
  estimatedHours: number;    /* labor hours */
  scheduledFor: Date;
  _fresh?: boolean;  /* skip seeded mid-stream stages, start at beginning */
}

const TECHNICIANS = ['Mike R.', 'Sara L.', 'Tom B.', 'Dave K.', 'Priya N.', 'Luis G.', 'Emma W.'];
const TRADES: Job['trade'][] = ['Welding', 'Plumbing', 'Electrical', 'HVAC', 'Roofing', 'Carpentry', 'Inspection'];

/* welding-specific seed pools */
const DRAWINGS = ['DWG-101', 'DWG-202', 'DWG-303', 'DWG-404', 'DWG-505', 'P&ID-01', 'P&ID-02', 'ISO-100', 'ISO-200'];
const DRAWING_REVS = ['A', 'B', 'C', 'D', 'E', 'A-2', 'B-1'];
const JOINTS = ['J-001', 'J-002', 'J-003', 'J-004', 'J-005', 'J-006', 'J-007', 'J-008'];
const JOINT_DESIGNS = ['BJ-G', 'BJ-S', 'FJ-G', 'FJ-S', 'LJ-G', 'LJ-S', 'CJ-G', 'CJ-S', 'EJ-G', 'EJ-S', 'TJ-G', 'TJ-S'];
const WELD_TYPES = ['Butt', 'Fillet', 'Lap', 'Corner', 'Edge', 'T-joint'];
const PIPE_SIZES = ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"', '4"', '6"', '8"', '10"', '12"', '14"', '16"'];
const WALL_THICKNESSES = ['0.065"', '0.083"', '0.109"', '0.120"', '0.134"', '0.154"', '0.188"', '0.219"', '0.250"', '0.280"', '0.322"', '0.375"'];
const MATERIALS_1 = ['Carbon Steel', 'Stainless Steel 304', 'Stainless Steel 316', 'Alloy Steel', 'Cast Iron', 'Titanium', 'Aluminum', 'Copper Nickel', 'Inconel', 'Duplex Stainless'];
const MATERIALS_2 = ['E6010', 'E7018', 'ER70S-6', '308L SS', '316L SS', 'ER80S-D2', 'ENiCrMo-3', 'ER5356', 'ERCuSi-A', 'ERNiCr-3'];
const MCL_POOL = ['MCL-100', 'MCL-200', 'MCL-300', 'MCL-400', 'MCL-500'];
const JOINING_ITEMS = ['Spool A', 'Spool B', 'Pipe Section 1', 'Pipe Section 2', 'Elbow 90', 'Tee', 'Reducer', 'Flange'];
const WPS_POOL = ['WPS-001', 'WPS-002', 'WPS-003', 'WPS-004', 'WPS-005', 'WPS-006'];
const NDT_POOL = ['Visual only', 'VT + UT', 'VT + RT', 'VT + MT', 'VT + PT', 'VT + 5X', 'VT + UT + RT', 'VT + MT + 5X', 'UT + RT + 5X', 'PT + 5X'];
const PWHT_POOL = ['None', 'Required — 600°C/2hr', 'Required — 620°C/1hr', 'Pending review'];
const N_IND_POOL = ['1', '2', '3'];
const NDT_RESULTS = ['SAT', 'UNSAT', 'N/A', ''];
const WORK_PACKAGES = ['WP-001', 'WP-002', 'WP-003', 'WP-004', 'WP-005'];
const ATTR_CODES = ['AT-100', 'AT-200', 'AT-300', 'AT-400', 'AT-500', 'AT-600', 'AT-700', 'AT-800'];

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

/* stable 5-char code from id: random alphanumeric jumble */
const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeJobNumber(seed: number): string {
  const rand = seeded(seed * 31 + 7);
  let code = '';
  for (let j = 0; j < 5; j++) {
    code += ID_CHARS[Math.floor(rand() * ID_CHARS.length)];
  }
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

export function generateJobs(count = 240): Job[] {
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

    const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

    out.push({
      id: i + 1,
      jobNumber: makeJobNumber(i + 1),
      title,
      trade,
      technician,
      drawing: pick(DRAWINGS),
      drawingRev: pick(DRAWING_REVS),
      joint: pick(JOINTS),
      jointDesign: pick(JOINT_DESIGNS),
      weldType: pick(WELD_TYPES),
      pipeSize: pick(PIPE_SIZES),
      wallThickness: pick(WALL_THICKNESSES),
      materialType1: pick(MATERIALS_1),
      materialType2: pick(MATERIALS_2),
      mcl1: pick(MCL_POOL),
      mcl2: pick(MCL_POOL),
      joiningItem: pick(JOINING_ITEMS),
      joinToItem: pick(JOINING_ITEMS),
      sequenceNumber: '1',
      engineeringNotes: i % 3 === 0 ? 'Standard weld procedure per WPS' : '',
      wps: pick(WPS_POOL),
      ndt: pick(NDT_POOL),
      pwht: pick(PWHT_POOL),
      nInd: pick(N_IND_POOL),
      rtRoot: pick(NDT_RESULTS),
      rtFinal: pick(NDT_RESULTS),
      ndtRoot: pick(NDT_RESULTS),
      ndtEach: pick(NDT_RESULTS),
      ndtFinal: pick(NDT_RESULTS),
      ut: pick(NDT_RESULTS),
      order: `ORD-${10000 + i}`,
      workPackage: pick(WORK_PACKAGES),
      workPermit: i % 4 === 0 ? `WP-${2000 + i}` : '',
      waff: i % 5 === 0 ? 'Required' : '',
      serialNumber: `SN-${30000 + i}`,
      refitNumber: '00',
      repairNumber: '00',
      ss: i % 8 === 0 ? 'Yes' : '',
      sfff: i % 9 === 0 ? 'Yes' : '',
      dssAaa: i % 10 === 0 ? 'DSS-AAA' : '',
      er1: i % 3 === 0 ? `ER-${6000 + i}` : '',
      er2: i % 4 === 0 ? `ER-${7000 + i}` : '',
      er3: i % 5 === 0 ? `ER-${8000 + i}` : '',
      er4: i % 6 === 0 ? `ER-${9000 + i}` : '',
      attributeCode1: pick(ATTR_CODES),
      attributeCode2: i % 2 === 0 ? pick(ATTR_CODES) : '',
      attributeCode3: i % 3 === 0 ? pick(ATTR_CODES) : '',
      attributeCode4: i % 4 === 0 ? pick(ATTR_CODES) : '',
      estimatedCost,
      estimatedHours,
      scheduledFor
    });
  }
  return out;
}

export const JOBS: Job[] = generateJobs();
export const TECHNICIAN_OPTIONS = TECHNICIANS.map(t => ({ label: t, value: t }));

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
    drawing: '',
    drawingRev: '',
    joint: '',
    jointDesign: '',
    weldType: '',
    pipeSize: '',
    wallThickness: '',
    materialType1: '',
    materialType2: '',
    mcl1: '',
    mcl2: '',
    joiningItem: '',
    joinToItem: '',
    sequenceNumber: '',
    engineeringNotes: '',
    wps: '',
    ndt: '',
    pwht: '',
    nInd: '1',
    rtRoot: '',
    rtFinal: '',
    ndtRoot: '',
    ndtEach: '',
    ndtFinal: '',
    ut: '',
    order: '',
    workPackage: '',
    workPermit: '',
    waff: '',
    serialNumber: '',
    refitNumber: '',
    repairNumber: '',
    ss: '',
    sfff: '',
    dssAaa: '',
    er1: '',
    er2: '',
    er3: '',
    er4: '',
    attributeCode1: '',
    attributeCode2: '',
    attributeCode3: '',
    attributeCode4: '',
    estimatedCost: 0,
    estimatedHours: 0,
    scheduledFor: new Date(),
    _fresh: true,
  };
  JOBS.push(job);
  return job;
}
