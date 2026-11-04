/* Admin > Ship Locations: per hull, the Level/Deck / Frame / P/S/CL / Usage combinations a joint on the
   Ship can be given (S and D hulls have no Usage). Fabrication's droplists cascade from it: Deck
   lists the joint's hull's decks, Frame the frames on that deck, P/S/CL the sides set up at that Deck + Frame, Usage the usages at
   that Deck + Frame + P/S/CL. Stored in localStorage. */
import { STORAGE } from './storage-keys';
import { HULLS } from './jobs';

export interface ShipLocationEntry {
  hull: string;
  deck: string;
  frame: string;
  pscl: string;
  usage: string;
}

/* P/S/CL is a number below 10: 0 is centerline, even numbers are port, odd numbers are starboard */
export const PSCL_VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const psclSide = (v: string) => v === '0' ? 'Centerline' : Number(v) % 2 ? 'Starboard' : 'Port';
/* droplist option for a P/S/CL number: the open list reads "2 Port", the stored value is just 2 */
const psclOption = (v: string) => ({ label: `${v} ${psclSide(v)}`, value: v });
export const PSCL_OPTIONS = PSCL_VALUES.map(psclOption);
/* S and D hulls' ship locations have no Usage (Fabrication shows Level/Deck, Frame and P/S/CL only) */
export const hullHasUsage = (hull: string) => !['S', 'D'].includes(hull.charAt(0));

/* the Fabrication fields this table supplies options for */
export const SHIP_LOCATION_KEYS = ['deck', 'frame', 'pscl', 'usage'];

/* sample data: hulls with the same letter share one layout. Deck is 1-8, Frame a number like 190,
   Usage a one-letter code. Each line is one Deck + Frame, then each P/S/CL with its usages; about
   half the sides have more than one, so Usage is sometimes a choice. S and D hulls have no Usage,
   so their sides are just the P/S/CL number. */
const LAYOUTS: Record<string, string[]> = {
  S: [
    '1 110 | 0 | 1 | 2',
    '1 125 | 0 | 2 | 3',
    '2 140 | 0 | 1 | 4',
    '3 155 | 1 | 2 | 5',
    '4 170 | 0 | 3 | 6',
    '6 190 | 0 | 1 | 2',
    '8 210 | 2 | 7 | 8',
  ],
  D: [
    '1 112 | 0 | 1 | 2',
    '2 128 | 0 | 3 | 4',
    '3 146 | 1 | 2 | 0',
    '4 162 | 0 | 5 | 6',
    '5 178 | 2 | 1 | 0',
    '7 194 | 0 | 4 | 9',
    '8 220 | 2 | 3 | 0',
  ],
  T: [
    '1 114 | 0: L Q | 1: L | 2: E M',
    '2 130 | 0: E | 1: E V | 4: M',
    '4 150 | 0: A L | 3: A | 2: M Q V',
    '5 176 | 1: L | 6: A Q | 0: E',
    '7 196 | 0: M V | 5: E | 8: E A V',
  ],
  N: [
    '1 116 | 0: E M | 1: E | 2: M Q',
    '3 136 | 0: L | 1: L A V | 4: M',
    '3 148 | 2: A L | 3: A | 0: V',
    '6 182 | 0: Q L | 7: L | 6: E Q',
    '8 200 | 0: E | 1: L V A | 2: A',
  ],
};

export const DEFAULT_SHIP_LOCATIONS: ShipLocationEntry[] = HULLS.flatMap(hull =>
  (LAYOUTS[hull[0]] ?? []).flatMap(line => {
    const [place, ...sides] = line.split(' | ');
    const [deck, frame] = place.split(' ');
    return sides.flatMap(side => {
      const [pscl, usages] = side.split(': ');
      return (usages ? usages.split(' ') : ['']).map(usage => ({ hull, deck, frame, pscl, usage }));
    });
  }));

export function getShipLocations(): ShipLocationEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE.shipLocations);
    return raw ? JSON.parse(raw) : DEFAULT_SHIP_LOCATIONS;
  } catch { return DEFAULT_SHIP_LOCATIONS; }
}

export function setShipLocations(entries: ShipLocationEntry[]) {
  localStorage.setItem(STORAGE.shipLocations, JSON.stringify(entries));
}

const unique = (values: string[]) => [...new Set(values)].map(v => ({ label: v, value: v }));

function deckOptions(hull: string) {
  return unique(getShipLocations().filter(e => e.hull === hull).map(e => e.deck));
}

function frameOptions(hull: string, deck: string) {
  return unique(getShipLocations().filter(e => e.hull === hull && e.deck === deck).map(e => e.frame));
}

/* only sides with a usage at this Deck + Frame, so a picked side always has a Usage to choose */
function psclOptions(hull: string, deck: string, frame: string) {
  const sides = new Set(getShipLocations()
    .filter(e => e.hull === hull && e.deck === deck && e.frame === frame).map(e => e.pscl));
  return PSCL_VALUES.filter(v => sides.has(v)).map(psclOption);
}

function usageOptions(hull: string, deck: string, frame: string, pscl: string) {
  return unique(getShipLocations()
    .filter(e => e.hull === hull && e.deck === deck && e.frame === frame && e.pscl === pscl)
    .map(e => e.usage));
}

/* the options a ship-location field has, given the rest of the joint's fabrication data */
export function shipLocationOptions(key: string, hull: string, fab: Record<string, string>) {
  if (key === 'deck') return deckOptions(hull);
  if (key === 'frame') return fab['deck'] ? frameOptions(hull, fab['deck']) : [];
  if (key === 'pscl') return fab['deck'] && fab['frame'] ? psclOptions(hull, fab['deck'], fab['frame']) : [];
  if (key === 'usage') return fab['deck'] && fab['frame'] && fab['pscl'] ? usageOptions(hull, fab['deck'], fab['frame'], fab['pscl']) : [];
  return [];
}

/* fields that depend on each ship-location field, cleared when they stop being valid */
export const SHIP_LOCATION_DEPENDENTS: Record<string, string[]> = {
  deck: ['frame', 'pscl', 'usage'],
  frame: ['pscl', 'usage'],
  pscl: ['usage'],
};
