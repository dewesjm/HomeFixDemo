/* Seeded attribute codes for the sample joints (Weld Record and Weld Planning). Each joint gets 1 to 4
   different codes, one being the most common and each extra code rarer. A joint's NDT values follow
   what the real data shows for its codes (ATTRIBUTE-CODES-PLAN.md, code-by-code review); codes with
   no real-data notes leave the random NDT as it is. Draws come from their own stream, so the rest of
   each joint's seeded values don't shift. */
import { PROGRESSION_ATTRIBUTE_CODES } from './attribute-codes';

const CODES: string[] = PROGRESSION_ATTRIBUTE_CODES.map(c => c.code);
/* how many codes a joint carries: 1 most often, 4 rarely */
const COUNT_WEIGHTS: [number, number][] = [[1, 50], [2, 28], [3, 15], [4, 7]];

export interface SeedNdt {
  ndtRoot: string;
  ndtEach: string;
  ndtFinal: string;
  rtRoot: string;
  rtFinal: string;
}

type Rand = () => number;
const pick = <T>(rand: Rand, arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

/* the real-data NDT for joints with each code */
const REAL_DATA_NDT: Record<string, (rand: Rand, n: SeedNdt) => Partial<SeedNdt>> = {
  PR: () => ({ ndtFinal: 'PT', rtFinal: '60' }),
  SI: () => ({ ndtFinal: 'PT', rtFinal: '60' }),
  IR: () => ({ ndtFinal: 'PT' }),
  RI: rand => ({ ndtRoot: '5X', ndtFinal: 'PT', rtRoot: pick(rand, ['NA', '60']), rtFinal: pick(rand, ['60', 'NA']) }),
  /* no Each Layer inspection; NDT Root usually 5X, sometimes none */
  GV: rand => ({ ndtRoot: rand() < 0.8 ? '5X' : '', ndtEach: '', ndtFinal: 'PT' }),
  /* NDT Final always MT/PT, NDT Root mostly 5X, RT Root NA */
  IA: (rand, n) => ({ ndtRoot: rand() < 0.8 ? '5X' : n.ndtRoot, ndtFinal: pick(rand, ['MT', 'PT']), rtRoot: 'NA' }),
  /* a mix of PT and VT in NDT Final */
  FC: rand => ({ ndtFinal: pick(rand, ['PT', 'VT']) }),
};

/* a joint's four attribute code slots, filled from the front with different codes */
export function seedAttributeCodes(rand: Rand): [string, string, string, string] {
  let r = rand() * COUNT_WEIGHTS.reduce((sum, [, w]) => sum + w, 0);
  const count = COUNT_WEIGHTS.find(([, w]) => (r -= w) < 0)?.[0] ?? 1;
  const pool = [...CODES];
  const codes = Array.from({ length: 4 }, (_, k) => k < count ? pool.splice(Math.floor(rand() * pool.length), 1)[0] : '');
  return codes as [string, string, string, string];
}

/* the joint's NDT with each of its codes' real-data values applied in slot order */
export function ndtForAttributeCodes(codes: string[], ndt: SeedNdt, rand: Rand): SeedNdt {
  return codes.reduce((n, code) => ({ ...n, ...REAL_DATA_NDT[code]?.(rand, n) }), ndt);
}
