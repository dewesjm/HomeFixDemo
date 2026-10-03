/* Admin > Locations: the shops Fabrication's Location droplist offers (localStorage) */
import { STORAGE } from './storage-keys';

const DEFAULT_SHOPS = ['North Yard Fabrication', 'South Bay Welding', 'Pipe Shop - Building 4', 'Machine Shop - Building 2', 'Structural Shop - Building 7', 'Ship'];

export function getShops(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE.shops);
    return raw ? JSON.parse(raw) : DEFAULT_SHOPS;
  } catch { return DEFAULT_SHOPS; }
}

export function setShops(shops: string[]) {
  localStorage.setItem(STORAGE.shops, JSON.stringify(shops));
}

/* Location dropdown options; the value is the slugged shop name (Ship = 'ship') */
const shopValue = (shop: string) => shop.toLowerCase().replace(/\s+/g, '-');
export const shopOptions = () => getShops().map(s => ({ label: s, value: shopValue(s) }));
