import { getWeldPositions as loadWeldPositions } from '../../data/weld-positions';
import { ALL_QUALS } from '../qualifications-logic/qualifications';
import { getDefectCodes as loadDefectCodes } from '../../data/defect-codes';
import { getRepairCodes as loadRepairCodes } from '../../data/repair-codes';
import { getLocations as loadLocations } from '../../data/locations';
import { loadRoutingSettings } from '../../data/routing-settings';
import { getSignoffTypes as loadSignoffTypes } from '../../data/signoff-types';
import { getStepFieldConfig } from '../../data/signoff-type-forms';

export function getWeldPositions() {
  return { ok: true as const, data: { positions: loadWeldPositions() } };
}

export function getQualifications() {
  return { ok: true as const, data: { qualifications: [...ALL_QUALS] } };
}

export function getDefectCodes() {
  return { ok: true as const, data: { defectCodes: loadDefectCodes() } };
}

export function getRepairCodes() {
  return { ok: true as const, data: { repairCodes: loadRepairCodes() } };
}

export function getLocations() {
  return { ok: true as const, data: { locations: loadLocations() } };
}

export function getRoutingSettings() {
  return { ok: true as const, data: { routings: loadRoutingSettings() } };
}

export function getSignoffTypes() {
  return { ok: true as const, data: { types: loadSignoffTypes() } };
}

export function getSignoffForms() {
  return { ok: true as const, data: { forms: getStepFieldConfig() } };
}
