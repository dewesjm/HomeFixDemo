/* Admin > Ship Locations: per hull, the Deck / Frame / P/S/CL / Usage combinations a joint on the
   Ship can be given. Fabrication's droplists cascade from it: Deck lists the joint's hull's decks,
   Frame the frames on that deck, P/S/CL the sides set up at that Deck + Frame, Usage the usages at
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
/* the Fabrication fields this table supplies options for */
export const SHIP_LOCATION_KEYS = ['deck', 'frame', 'pscl', 'usage'];

/* sample data: hulls with the same letter share one layout. Deck is 1-8, Frame a number like 190,
   Usage a one-letter code. Each line is one Deck + Frame, then each P/S/CL with its usages; about
   half the sides have more than one, so Usage is sometimes a choice. */
const LAYOUTS: Record<string, string[]> = {
  S: [
    '1 110 | 0: L Q | 1: L | 2: M E A',
    '1 125 | 0: E | 2: E Q V | 3: M',
    '2 140 | 0: A L | 1: A | 4: Q',
    '3 155 | 1: L | 2: L V | 5: V',
    '4 170 | 0: M Q | 3: M | 6: E A',
    '6 190 | 0: E | 1: M V | 2: E',
    '8 210 | 2: Q V | 7: Q | 8: A',
  ],
  D: [
    '1 112 | 0: L Q | 1: L | 2: E M',
    '2 128 | 0: E | 3: E M | 4: V',
    '3 146 | 1: A L | 2: A | 0: Q',
    '4 162 | 0: L | 5: V A | 6: L',
    '5 178 | 2: M | 1: M V | 0: A E',
    '7 194 | 0: Q | 4: Q V | 9: E',
    '8 220 | 2: A Q | 3: L | 0: A M V',
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
      return usages.split(' ').map(usage => ({ hull, deck, frame, pscl, usage }));
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
  return PSCL_VALUES.filter(v => sides.has(v)).map(v => ({ label: v, value: v }));
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
