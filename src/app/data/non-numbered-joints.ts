/* Non-numbered joints: mock model + seeded generator, stands in for the external system's table.
   Table key = interim part number + order + sequence number, but order is always blank in the real
   data, so sequence number tells the joints under one interim part number apart. */
import { HULLS, MCL_POOL, N_IND_POOL, PIPE_SIZES, WALL_THICKNESSES } from './jobs';
import { seeded } from './seed-fabrication';
import { getBaseMaterialCodes } from '../future/weld-engineering/procedure-service/procedure-catalog-service';
import { JOINT_DESIGN_LABELS } from './joint-design-seed';
import { procedures } from './procedures';

export interface NonNumberedJoint {
  interimPartNumber: string;
  order: string;             /* part of the table key; always blank in the real data */
  sequenceNumber: string;
  findNumber1: string;
  findNumber2: string;
  manufacturingDrawingItem: string;
  additionalDescription1: string;   /* a material type: one of getBaseMaterialCodes(), as Material Type 1/2 on pipe joints */
  additionalDescription2: string;   /* a material type too, often blank */
  weldClass: string;         /* a GWP from the procedure catalog */
  jointType: string;         /* a joint class (P-15, C-24, ...), the joint design list pipe joints use */
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
const MIL_SPECIFICATIONS = ['MS-1001', 'MS-1002', 'MS-1004', 'MS-1007', 'MS-1010'];
const WIRE_SIZES = ['0.035"', '0.045"', '1/16"', '3/32"', '1/8"'];
const PIPE_SCHEDULE_CLASSES = ['SCH 10', 'SCH 40', 'SCH 80', 'SCH 160', 'Class 150', 'Class 300'];
const DESCRIPTIONS = ['Bracket attachment', 'Flange to pipe', 'Support clip', 'Cover plate', 'Mounting pad', 'Sleeve to pipe', 'Stiffener', 'Lifting lug'];

const GROUP_COUNT = 45;
const PART_COUNT = 18;

/* the GWPs for a base material pair (either order), else any GWP */
function gwpsFor(material1: string, material2: string): string[] {
  const all = procedures();
  const fits = all.filter(p => (p.extraFields['baseMetal1Type'] === material1 && p.extraFields['baseMetal2Type'] === material2)
    || (p.extraFields['baseMetal1Type'] === material2 && p.extraFields['baseMetal2Type'] === material1));
  return [...new Set((fits.length ? fits : all).map(p => p.gwp))];
}

function generateNonNumberedJoints(): NonNumberedJoint[] {
  const rand = seeded(311);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const digits = (n: number) => String(Math.floor(rand() * 10 ** n)).padStart(n, '0');
  const letters = (n: number) => Array.from({ length: n }, () => String.fromCharCode(65 + Math.floor(rand() * 26))).join('');
  const between = (lo: number, hi: number) => String(lo + Math.floor(rand() * (hi - lo + 1)));
  /* interim part number = a material number: mostly PE + 6 digits, sometimes 7 digits, now and then SAP + a long number */
  const material = () => {
    const r = rand();
    return r < 0.75 ? `PE${digits(6)}` : r < 0.95 ? between(1000000, 9999999) : `SAP${digits(12)}`;
  };
  /* find numbers: short letter/digit codes in a few shapes, e.g. 4KT-R318, PM93XL, LV-S2047, PM52C-T, 7HN-W28K */
  const FIND_SHAPES = [
    () => `${between(1, 9)}${letters(2)}-${letters(1)}${digits(3)}`,
    () => `P${letters(1)}${between(1, 199)}${letters(1 + Math.floor(rand() * 2))}`,
    () => `${letters(2)}-${letters(1)}${digits(4)}`,
    () => `P${letters(1)}${between(10, 99)}${letters(1)}-${letters(1)}`,
    () => `${between(1, 9)}${letters(2)}-${letters(1)}${digits(2)}${letters(1)}`,
  ];
  const findNumber = () => pick(FIND_SHAPES)();
  const parts = [...new Set(Array.from({ length: PART_COUNT }, material))];
  const out: NonNumberedJoint[] = [];
  /* a part comes up in more than one group; its sequence numbers carry on across them */
  const lastSequence = new Map<string, number>();
  for (let g = 0; g < GROUP_COUNT; g++) {
    const interimPartNumber = parts[g % parts.length];
    const drawingItem = `MD-${digits(5)}`;
    const hulls = [...new Set(Array.from({ length: 1 + Math.floor(rand() * 3) }, () => pick(HULLS)))].sort();
    const first = (lastSequence.get(interimPartNumber) ?? 0) + 1;
    const last = first + Math.floor(rand() * 5);
    lastSequence.set(interimPartNumber, last);
    for (let s = first; s <= last; s++) {
      const material1 = pick(getBaseMaterialCodes());
      const material2 = rand() < 0.6 ? '' : pick(getBaseMaterialCodes());
      out.push({
        interimPartNumber,
        order: '',
        sequenceNumber: String(s),
        findNumber1: findNumber(),
        findNumber2: findNumber(),
        manufacturingDrawingItem: `${drawingItem}-${String(s).padStart(3, '0')}`,
        additionalDescription1: material1,
        additionalDescription2: material2,
        /* a GWP that fits the joint's material types; a blank second one means the same material */
        weldClass: pick(gwpsFor(material1, material2 || material1)),
        jointType: pick(JOINT_DESIGN_LABELS),
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
