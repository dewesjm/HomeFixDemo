/* Admin > Locations: the locations Fabrication's Location droplist offers (localStorage). A Shipboard
   location shows Level/Deck/Frame/P-S-CL/Usage on the joint's Fabrication panel. */
import { STORAGE } from './storage-keys';

export interface LocationEntry {
  name: string;
  shipboard: boolean;
}

const DEFAULT_LOCATIONS: LocationEntry[] = [
  { name: 'North Yard Fabrication', shipboard: false },
  { name: 'South Bay Welding', shipboard: false },
  { name: 'Pipe Shop - Building 4', shipboard: false },
  { name: 'Machine Shop - Building 2', shipboard: false },
  { name: 'Structural Shop - Building 7', shipboard: false },
  { name: 'Ship', shipboard: true },
];

export function getLocations(): LocationEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE.locations);
    return raw ? JSON.parse(raw) : DEFAULT_LOCATIONS;
  } catch { return DEFAULT_LOCATIONS; }
}

export function setLocations(locations: LocationEntry[]) {
  localStorage.setItem(STORAGE.locations, JSON.stringify(locations));
}

/* Location dropdown options; the value is the slugged location name (Ship = 'ship') */
export const locationValue = (name: string) => name.toLowerCase().replace(/\s+/g, '-');
export const locationOptions = () => getLocations().map(s => ({ label: s.name, value: locationValue(s.name) }));

/* true when a location name (as an assignment stores it) is a Shipboard location */
export function isShipboardLocationName(name: string): boolean {
  return getLocations().some(s => s.shipboard && s.name === name);
}

/* true when a Fabrication Location value (the slug) is a Shipboard location */
export function isShipboardLocation(value: string | undefined): boolean {
  return !!value && getLocations().some(s => s.shipboard && locationValue(s.name) === value);
}
