/* Demo data: deterministic Fabrication values for a joint, and the helpers the seeded workflows share */
import { Job } from '../jobs';
import { DEFAULT_SHIP_LOCATIONS } from '../ship-locations';
import { shopOptions } from '../shops';

/* deterministic PRNG, stable per seed across reloads (mirrors jobs.ts) */
export function seeded(n: number) {
  let s = n * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/* MIC (material identification code): hyphen-delimited heat/lot style, e.g. 250C-1500-290-5 */
export function seededMic(rand: () => number): string {
  const letter = 'ABCDEFGH'[Math.floor(rand() * 8)];
  return `${200 + Math.floor(rand() * 300)}${letter}-${1000 + Math.floor(rand() * 9000)}-${100 + Math.floor(rand() * 900)}-${1 + Math.floor(rand() * 9)}`;
}

const SEED_SPECIFIC_LOCATIONS = ['Bay 3, Rack 12', 'Bay 1, Rack 4', 'Bay 5, Rack 9', 'Cell 2, Line B', 'Pad C, Yard 1'];
/* W.E. Memo is a reference to a specific memo, e.g. M-10; about a third of jobs have none */
const seedWeMemo = (rand: () => number) => (rand() < 0.3 ? '' : `M-${10 + Math.floor(rand() * 40)}`);

/* Realistic, deterministic fabrication data for a welding job. Every select value is taken from the real
   option lists so the dropdowns are populated; Ship-only fields are set only when Location is Ship. */
export function seedFabricationData(job: Job): Record<string, string> {
  const rand = seeded(job.id.charCodeAt(0) * 131 + job.id.charCodeAt(1) * 17 + job.id.charCodeAt(3));
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const shops = shopOptions();
  const ship = shops.find(s => s.value === 'ship');
  const onShip = !!ship && rand() < 0.3;
  const location = onShip ? ship!.value : pick(shops.filter(s => s.value !== 'ship')).value;
  /* a real row from the hull's sample Ship Locations, so every droplist shows the saved value */
  const shipRows = DEFAULT_SHIP_LOCATIONS.filter(e => e.hull === job.hull);
  const shipRow = onShip && shipRows.length ? pick(shipRows) : undefined;
  const revised = rand() < 0.3;
  return {
    location,
    specificLocation: pick(SEED_SPECIFIC_LOCATIONS),
    ...(shipRow ? { deck: shipRow.deck, frame: shipRow.frame, pscl: shipRow.pscl, usage: shipRow.usage } : {}),
    id1: seededMic(rand),
    id2: seededMic(rand),
    drawingRev: job.drawingRev || 'C',
    actualThickness: pick(['0.375', '0.5', '0.625', '0.75', '1.0']),
    weldMemo: seedWeMemo(rand),
    revisedJointDesign: revised ? 'c-18' : '',
    changeNumber: revised ? `ER-${1000 + Math.floor(rand() * 9000)}` : '',
    wtn: rand() < 0.5 ? '07:11.5-3' : '09:10.8-4',
  };
}
