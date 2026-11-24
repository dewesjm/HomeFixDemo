import {
  getDefectCodes, getLocations, getQualifications, getRepairCodes, getRoutingSettings,
  getSignoffForms, getSignoffTypes, getWeldPositions,
} from './reference-data-service';

describe('reference data service', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('answers every table as { ok: true, data } with its rows', () => {
    const answers = {
      positions: getWeldPositions().data.positions,
      qualifications: getQualifications().data.qualifications,
      defectCodes: getDefectCodes().data.defectCodes,
      repairCodes: getRepairCodes().data.repairCodes,
      locations: getLocations().data.locations,
      routings: getRoutingSettings('pipe').data.routings,
      types: getSignoffTypes('pipe').data.types,
      forms: getSignoffForms('pipe').data.forms,
    };
    for (const [name, rows] of Object.entries(answers)) {
      expect(Array.isArray(rows)).withContext(name).toBeTrue();
      expect(rows.length).withContext(name).toBeGreaterThan(0);
    }
  });

  it('answers a copy of the qualification codes, so a caller can\'t change them', () => {
    const first = getQualifications().data.qualifications;
    first.push('CHANGED');
    expect(getQualifications().data.qualifications).not.toContain('CHANGED');
  });
});
