import type { ServiceOperation } from '../../../../shared/service-tester-panel/service-operation';
import {
  getDefectCodes, getLocations, getQualifications, getRepairCodes, getRoutingSettings,
  getSignoffForms, getSignoffTypes, getWeldPositions,
} from '../../../reference-data-service/reference-data-service';

function read(name: string, description: string, fn: () => unknown): ServiceOperation {
  return { name, signature: name + '()', description, writes: false, params: [], call: () => [], fn };
}

export const referenceDataServiceOperations: ServiceOperation[] = [
  read('getDefectCodes', 'Saved defect codes and their inspection types.', getDefectCodes),
  read('getRepairCodes', 'Saved Repair choices and their active status.', getRepairCodes),
  read('getLocations', 'Fabrication locations and their Shipboard flags.', getLocations),
  read('getRoutingSettings', 'Configured routing definitions and destination rules.', getRoutingSettings),
  read('getSignoffTypes', 'Configured Signoff Types and their settings.', getSignoffTypes),
  read('getSignoffForms', 'Configured Signoff Type form fields, conditions, and layout.', getSignoffForms),
  read('getWeldPositions', 'Saved weld position codes and descriptions, including inactive positions and their status.', getWeldPositions),
  read('getQualifications', 'Qualification codes available for procedure requirements.', getQualifications),
];
