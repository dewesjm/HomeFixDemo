/* Admin > Locations: the shops Fabrication's Location droplist offers (localStorage). A Shipboard
   location shows Deck/Frame/P-S-CL/Usage on the joint's Fabrication panel. */
import { STORAGE } from './storage-keys';

export interface Shop {
  name: string;
  shipboard: boolean;
}

const DEFAULT_SHOPS: Shop[] = [
  { name: 'North Yard Fabrication', shipboard: false },
  { name: 'South Bay Welding', shipboard: false },
  { name: 'Pipe Shop - Building 4', shipboard: false },
  { name: 'Machine Shop - Building 2', shipboard: false },
  { name: 'Structural Shop - Building 7', shipboard: false },
  { name: 'Ship', shipboard: true },
];

export function getShops(): Shop[] {
  try {
    const raw = localStorage.getItem(STORAGE.shops);
    return raw ? JSON.parse(raw) : DEFAULT_SHOPS;
  } catch { return DEFAULT_SHOPS; }
}

export function setShops(shops: Shop[]) {
  localStorage.setItem(STORAGE.shops, JSON.stringify(shops));
}

/* Location dropdown options; the value is the slugged shop name (Ship = 'ship') */
export const shopValue = (shop: string) => shop.toLowerCase().replace(/\s+/g, '-');
export const shopOptions = () => getShops().map(s => ({ label: s.name, value: shopValue(s.name) }));

/* true when a shop name (as an assignment stores it) is a Shipboard location */
export function isShipboardShop(name: string): boolean {
  return getShops().some(s => s.shipboard && s.name === name);
}

/* true when a Fabrication Location value (the slug) is a Shipboard location */
export function isShipboardLocation(value: string | undefined): boolean {
  return !!value && getShops().some(s => s.shipboard && shopValue(s.name) === value);
}
