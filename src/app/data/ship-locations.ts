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

export const PSCL_VALUES = ['P', 'S', 'CL'];
/* the Fabrication fields this table supplies options for */
export const SHIP_LOCATION_KEYS = ['deck', 'frame', 'pscl', 'usage'];

/* sample data: hulls with the same letter share one layout. Each line is one Deck + Frame, then its
   usages on the P | S | CL side; about half the sides have more than one, so Usage is sometimes a choice. */
const LAYOUTS: Record<string, string[]> = {
  S: [
    'D1 F10: Tank Piping | Tank | Machinery Engine Electrical',
    'D1 F22: Engine | Engine Piping Ventilation | Machinery',
    'D2 F30: Cargo Storage | Cargo | Piping',
    'D2 F38: Storage | Storage Other | Ventilation',
    'D3 F45: Living Habitability | Living | Galley Living',
    'D3 F52: Galley | Living Ventilation | Electrical',
    'D4 F60: Habitability Ventilation | Habitability | Deck Other',
  ],
  D: [
    'D1 F12: Tank Piping | Tank | Engine Machinery',
    'D1 F24: Electrical | Engine Machinery | Ventilation',
    'D2 F32: Cargo Storage Other | Cargo | Piping',
    'D2 F40: Storage | Other Ventilation | Other',
    'D3 F48: Living Habitability | Galley | Galley Storage',
    'D4 F62: Habitability | Habitability Ventilation | Deck',
    'D5 F68: Deck Other | Storage | Deck Electrical Other',
  ],
  T: [
    'D1 F14: Tank Piping | Tank | Engine Machinery',
    'D1 F20: Engine | Engine Ventilation | Machinery',
    'D2 F34: Cargo Storage | Cargo | Machinery Piping Other',
    'D3 F50: Living | Galley Storage | Deck',
    'D3 F56: Habitability Ventilation | Electrical | Deck Galley Other',
  ],
  N: [
    'D1 F16: Engine Machinery | Engine | Machinery Electrical',
    'D2 F28: Tank | Tank Storage Other | Machinery',
    'D2 F42: Cargo Storage | Cargo | Ventilation',
    'D3 F58: Habitability Living | Living | Galley Habitability',
    'D3 F64: Galley | Living Ventilation Other | Other',
  ],
};

export const DEFAULT_SHIP_LOCATIONS: ShipLocationEntry[] = HULLS.flatMap(hull =>
  (LAYOUTS[hull[0]] ?? []).flatMap(line => {
    const [place, sides] = line.split(': ');
    const [deck, frame] = place.split(' ');
    return sides.split(' | ').flatMap((usages, i) =>
      usages.split(' ').map(usage => ({ hull, deck, frame, pscl: PSCL_VALUES[i], usage })));
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
