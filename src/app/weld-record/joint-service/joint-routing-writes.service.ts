import { inject, Injectable } from '@angular/core';
import { ViewerService } from '../access-logic/viewer.service';
import { activeStageId, currentRoutingLabel } from '../routing-logic/current-routing';
import { RoutingService } from '../services/routing.service';
import { WorkflowStore } from '../services/workflow-store.service';
import { findJoint, type JointKey, type JointResult } from './joint-service';

@Injectable({ providedIn: 'root' })
export class JointRoutingWritesService {
  private readonly viewer = inject(ViewerService);
  private readonly routing = inject(RoutingService);
  private readonly store = inject(WorkflowStore);

  deprogress(key: JointKey, reason: string): JointResult<{ routing: string }> {
    if (!this.viewer.canUseLegacyWorkflowActions()) {
      return { ok: false, title: 'Access denied', error: 'You do not have permission to deprogress joints.' };
    }
    const found = findJoint(key);
    if (!found.ok) return found;
    if (!reason.trim()) return { ok: false, title: 'Reason required', error: 'Enter a reason for Deprogress.' };
    if (!this.routing.deprogress(found.data, reason.trim())) {
      return { ok: false, title: 'No signoff to undo', error: 'This joint has no signoff that can be deprogressed.' };
    }
    return { ok: true, data: { routing: currentRoutingLabel(this.store.workflowFor(found.data)().stages) } };
  }

  setRouting(key: JointKey, routingId: string, reason: string): JointResult<{ routing: string }> {
    if (!this.viewer.canMaintainAdminTables()) {
      return { ok: false, title: 'Access denied', error: 'You do not have permission to override routing.' };
    }
    const found = findJoint(key);
    if (!found.ok) return found;
    if (!reason.trim()) return { ok: false, title: 'Reason required', error: 'Enter a reason for the Routing Override.' };
    const workflow = this.store.workflowFor(found.data);
    const { stages } = workflow();
    if (activeStageId(stages) === routingId || !stages.some(stage => stage.id === routingId && stage.required)) {
      return { ok: false, title: 'Invalid target', error: 'Choose a required routing other than the current routing.' };
    }
    this.routing.setRouting(found.data, routingId, reason.trim());
    return { ok: true, data: { routing: currentRoutingLabel(workflow().stages) } };
  }
}
