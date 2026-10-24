import { getRepairCodes } from './repair-codes';
import { STORAGE } from './storage-keys';
describe('Repair Code lookup and consumers', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());
  it('keeps built-in identities and falls back from malformed storage', () => {
    expect(getRepairCodes().map(r => r.code)).toEqual(['grind', 'weld-repair', 'cut']);
    localStorage.setItem(STORAGE.repairCodes, '{');
    expect(getRepairCodes().length).toBe(3);
    localStorage.setItem(STORAGE.repairCodes, '[{}]');
    expect(getRepairCodes().length).toBe(3);
  });

});
