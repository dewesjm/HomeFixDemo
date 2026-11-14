import type { OperationParam, ServiceOperation } from '../../../../../shared/service-tester-panel/service-operation';
import type { ProcedureKey } from '../../../procedure-service/procedure-record';
import {
  getAllGwpOptions, getFillerMetalSizeOptions, getFillerMetalTypeOptions, getGwpDescription, getGwpDetails,
  getGwpOptions, getProcedureOverride, getRequiredQuals, getWtnDescription, getWtnFillValue, getWtnOptions,
  hasProcedure, WTN_FILL_FIELDS,
} from '../../../procedure-service/procedure-usage';

export function procedureUsageOperations(example: ProcedureKey): ServiceOperation[] {
  const gwp: OperationParam = { name: 'gwp', label: 'GWP', type: 'text', required: true, example: example.gwp };
  const wtn: OperationParam = { name: 'wtn', label: 'WTN', type: 'text', required: true, example: example.wtn };
  const key = [gwp, wtn];
  const materials: OperationParam[] = [
    { name: 'materialType1', label: 'Material Type 1', type: 'text', required: true, example: '02-CS' },
    { name: 'materialType2', label: 'Material Type 2', type: 'text', required: true, example: '02-CS' },
  ];
  const field: OperationParam = {
    name: 'field', label: 'Field key', type: 'select', required: true,
    options: WTN_FILL_FIELDS.map(f => f.key), example: 'weldProcess',
  };

  function read(
    name: string, description: string, params: OperationParam[], fn: (...args: string[]) => unknown,
  ): ServiceOperation {
    return {
      name, signature: `${name}(${params.map(p => p.name).join(', ')})`, description, params, writes: false,
      call: inputs => params.map(p => inputs[p.name]),
      fn,
    };
  }

  return [
    read('getGwpOptions', 'Lists GWPs that match the ordered pair of material types.', materials, getGwpOptions),
    read('getAllGwpOptions', 'Lists every GWP for Foreman Override.', [], getAllGwpOptions),
    read('getGwpDetails', 'Returns the GWP’s process and materials plus the filler types from all of its WTNs.', [gwp], getGwpDetails),
    read('getGwpDescription', 'Describes the GWP from its first WTN, leaving out filler.', [gwp], getGwpDescription),
    read('getWtnOptions', 'Lists the WTNs and their descriptions for a GWP.', [gwp], getWtnOptions),
    read('getWtnDescription', 'Describes the selected WTN, including filler when present.', key, getWtnDescription),
    read('hasProcedure', 'Checks whether the GWP and WTN identify a stored procedure.', key, hasProcedure),
    read('getProcedureOverride', 'Returns the WTN’s override limits and note, or null when absent.', key, getProcedureOverride),
    read('getRequiredQuals', 'Returns the WTN’s welder qualification requirements. An empty group has no requirements.', key, getRequiredQuals),
    read('getWtnFillValue', 'Returns the value used to fill a routing field from the WTN.', [...key, field], getWtnFillValue),
    read('getFillerMetalTypeOptions', 'Lists the filler metal types allowed by the WTN.', key, getFillerMetalTypeOptions),
    read('getFillerMetalSizeOptions', 'Lists the filler metal sizes allowed by the WTN.', key, getFillerMetalSizeOptions),
  ];
}
