import { inspectionProcedureOptions, setInspectionProcedures } from './inspection-procedures';

describe('inspection procedures', () => {
  beforeEach(() => localStorage.clear());

  it('lists only the procedures designated for the step Type, or all of them with no Type', () => {
    expect(inspectionProcedureOptions('pt').map(o => o.value)).toEqual(['ASME Sec V Art. 6', 'ASTM E165', 'AWS D1.1 MT/PT']);
    expect(inspectionProcedureOptions('').length).toBe(12);
  });

  it('gives RT and UT no procedures in common with each other or with MT/PT', () => {
    const rt = inspectionProcedureOptions('rt').map(o => o.value);
    const ut = inspectionProcedureOptions('ut').map(o => o.value);
    const surface = [...inspectionProcedureOptions('mt'), ...inspectionProcedureOptions('pt')].map(o => o.value);
    expect(rt.some(p => ut.includes(p) || surface.includes(p))).toBeFalse();
    expect(ut.some(p => surface.includes(p))).toBeFalse();
  });

  it('follows what Admin saved', () => {
    setInspectionProcedures([{ type: 'VT', procedure: 'Custom VT' }]);
    expect(inspectionProcedureOptions('vt').map(o => o.value)).toEqual(['Custom VT']);
    expect(inspectionProcedureOptions('rt')).toEqual([]);
  });
});
