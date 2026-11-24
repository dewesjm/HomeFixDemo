import type { ServiceOperation } from '../../../../shared/service-tester-panel/service-operation';
import {
  getDefectCodes, getLocations, getQualifications, getRepairCodes, getRoutingSettings,
  getSignoffForms, getSignoffTypes, getWeldPositions,
} from '../../../reference-data-service/reference-data-service';
import { JOINT_TYPES, JointType } from '../../../../data/jobs';

function read(name: string, description: string, fn: () => unknown): ServiceOperation {
  return { name, signature: name + '()', description, writes: false, params: [], call: () => [], fn };
}

/* a read of a per-joint-type settings table (Routing Settings, Signoff Types, Signoff Type Forms) */
function readForJointType(name: string, description: string, fn: (jointType: JointType) => unknown): ServiceOperation {
  return {
    name, signature: name + '(jointType)', description, writes: false,
    params: [{ name: 'jointType', label: 'Joint type', type: 'select', required: true, options: [...JOINT_TYPES], example: 'pipe' }],
    call: a => [a['jointType']], fn,
  };
}

export const referenceDataServiceOperations: ServiceOperation[] = [
  read('getDefectCodes', 'Saved defect codes and their inspection types.', getDefectCodes),
  read('getRepairCodes', 'Saved Repair choices and their active status.', getRepairCodes),
  read('getLocations', 'Fabrication locations and their Shipboard flags.', getLocations),
  readForJointType('getRoutingSettings', 'One joint type\'s configured routing definitions and destination rules.', getRoutingSettings),
  readForJointType('getSignoffTypes', 'One joint type\'s configured Signoff Types and their settings.', getSignoffTypes),
  readForJointType('getSignoffForms', 'One joint type\'s configured Signoff Type form fields, conditions, and layout.', getSignoffForms),
  read('getWeldPositions', 'Saved weld position codes and descriptions, including inactive positions and their status.', getWeldPositions),
  read('getQualifications', 'Qualification codes available for procedure requirements.', getQualifications),
];
