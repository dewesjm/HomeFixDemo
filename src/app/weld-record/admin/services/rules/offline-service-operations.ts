import type { ServiceOperation } from '../../../../shared/service-tester-panel/service-operation';
import type { OfflineJointKey } from '../../../offline-logic/offline-joint-key';
import type { OfflinePreparationService } from '../../../offline-logic/offline-preparation.service';

export function offlineServiceOperations(service: OfflinePreparationService, example: OfflineJointKey): ServiceOperation[] {
  const { hull, drawing, joint } = example;
  return [{
    name: 'prepareOffline',
    signature: 'prepareOffline(joints)',
    description: 'Checks the app cache and saves read-only Joint Details on this device. Returns readiness and a link or error for each joint.',
    writes: true,
    params: [{
      name: 'joints', label: 'Joint keys', type: 'json', required: true,
      example: JSON.stringify([{ hull, drawing, joint }]),
    }],
    call: inputs => [inputs['joints']],
    fn: joints => service.prepareOffline(joints),
  }];
}
