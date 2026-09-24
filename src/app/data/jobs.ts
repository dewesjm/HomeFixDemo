/* mock Job model + seeded generator, stands in for a backend */
import { TECHNICIAN_NAMES } from './people';
import { CHARACTERISTIC_CODES } from './characteristics';

export interface Job {
  id: string;          /* internal key, always present — never shown; the real (sometimes-missing) source
                           identifier users see is xrefid, below */
  xrefid: string;       /* XREFID as captured from the source system; blank ~25% of the time, same
                           imperfect-data pattern as My Assignments and Weld Planning. When blank,
                           serialNumber is blank too, since neither was captured for that record. */
  ship: string;         /* 3-digit ship number, e.g. '692'; stable per hull, same idea as hull below */
  hull: string;        /* letter + 4 digits, e.g. K7234; not unique, many jobs share a hull */
  trade: string;  /* dynamic — admin can add new trades */
  technician: string;
  drawing: string;           /* drawing number */
  drawingRev: string;        /* drawing revision */
  joint: string;             /* joint reference */
  jointDesign: string;       /* e.g. Butt, Fillet, Lap */
  weldType: string;          /* one of WELD_TYPES, e.g. Butt, Fillet, Socket */
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
  nInd: string;              /* Nuclear Indicator: 1, 2, or 3 */
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


/* welding-specific seed pools */
/* letter + 7 digits, e.g. H7111234 */
const DRAWINGS = ['H7111234', 'H7111235', 'S7204518', 'S7204519', 'H7315002', 'S7315003', 'H7422871', 'S7530116', 'H7530117'];
const DRAWING_REVS = ['A', 'B', 'C', 'D', 'E', 'A-2', 'B-1'];
/* joint = system-joint, e.g. ST-10005. Not unique in real data, but for the demo each joint number
   only repeats a couple of times (1-3 records each) instead of 8 numbers shared by every record, so
   searching one joint number turns up a short list. Exported so Weld Planning's seed uses the same. */
const JOINT_SYSTEMS = ['ST', 'SW', 'FW', 'FO', 'LO', 'HV'];
export function jointNumbers(count: number, seed: number): string[] {
  const rand = seeded(seed);
  const out: string[] = [];
  for (let n = 0; out.length < count; n++) {
    const joint = `${JOINT_SYSTEMS[Math.floor(rand() * JOINT_SYSTEMS.length)]}-${10001 + n * 7}`;
    const copies = 1 + Math.floor(rand() * 3);
    for (let c = 0; c < copies && out.length < count; c++) out.push(joint);
  }
  /* shuffle so a joint's copies don't sit next to each other */
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
const JOINT_DESIGNS = ['BJ-G', 'BJ-S', 'FJ-G', 'FJ-S', 'LJ-G', 'LJ-S', 'CJ-G', 'CJ-S', 'EJ-G', 'EJ-S', 'TJ-G', 'TJ-S'];
export const WELD_TYPES = ['Attachment', 'Butt', 'Build-up', 'Fillet', 'Seal', 'Transition', 'Overlay', 'Boss', 'Socket'];
const PIPE_SIZES = ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"', '4"', '6"', '8"', '10"', '12"', '14"', '16"'];
const WALL_THICKNESSES = ['0.065"', '0.083"', '0.109"', '0.120"', '0.134"', '0.154"', '0.188"', '0.219"', '0.250"', '0.280"', '0.322"', '0.375"'];
/* Base metal (Material Type 1) and filler metal (Material Type 2) codes, redesigned 2026-09-23 as
   one coherent internal numbering scheme (not real AISI/AWS designations) -- NN-LETTERS, where NN
   groups by family and the letters stay recognizable (real alloy chemistry/grade abbreviations,
   e.g. CUNI for copper-nickel, SS304 for stainless 304) rather than reusing raw industry codes
   verbatim. The two lists share the same family-block numbering (1x = stainless, 6x = nonferrous)
   so a base metal and its typical filler read as part of one system. Replaces the earlier mixed
   bag (some invented to match the user's own 02CS/30-CUNI/AL-1010, the rest ad hoc; Material Type 2
   was real AWS electrode classifications, inconsistent with Material Type 1's own style). */
/* exported so Weld Engineering's procedures data (baseMetal1Type/baseMetal2Type) can use the same
   vocabulary -- a GWP's base metal pair is matched against a job's Material Type 1/2 to filter the
   GWP droplist (see procedures.ts gwpOptionsForMaterials, joint-page.component.ts). */
export const MATERIALS_1 = ['02-CS', '04-AS', '06-CI', '12-SS304', '13-SS316', '25-DS2205', '61-TI64', '63-AL10', '65-CUNI', '67-IN625'];
export const MATERIALS_2 = ['01-E60', '02-E70', '03-ER70', '04-ER80', '15-SS308', '16-SS316', '64-ALMG', '66-CUSI', '68-NICRMO', '69-NICR'];
/* valid MCL 1 / MCL 2 values; MC-I requires traceability, STD doesn't (mcl-traceability.ts) */
const MCL_POOL = ['STD', 'MC-I'];
/* item codes: 1 letter + 8 digits + hyphen + 2 digits, e.g. S12341001-14 (user-specified format,
   2026-09-23, replacing the earlier invented piece-mark style like HPF-D120-1). Leading letter
   varies (still invented, no real area-code scheme specified). */
const JOINING_ITEMS = [
  'S12341001-14', 'H98761234-02', 'M55512345-09', 'A20983456-03',
  'F77123890-11', 'D40456789-06', 'P66234567-08', 'S30987654-12',
  'H12398765-05', 'M84512345-01', 'A55678901-15', 'F19283746-07',
  'D77654321-10', 'P23456789-04', 'S65432109-13', 'H91234567-16',
];
const WPS_POOL = ['WPS-001', 'WPS-002', 'WPS-003', 'WPS-004', 'WPS-005', 'WPS-006'];
const NDT_POOL = ['Visual only', 'VT + UT', 'VT + RT', 'VT + MT', 'VT + PT', 'VT + 5X', 'VT + UT + RT', 'VT + MT + 5X', 'UT + RT + 5X', 'PT + 5X'];
const PWHT_POOL = ['None', 'Required — 600°C/2hr', 'Required — 620°C/1hr', 'Pending review'];
const N_IND_POOL = ['1', '2', '3'];
const NDT_RESULTS = ['SAT', 'UNSAT', 'N/A', ''];
/* NDT Root / NDT Each (Layer) / NDT Final: each phase's NDT requirement (see phaseNdtSteps() in
   workflow.ts). Blank and NA are no longer valid. */
export const NDT_REQUIREMENT_VALUES = ['5X', 'MT', 'MT/PT', 'PT', 'UT', 'VT'];
/* degree of RT required for Root/Final's RT NDT -- must be duplicated (not imported) from
   data/workflow.ts's RT_DEGREE_OPTIONS to avoid a circular import (workflow.ts already imports
   Job from this file); the Degree of RT Performed signoff field must match this to sign off.
   Seeded with real-data proportions (other valid degrees exist but aren't used in practice):
   Root is only NA/360/60, mostly NA or 360; Final is mostly 360/60/NA with a rare 10. */
const RT_ROOT_WEIGHTS: [string, number][] = [['NA', 45], ['360', 40], ['60', 15]];
const RT_FINAL_WEIGHTS: [string, number][] = [['360', 38], ['60', 30], ['NA', 29], ['10', 3]];
/* work package = Hull-Compartment-Detail, e.g. K7234-FWD-D03 */
const COMPARTMENTS = ['FWD', 'MID', 'AFT', 'ENG', 'CGO', 'HAB'];
const workPackageFor = (hull: string, i: number) =>
  `${hull}-${COMPARTMENTS[(i * 7) % COMPARTMENTS.length]}-D${String(1 + (i * 13) % 12).padStart(2, '0')}`;
/* real codes from CHARACTERISTIC_CODES (data/characteristics.ts) so Joint Details can show
   "code description" instead of a bare code; the old ['AB','CD',...] pool never matched that
   lookup table, so descriptions never resolved */
const ATTR_CODES = CHARACTERISTIC_CODES.map(c => c.code);

function seeded(n: number) {
  let s = n * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/* stable 5-char code from id: random alphanumeric jumble */
const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeJobId(seed: number): string {
  const rand = seeded(seed * 31 + 7);
  let code = '';
  for (let j = 0; j < 5; j++) {
    code += ID_CHARS[Math.floor(rand() * ID_CHARS.length)];
  }
  return code;
}

/* stable hull number: letter + 4 digits, e.g. K7234 */
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
function makeHull(seed: number): string {
  const rand = seeded(seed * 53 + 11);
  const letter = LETTERS[Math.floor(rand() * LETTERS.length)];
  const digits = String(1000 + Math.floor(rand() * 9000));
  return letter + digits;
}

/* stable 3-digit ship number, e.g. '692' -- one per hull, same jobs that share a hull share a ship */
function makeShip(seed: number): string {
  const rand = seeded(seed * 71 + 29);
  return String(100 + Math.floor(rand() * 900));
}

/* Hulls repeat across many jobs. A job is identified by its internal id (always populated, never
   shown) or by the unique combination of hull + drawing + joint, which generateJobs guarantees
   are both unique; the user-facing xrefid is a display-only copy of id that can be blank. */
const HULL_COUNT = 48;

export function generateJobs(count = 480): Job[] {
  const rand = seeded(42);
  const out: Job[] = [];
  const hulls = [...new Set(Array.from({ length: HULL_COUNT }, (_, k) => makeHull(k + 1)))];
  const shipByHull = new Map(hulls.map((h, k) => [h, makeShip(k + 1)]));
  const usedIdentity = new Set<string>();
  const joints = jointNumbers(count, 7);
  for (let i = 0; i < count; i++) {
    const trade = 'Welding';
    const technician = TECHNICIAN_NAMES[Math.floor(rand() * TECHNICIAN_NAMES.length)];
    const estimatedCost = Math.round((75 + rand() * 1925) * 100) / 100;
    const estimatedHours = Math.round((0.5 + rand() * 39.5) * 10) / 10;

    // schedule spread from ~6 months ago to ~6 months ahead
    const dayOffset = Math.floor(rand() * 360) - 180;
    const scheduledFor = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);

    const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
    const pickWeighted = (weights: [string, number][]): string => {
      let r = rand() * weights.reduce((sum, [, w]) => sum + w, 0);
      for (const [v, w] of weights) if ((r -= w) < 0) return v;
      return weights[weights.length - 1][0];
    };

    const joint = joints[i];
    let hull: string, drawing: string;
    do {
      hull = pick(hulls); drawing = pick(DRAWINGS);
    } while (usedIdentity.has(`${hull}|${drawing}|${joint}`));
    usedIdentity.add(`${hull}|${drawing}|${joint}`);

    const id = makeJobId(i + 1);
    const xrefidBlank = i % 4 === 0;
    /* placeholder until real engineering notes text is wired up: a couple of "SEE NOTE ####" references */
    /* real data never has UT alongside an RT degree for the same phase */
    const ndtRoot = pick(NDT_REQUIREMENT_VALUES);
    const ndtFinal = pick(NDT_REQUIREMENT_VALUES);
    const rtRoot = ndtRoot === 'UT' ? '' : pickWeighted(RT_ROOT_WEIGHTS);
    const rtFinal = ndtFinal === 'UT' ? '' : pickWeighted(RT_FINAL_WEIGHTS);
    const engineeringNotes = i % 3 === 0
      ? Array.from({ length: 2 + Math.floor(rand() * 2) }, () => `SEE NOTE ${1000 + Math.floor(rand() * 9000)}`).join(', ')
      : '';

    out.push({
      id,
      xrefid: xrefidBlank ? '' : id,
      ship: shipByHull.get(hull)!,
      hull,
      trade,
      technician,
      drawing,
      drawingRev: pick(DRAWING_REVS),
      joint,
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
      engineeringNotes,
      wps: pick(WPS_POOL),
      ndt: pick(NDT_POOL),
      pwht: pick(PWHT_POOL),
      nInd: pick(N_IND_POOL),
      rtRoot,
      rtFinal,
      ndtRoot,
      ndtEach: pick(NDT_REQUIREMENT_VALUES),
      ndtFinal,
      ut: pick(NDT_RESULTS),
      order: `${i % 2 === 0 ? '2' : '5'}${String(i * 7919 % 100000000).padStart(8, '0')}`,
      workPackage: workPackageFor(hull, i),
      workPermit: i % 4 === 0 ? `WP-${2000 + i}` : '',
      waff: '',   /* blanked for now, 2026-09-23 -- was `i % 5 === 0 ? 'Required' : ''` */
      serialNumber: xrefidBlank ? '' : `${(i % 2 === 0 ? 1 : 2)}${String((i * 7919 * 104729) % 100000000).padStart(8, '0')}A`,   /* 9 digits starting with 1 or 2, then A */
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
export const TECHNICIAN_OPTIONS = TECHNICIAN_NAMES.map(t => ({ label: t, value: t }));


/* add a test job for a given trade (for testing admin-added trades) */
let _nextCustomId = 10_000;
export function addTestJob(trade: string): Job {
  const numId = _nextCustomId++;
  const id = makeJobId(numId);
  const job: Job = {
    id,
    xrefid: id,
    ship: makeShip(numId),
    hull: makeHull(numId),
    trade,
    technician: TECHNICIAN_NAMES[numId % TECHNICIAN_NAMES.length],
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
