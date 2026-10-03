/* Admin > Ship Locations: per hull, the Deck / Frame / P/S/CL / Usage combinations a joint on the
   Ship can be given. Fabrication's droplists cascade from it: Deck lists the joint's hull's decks,
   Frame the frames on that deck, Usage the usages at that Deck + Frame + P/S/CL. P/S/CL itself is
   always P, S or CL. Stored in localStorage. */
import { STORAGE } from './storage-keys';
import { HULLS } from './jobs';

export interface ShipLocationEntry {
  hull: string;
  deck: string;
  frame: string;
  pscl: string;
  usage: string;
}

export const PSCL_VALUES = ['P', 'S', 'CL'];
/* the Fabrication fields this table supplies options for */
export const SHIP_LOCATION_KEYS = ['deck', 'frame', 'pscl', 'usage'];

/* sample data: hulls with the same letter share one layout ("Deck Frame P/S/CL Usage") */
const LAYOUTS: Record<string, string[]> = {
  S: [
    'D1 F10 P Tank', 'D1 F10 S Tank', 'D1 F10 CL Machinery', 'D1 F22 P Engine', 'D1 F22 S Engine',
    'D1 F22 CL Engine', 'D1 F22 CL Machinery',
    'D2 F30 P Cargo', 'D2 F30 S Cargo', 'D2 F38 CL Other',
    'D3 F45 P Living', 'D3 F45 S Living', 'D3 F52 CL Galley',
    'D4 F60 P Habitability', 'D4 F60 S Habitability', 'D4 F66 CL Deck',
  ],
  D: [
    'D1 F12 P Tank', 'D1 F12 S Tank', 'D1 F24 CL Engine', 'D1 F24 CL Machinery',
    'D2 F32 P Cargo', 'D2 F32 S Cargo', 'D2 F40 CL Other',
    'D3 F48 P Living', 'D3 F48 S Living', 'D3 F54 CL Galley',
    'D4 F62 P Habitability', 'D4 F62 S Habitability',
    'D5 F68 CL Deck',
  ],
  T: [
    'D1 F14 P Tank', 'D1 F14 S Tank', 'D1 F20 CL Engine',
    'D2 F34 P Cargo', 'D2 F34 S Cargo', 'D2 F34 CL Machinery',
    'D3 F50 P Living', 'D3 F50 S Galley', 'D3 F56 CL Deck',
  ],
  N: [
    'D1 F16 P Engine', 'D1 F16 S Engine', 'D1 F16 CL Machinery',
    'D2 F28 P Tank', 'D2 F28 S Tank', 'D2 F42 CL Cargo',
    'D3 F58 P Habitability', 'D3 F58 S Living', 'D3 F64 CL Galley', 'D3 F64 CL Other',
  ],
};

export const DEFAULT_SHIP_LOCATIONS: ShipLocationEntry[] = HULLS.flatMap(hull =>
  (LAYOUTS[hull[0]] ?? []).map(line => {
    const [deck, frame, pscl, usage] = line.split(' ');
    return { hull, deck, frame, pscl, usage };
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

export function deckOptions(hull: string) {
  return unique(getShipLocations().filter(e => e.hull === hull).map(e => e.deck));
}

export function frameOptions(hull: string, deck: string) {
  return unique(getShipLocations().filter(e => e.hull === hull && e.deck === deck).map(e => e.frame));
}

export function usageOptions(hull: string, deck: string, frame: string, pscl: string) {
  return unique(getShipLocations()
    .filter(e => e.hull === hull && e.deck === deck && e.frame === frame && e.pscl === pscl)
    .map(e => e.usage));
}

/* the options a ship-location field has, given the rest of the joint's fabrication data */
export function shipLocationOptions(key: string, hull: string, fab: Record<string, string>) {
  if (key === 'deck') return deckOptions(hull);
  if (key === 'frame') return fab['deck'] ? frameOptions(hull, fab['deck']) : [];
  if (key === 'pscl') return PSCL_VALUES.map(v => ({ label: v, value: v }));
  if (key === 'usage') return fab['deck'] && fab['frame'] && fab['pscl'] ? usageOptions(hull, fab['deck'], fab['frame'], fab['pscl']) : [];
  return [];
}

/* fields that depend on each ship-location field, cleared when they stop being valid */
export const SHIP_LOCATION_DEPENDENTS: Record<string, string[]> = {
  deck: ['frame', 'usage'],
  frame: ['usage'],
  pscl: ['usage'],
};
