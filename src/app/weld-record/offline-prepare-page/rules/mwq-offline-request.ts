export const MWQ_SIMULATOR_ORIGIN = 'http://localhost:4322';

interface OfflineJointKey {
  hull: string;
  drawing: string;
  joint: string;
}

export interface MwqOfflineRequest {
  type: 'ewr-offline-prepare';
  requestId: string;
  joints: OfflineJointKey[];
}

function isJointKey(value: unknown): value is OfflineJointKey {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return ['hull', 'drawing', 'joint'].every(field => {
    const key = record[field];
    return typeof key === 'string' && key.trim().length > 0;
  });
}

export function isMwqOfflineRequest(value: unknown): value is MwqOfflineRequest {
  if (!value || typeof value !== 'object') return false;
  const request = value as Record<string, unknown>;
  return request['type'] === 'ewr-offline-prepare'
    && typeof request['requestId'] === 'string'
    && request['requestId'].trim().length > 0
    && Array.isArray(request['joints'])
    && request['joints'].length > 0
    && request['joints'].every(isJointKey);
}
