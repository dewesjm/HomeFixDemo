import { PSCL_OPTIONS, setShipLocations, shipLocationOptions } from './ship-locations';

describe('ship locations', () => {
  afterEach(() => localStorage.clear());

  it('labels each P/S/CL number with its side and keeps the number as the value', () => {
    expect(PSCL_OPTIONS.slice(0, 3)).toEqual([
      { label: '0 Centerline', value: '0' },
      { label: '1 Starboard', value: '1' },
      { label: '2 Port', value: '2' },
    ]);
  });

  it('offers only the sides set up at the Deck + Frame, labeled with their side', () => {
    setShipLocations([
      { hull: 'H1', deck: '1', frame: '190', pscl: '4', usage: 'L' },
      { hull: 'H1', deck: '1', frame: '190', pscl: '0', usage: 'Q' },
      { hull: 'H1', deck: '2', frame: '190', pscl: '3', usage: 'L' },
    ]);
    expect(shipLocationOptions('pscl', 'H1', { deck: '1', frame: '190' })).toEqual([
      { label: '0 Centerline', value: '0' },
      { label: '4 Port', value: '4' },
    ]);
  });
});
