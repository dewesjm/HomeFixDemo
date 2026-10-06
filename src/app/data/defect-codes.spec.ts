import { defectCodeOptions, setDefectCodes } from './defect-codes';

describe('defect codes', () => {
  beforeEach(() => localStorage.clear());

  it('lists the codes for the step Type as "code - description", valued by code', () => {
    const rt = defectCodeOptions('rt');
    expect(rt.length).toBe(6);
    expect(rt[0]).toEqual({ label: 'PO - Porosity', value: 'PO' });
    expect(defectCodeOptions('ut')).toEqual([]);
  });

  it('follows what Admin saved', () => {
    setDefectCodes([{ type: 'UT', code: 'LR', description: 'Linear Reflector' }]);
    expect(defectCodeOptions('ut')).toEqual([{ label: 'LR - Linear Reflector', value: 'LR' }]);
    expect(defectCodeOptions('rt')).toEqual([]);
    expect(defectCodeOptions('').length).toBe(1);
  });
});
