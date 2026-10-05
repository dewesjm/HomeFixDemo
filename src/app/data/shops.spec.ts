import { STORAGE } from './storage-keys';
import { isShipboardLocation, isShipboardShop, setShops } from './shops';

describe('shops', () => {
  afterEach(() => localStorage.removeItem(STORAGE.shops));

  it('treats a location as Shipboard by its flag, not its name', () => {
    expect(isShipboardLocation('ship')).toBeTrue();
    expect(isShipboardLocation('south-bay-welding')).toBeFalse();
    setShops([{ name: 'Ship', shipboard: false }, { name: 'Dry Dock 2', shipboard: true }]);
    expect(isShipboardLocation('ship')).toBeFalse();
    expect(isShipboardLocation('dry-dock-2')).toBeTrue();
    expect(isShipboardShop('Dry Dock 2')).toBeTrue();
    expect(isShipboardLocation('')).toBeFalse();
  });
});
