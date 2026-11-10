import { STORAGE } from './storage-keys';
import { isShipboardLocation, isShipboardLocationName, setLocations } from './locations';

describe('locations', () => {
  afterEach(() => localStorage.removeItem(STORAGE.locations));

  it('treats a location as Shipboard by its flag, not its name', () => {
    expect(isShipboardLocation('ship')).toBeTrue();
    expect(isShipboardLocation('south-bay-welding')).toBeFalse();
    setLocations([{ name: 'Ship', shipboard: false }, { name: 'Dry Dock 2', shipboard: true }]);
    expect(isShipboardLocation('ship')).toBeFalse();
    expect(isShipboardLocation('dry-dock-2')).toBeTrue();
    expect(isShipboardLocationName('Dry Dock 2')).toBeTrue();
    expect(isShipboardLocation('')).toBeFalse();
  });
});
