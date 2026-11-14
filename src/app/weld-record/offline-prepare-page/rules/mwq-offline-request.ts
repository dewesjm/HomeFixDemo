import { isOfflineJointKey, type OfflineJointKey } from '../../offline-logic/offline-joint-key';

export interface MwqOfflineRequest {
  type: 'ewr-offline-prepare';
  requestId: string;
  joints: OfflineJointKey[];
}

export function isMwqOfflineRequest(value: unknown): value is MwqOfflineRequest {
  if (!value || typeof value !== 'object') return false;
  const request = value as Record<string, unknown>;
  return request['type'] === 'ewr-offline-prepare'
    && typeof request['requestId'] === 'string'
    && request['requestId'].trim().length > 0
    && Array.isArray(request['joints'])
    && request['joints'].length > 0
    && request['joints'].every(isOfflineJointKey);
}
