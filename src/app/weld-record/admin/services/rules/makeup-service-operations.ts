import type { OperationParam, ServiceOperation } from '../../../../shared/service-tester-panel/service-operation';
import type { MakeupService } from '../../../services/makeup.service';
import { makeupDate } from '../../../makeup-logic/makeup-rules';

export function makeupServiceOperations(service: MakeupService): ServiceOperation[] {
  const id: OperationParam = { name: 'id', label: 'Grant ID', type: 'text', required: true, example: 'mk-demo' };
  const personId: OperationParam = { name: 'personId', label: 'Person ID', type: 'text', required: true, example: 'E10238' };
  const today = makeupDate();
  const dates: OperationParam[] = [
    { name: 'startDate', label: 'Start date', type: 'text', required: true, example: today },
    { name: 'endDate', label: 'End date', type: 'text', required: true, example: today },
  ];
  return [
    {
      name: 'getMakeupGrants', signature: 'getMakeupGrants()',
      description: 'Lists the signed-in foreman’s Makeup grants.',
      writes: false, params: [], call: () => [], fn: () => service.getMakeupGrants(),
    },
    {
      name: 'addMakeupGrant', signature: 'addMakeupGrant(personId, startDate, endDate)',
      description: 'Grants a fitter or welder temporary permission to sign for the signed-in foreman.',
      writes: true, params: [personId, ...dates],
      call: args => [args['personId'], args['startDate'], args['endDate']],
      fn: (personId, startDate, endDate) => service.addMakeupGrant(personId, startDate, endDate),
    },
    {
      name: 'updateMakeupGrant', signature: 'updateMakeupGrant(id, startDate, endDate)',
      description: 'Changes the dates of a grant issued by the signed-in foreman.',
      writes: true, params: [id, ...dates],
      call: args => [args['id'], args['startDate'], args['endDate']],
      fn: (id, startDate, endDate) => service.updateMakeupGrant(id, startDate, endDate),
    },
    {
      name: 'revokeMakeupGrant', signature: 'revokeMakeupGrant(id)',
      description: 'Revokes a grant issued by the signed-in foreman.',
      writes: true, params: [id], call: args => [args['id']], fn: id => service.revokeMakeupGrant(id),
    },
  ];
}
