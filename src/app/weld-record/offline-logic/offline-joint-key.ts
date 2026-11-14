export interface OfflineJointKey {
  hull: string;
  drawing: string;
  joint: string;
}

export function isOfflineJointKey(value: unknown): value is OfflineJointKey {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return ['hull', 'drawing', 'joint'].every(field => {
    const key = record[field];
    return typeof key === 'string' && key.trim().length > 0;
  });
}
