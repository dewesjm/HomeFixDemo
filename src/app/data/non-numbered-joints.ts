/* Non-numbered joints: mock model + seeded generator, stands in for the external system's table.
   Table key = interim part number + order + sequence number, but order is always blank in the real
   data, so sequence number tells the joints under one interim part number apart. */
import { HULLS, MCL_POOL, N_IND_POOL, PIPE_SIZES, WALL_THICKNESSES } from './jobs';
import { seeded } from './seed-fabrication';

export interface NonNumberedJoint {
  interimPartNumber: string;
  order: string;             /* part of the table key; always blank in the real data */
  sequenceNumber: string;
  findNumber1: string;
  findNumber2: string;
  manufacturingDrawingItem: string;
  additionalDescription1: string;
  additionalDescription2: string;
  weldClass: string;
  jointType: string;
  nominalSize: string;
  wallThickness: string;
  mcl1: string;
  mcl2: string;
  milSpecification: string;
  wireSize: string;
  pipeScheduleClass: string;
  description: string;
  nInd: string;              /* N Indicator: 1, 2 or 3 */
  hulls: string[];           /* List of Hulls */
}

/* placeholder value pools; generic, not real codes */
const WELD_CLASSES = ['Class 1', 'Class 2', 'Class 3'];
const JOINT_TYPES = ['Butt', 'Corner', 'Fillet', 'Groove', 'Lap', 'Socket'];
const MIL_SPECIFICATIONS = ['MS-1001', 'MS-1002', 'MS-1004', 'MS-1007', 'MS-1010'];
const WIRE_SIZES = ['0.035"', '0.045"', '1/16"', '3/32"', '1/8"'];
const PIPE_SCHEDULE_CLASSES = ['SCH 10', 'SCH 40', 'SCH 80', 'SCH 160', 'Class 150', 'Class 300'];
const DESCRIPTIONS = ['Bracket attachment', 'Flange to pipe', 'Support clip', 'Cover plate', 'Mounting pad', 'Sleeve to pipe', 'Stiffener', 'Lifting lug'];
const ADDITIONAL_DESCRIPTIONS = ['Both sides', 'Full length', 'Seal weld', 'Shop weld', 'Field weld', 'See drawing note'];

const GROUP_COUNT = 45;
const PART_COUNT = 18;

function generateNonNumberedJoints(): NonNumberedJoint[] {
  const rand = seeded(311);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const digits = (n: number) => String(Math.floor(rand() * 10 ** n)).padStart(n, '0');
  const parts = Array.from({ length: PART_COUNT }, () => `IP-${digits(5)}`);
  const out: NonNumberedJoint[] = [];
  /* a part comes up in more than one group; its sequence numbers carry on across them */
  const lastSequence = new Map<string, number>();
  for (let g = 0; g < GROUP_COUNT; g++) {
    const interimPartNumber = parts[g % PART_COUNT];
    const drawingItem = `MD-${digits(5)}`;
    const hulls = [...new Set(Array.from({ length: 1 + Math.floor(rand() * 3) }, () => pick(HULLS)))].sort();
    const first = (lastSequence.get(interimPartNumber) ?? 0) + 1;
    const last = first + Math.floor(rand() * 5);
    lastSequence.set(interimPartNumber, last);
    for (let s = first; s <= last; s++) {
      out.push({
        interimPartNumber,
        order: '',
        sequenceNumber: String(s),
        findNumber1: String(1 + Math.floor(rand() * 99)),
        findNumber2: rand() < 0.4 ? '' : String(1 + Math.floor(rand() * 99)),
        manufacturingDrawingItem: `${drawingItem}-${String(s).padStart(3, '0')}`,
        additionalDescription1: pick(ADDITIONAL_DESCRIPTIONS),
        additionalDescription2: rand() < 0.6 ? '' : pick(ADDITIONAL_DESCRIPTIONS),
        weldClass: pick(WELD_CLASSES),
        jointType: pick(JOINT_TYPES),
        nominalSize: pick(PIPE_SIZES),
        wallThickness: pick(WALL_THICKNESSES),
        mcl1: pick(MCL_POOL),
        mcl2: pick(MCL_POOL),
        milSpecification: pick(MIL_SPECIFICATIONS),
        wireSize: pick(WIRE_SIZES),
        pipeScheduleClass: pick(PIPE_SCHEDULE_CLASSES),
        description: pick(DESCRIPTIONS),
        nInd: pick(N_IND_POOL),
        hulls,
      });
    }
  }
  /* stored in key order: interim part number, sequence number (order is blank) */
  return out.sort((a, b) => a.interimPartNumber.localeCompare(b.interimPartNumber)
    || Number(a.sequenceNumber) - Number(b.sequenceNumber));
}

export const NON_NUMBERED_JOINTS: NonNumberedJoint[] = generateNonNumberedJoints();
