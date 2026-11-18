/* Weld Record's routing calls, named by joint key (joint-lookup.ts), each with a required reason:
     deprogress(key, reason)            = undoes the latest signoff that can be undone;
     setRouting(key, routingId, reason) = Routing Override to a required routing.
   History, Joint Details, Admin > Routing Override and Admin > Services all use them. Each answers
   { ok: true, data } or { ok: false, error, title } (jointFailure), never throws. */
import { inject, Injectable } from '@angular/core';
import { ViewerService } from '../access-logic/viewer.service';
import { activeStageId, currentRoutingLabel } from '../routing-logic/current-routing';
import { RoutingService } from '../services/routing.service';
import { WorkflowStore } from '../services/workflow-store.service';
import { findJoint, jointFailure, type JointKey, type JointResult } from '../joint-link-logic/joint-lookup';

@Injectable({ providedIn: 'root' })
export class JointRoutingWritesService {
  private readonly viewer = inject(ViewerService);
  private readonly routing = inject(RoutingService);
  private readonly store = inject(WorkflowStore);

  deprogress(key: JointKey, reason: string): JointResult<{ routing: string }> {
    if (!this.viewer.canUseLegacyWorkflowActions()) {
      return jointFailure('You do not have permission to deprogress joints.', 'Access denied');
    }
    const found = findJoint(key);
    if (!found.ok) return found;
    if (!reason.trim()) return jointFailure('Enter a reason for Deprogress.', 'Reason required');
    if (!this.routing.deprogress(found.data, reason.trim())) {
      return jointFailure('This joint has no signoff that can be deprogressed.', 'No signoff to undo');
    }
    return { ok: true, data: { routing: currentRoutingLabel(this.store.workflowFor(found.data)().stages) } };
  }

  setRouting(key: JointKey, routingId: string, reason: string): JointResult<{ routing: string }> {
    if (!this.viewer.canMaintainAdminTables()) {
      return jointFailure('You do not have permission to override routing.', 'Access denied');
    }
    const found = findJoint(key);
    if (!found.ok) return found;
    if (!reason.trim()) return jointFailure('Enter a reason for the Routing Override.', 'Reason required');
    const workflow = this.store.workflowFor(found.data);
    const { stages } = workflow();
    if (activeStageId(stages) === routingId || !stages.some(stage => stage.id === routingId && stage.required)) {
      return jointFailure('Choose a required routing other than the current routing.', 'Invalid target');
    }
    this.routing.setRouting(found.data, routingId, reason.trim());
    return { ok: true, data: { routing: currentRoutingLabel(workflow().stages) } };
  }
}
