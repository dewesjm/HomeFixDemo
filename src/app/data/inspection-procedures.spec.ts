import { inspectionProcedureOptions, setInspectionProcedures } from './inspection-procedures';

describe('inspection procedures', () => {
  beforeEach(() => localStorage.clear());

  it('lists only the procedures designated for the step Type, or all of them with no Type', () => {
    expect(inspectionProcedureOptions('pt').map(o => o.value)).toEqual(['ASME Sec V', 'ASTM E165']);
    expect(inspectionProcedureOptions('').length).toBe(4);
  });

  it('follows what Admin saved', () => {
    setInspectionProcedures([{ type: 'VT', procedure: 'Custom VT' }]);
    expect(inspectionProcedureOptions('vt').map(o => o.value)).toEqual(['Custom VT']);
    expect(inspectionProcedureOptions('rt')).toEqual([]);
  });
});
