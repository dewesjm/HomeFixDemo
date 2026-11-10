import { PSCL_OPTIONS } from './ship-locations';

describe('ship locations', () => {
  afterEach(() => localStorage.clear());

  it('labels each P/S/CL number with its side and keeps the number as the value', () => {
    expect(PSCL_OPTIONS.slice(0, 3)).toEqual([
      { label: '0 Centerline', value: '0' },
      { label: '1 Starboard', value: '1' },
      { label: '2 Port', value: '2' },
    ]);
  });
});
