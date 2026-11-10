/* Admin > Ship Locations: per hull, the Level/Deck / Frame / P/S/CL / Usage combinations a joint on the
   Ship can be given (S and D hulls have no Usage). Stored in localStorage. Fabrication's droplists
   built from these rows are weld-record/fabrication-logic/ship-location-options.ts. */
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
export const psclOption = (v: string) => ({ label: `${v} ${psclSide(v)}`, value: v });
export const PSCL_OPTIONS = PSCL_VALUES.map(psclOption);

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
