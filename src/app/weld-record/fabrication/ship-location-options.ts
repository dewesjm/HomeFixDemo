/* Fabrication's ship-location droplists, built from Admin > Ship Locations (data/ship-locations.ts):
   Deck lists the joint's hull's decks, Frame the frames on that deck, P/S/CL the sides set up at that
   Deck + Frame, Usage the usages at that Deck + Frame + P/S/CL. */
import { PSCL_VALUES, getShipLocations, psclOption } from '../../data/ship-locations';

/* S and D hulls' ship locations have no Usage (Fabrication shows Level/Deck, Frame and P/S/CL only) */
export const hullHasUsage = (hull: string) => !['S', 'D'].includes(hull.charAt(0));

/* the Fabrication fields Admin > Ship Locations supplies options for */
export const SHIP_LOCATION_KEYS = ['deck', 'frame', 'pscl', 'usage'];

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
