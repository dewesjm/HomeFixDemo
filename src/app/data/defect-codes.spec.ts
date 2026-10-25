import { defectCodeOptions, getDefectCodes, setDefectCodes } from './defect-codes';

describe('defect codes', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('loads legacy choices as active and retains retired descriptions for rules', () => {
    setDefectCodes([{ type: 'RT', code: 'PO', description: 'Porosity' }, { type: 'RT', code: 'CR', description: 'Crack', active: false }]);
    expect(getDefectCodes()[0].active).toBeTrue();
    expect(defectCodeOptions('rt').map(o => o.value)).toEqual(['PO']);
    expect(defectCodeOptions('rt', true)[1]).toEqual({ value: 'CR', label: 'CR - Crack (inactive)' });
  });

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
