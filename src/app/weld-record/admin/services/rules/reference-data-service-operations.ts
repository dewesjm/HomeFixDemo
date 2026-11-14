import type { ServiceOperation } from '../../../../shared/service-tester-panel/service-operation';
import { getQualifications, getWeldPositions } from '../../../reference-data-service/reference-data-service';

export const referenceDataServiceOperations: ServiceOperation[] = [
  {
    name: 'getWeldPositions',
    signature: 'getWeldPositions()',
    description: 'Saved weld position codes and descriptions, including inactive positions and their status.',
    writes: false,
    params: [],
    call: () => [],
    fn: getWeldPositions,
  },
  {
    name: 'getQualifications',
    signature: 'getQualifications()',
    description: 'Qualification codes available for procedure requirements.',
    writes: false,
    params: [],
    call: () => [],
    fn: getQualifications,
  },
];
