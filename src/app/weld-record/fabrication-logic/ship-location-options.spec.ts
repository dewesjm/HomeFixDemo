import { setShipLocations } from '../../data/ship-locations';
import { shipLocationOptions } from './ship-location-options';

describe('ship location options', () => {
  afterEach(() => localStorage.clear());

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
