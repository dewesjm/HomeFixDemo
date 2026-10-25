import { getWeldPositions, setWeldPositions, weldPositionOptions } from './weld-positions';

describe('Weld Position retirement', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());
  it('preserves legacy choices and hides retired positions from new selections', () => {
    setWeldPositions([{ code: 'O', description: 'Overhead' }, { code: 'F', description: 'Flat', active: false }]);
    expect(getWeldPositions()[0].active).toBeTrue();
    expect(weldPositionOptions()).toEqual([{ value: 'o', label: 'O - Overhead' }]);
    expect(weldPositionOptions(true)[1]).toEqual({ value: 'f', label: 'F - Flat (inactive)' });
  });
});
