import type { Job } from './jobs';
import { STORAGE } from './storage-keys';

type JointIdentity = Pick<Job, 'hull' | 'drawing' | 'joint'>;

export interface OfflineJoint {
  job: Job;
  currentRouting: string;
}

function storageKey({ hull, drawing, joint }: JointIdentity): string {
  return STORAGE.offlineJointPrefix + JSON.stringify([hull, drawing, joint]);
}

export function saveOfflineJoint(snapshot: OfflineJoint): void {
  const key = storageKey(snapshot.job);
  const data = JSON.stringify(snapshot);
  localStorage.setItem(key, data);
  if (localStorage.getItem(key) !== data) throw new Error('Joint data could not be read back.');
}

export function loadOfflineJoint(key: JointIdentity): OfflineJoint | null {
  try {
    const data = localStorage.getItem(storageKey(key));
    return data ? JSON.parse(data) as OfflineJoint : null;
  } catch {
    return null;
  }
}
