import { Injectable, NgZone, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { saveOfflineJoint } from '../../data/offline-joints';
import { ViewerService } from '../access-logic/viewer.service';
import { findJoint } from '../joint-link-logic/joint-lookup';
import { currentRoutingLabel } from '../routing-logic/current-routing';
import { WorkflowStore } from '../services/workflow-store.service';
import { verifyOfflineAppCache } from './offline-app-cache';
import { isOfflineJointKey, type OfflineJointKey } from './offline-joint-key';

type OfflineJointResult =
  | { key: OfflineJointKey; ready: true; url: string }
  | { key: OfflineJointKey; ready: false; error: string };

export interface OfflinePreparationResult {
  ready: boolean;
  joints: OfflineJointResult[];
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class OfflinePreparationService {
  private readonly viewer = inject(ViewerService);
  private readonly store = inject(WorkflowStore);
  private readonly updates = inject(SwUpdate);
  private readonly zone = inject(NgZone);

  async prepareOffline(joints: unknown): Promise<OfflinePreparationResult> {
    if (!this.viewer.canViewJoint()) return { ready: false, joints: [], error: 'Joint Details is unavailable for this viewer.' };
    if (!this.updates.isEnabled) return { ready: false, joints: [], error: 'Use a production build to prepare offline work.' };
    if (!Array.isArray(joints) || !joints.length || !joints.every(isOfflineJointKey)) {
      return { ready: false, joints: [], error: 'Supply at least one joint with hull, drawing and joint.' };
    }

    try {
      await this.zone.runOutsideAngular(verifyOfflineAppCache);
    } catch (error) {
      return {
        ready: false, joints: [],
        error: error instanceof Error && error.name !== 'TimeoutError'
          ? error.message : 'Timed out waiting for the offline app cache. Reconnect and retry.',
      };
    }

    const results = joints.map(key => this.saveJoint(key));
    return { ready: results.every(result => result.ready), joints: results };
  }

  private saveJoint(key: OfflineJointKey): OfflineJointResult {
    const found = findJoint({ hull: key.hull, drawing: key.drawing, joint: key.joint });
    if (!found.ok) return { key, ready: false, error: found.error };
    const job = found.data;
    try {
      saveOfflineJoint({ job, currentRouting: currentRoutingLabel(this.store.workflowFor(job)().stages) });
      const path = ['offline', 'joints', job.hull, job.drawing, job.joint].map(encodeURIComponent).join('/');
      return { key, ready: true, url: new URL(path, document.baseURI).href };
    } catch {
      return { key, ready: false, error: 'Could not save Joint Details on this device.' };
    }
  }
}
