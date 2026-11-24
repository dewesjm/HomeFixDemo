import { getWeldPositions as loadWeldPositions } from '../../data/weld-positions';
import { ALL_QUALS } from '../qualifications-logic/qualifications';
import { getDefectCodes as loadDefectCodes } from '../../data/defect-codes';
import { getRepairCodes as loadRepairCodes } from '../../data/repair-codes';
import { getLocations as loadLocations } from '../../data/locations';
import { loadRoutingSettings } from '../../data/routing-settings';
import { getSignoffTypes as loadSignoffTypes } from '../../data/signoff-types';
import { getStepFieldConfig } from '../../data/signoff-type-forms';
import type { JointType } from '../../data/jobs';

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

/* the per-joint-type settings tables: one joint type's rows */
export function getRoutingSettings(jointType: JointType) {
  return { ok: true as const, data: { routings: loadRoutingSettings(jointType) } };
}

export function getSignoffTypes(jointType: JointType) {
  return { ok: true as const, data: { types: loadSignoffTypes(jointType) } };
}

export function getSignoffForms(jointType: JointType) {
  return { ok: true as const, data: { forms: getStepFieldConfig(jointType) } };
}
