/* Weld Record's calls that change a joint's recorded values, named by joint key (joint-lookup.ts):
     correctRouting(key, routingId, changes, reason) = corrects editable answers on a signed routing;
     setFabricationData(key, field, value)           = one Fabrication field, while it's editable;
     addReference(key, name) / removeReference(key, id) = the References panel's file names.
   The Correct dialog uses correctRouting and Joint Details uses setFabricationData; the References
   panel still calls ReferenceService directly. Each answers { ok: true, data } or
   { ok: false, error, title } (jointFailure), never throws. */
import { inject, Injectable } from '@angular/core';
import { ViewerService } from '../access-logic/viewer.service';
import type { Reference } from '../model/workflow-types';
import { ReferenceService } from '../services/reference.service';
import { FabricationDataService } from '../services/fabrication-data.service';
import { fabricationFieldsShown } from '../fabrication-logic/fabrication-form';
import { fabricationEditable } from '../routing-logic/current-routing';
import { SignoffService } from '../services/signoff.service';
import { WorkflowStore } from '../services/workflow-store.service';
import { isUserEditable } from '../signoff-forms-logic/field-locks';
import { fieldsShown, visibleSignoffFields } from '../signoff-forms-logic/shown-fields';
import { isRoutingLockedField } from '../signoff-forms-logic/stage-rules';
import { findJoint, jointFailure, type JointKey, type JointResult } from '../joint-link-logic/joint-lookup';

type Correction = { inputs?: Record<string, string>; signoffInputs?: Record<string, string> };
const denied = () => jointFailure('This action requires permission to edit completed workflow records.', 'Access denied');
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

@Injectable({ providedIn: 'root' })
export class JointRecordEditsService {
  private readonly viewer = inject(ViewerService);
  private readonly store = inject(WorkflowStore);
  private readonly signoff = inject(SignoffService);
  private readonly references = inject(ReferenceService);
  private readonly fabrication = inject(FabricationDataService);

  correctRouting(key: JointKey, routingId: string, changes: unknown, reason: string): JointResult<{ routingId: string }> {
    if (!this.viewer.canUseLegacyWorkflowActions()) return denied();
    const found = findJoint(key);
    if (!found.ok) return found;
    if (!reason.trim()) return jointFailure('Enter a correction reason.', 'Reason required');
    const job = found.data;
    const wf = this.store.workflowFor(job)();
    const stage = wf.stages.find(candidate => candidate.id === routingId && candidate.signed);
    if (!stage) return jointFailure('Choose a signed routing.', 'Wrong routing');
    if (!isRecord(changes) || Object.keys(changes).some(key => key !== 'inputs' && key !== 'signoffInputs')) {
      return jointFailure('Use inputs and signoffInputs to group the fields to correct.', 'Invalid changes');
    }
    const allowed = {
      inputs: fieldsShown(stage, job, wf.stages, wf.fabricationData).filter(field => isUserEditable(stage, field)),
      signoffInputs: visibleSignoffFields(stage, job, wf.fabricationData).filter(field => !field.disabled),
    };
    const patch: Correction = {};
    for (const group of ['inputs', 'signoffInputs'] as const) {
      const values = changes[group];
      if (values === undefined) continue;
      if (!isRecord(values)) return jointFailure('Each field group must be an object.', 'Invalid changes');
      const edits: [string, string][] = [];
      for (const [field, value] of Object.entries(values)) {
        if (typeof value !== 'string' || isRoutingLockedField(routingId, field) || !allowed[group].some(f => f.key === field)) {
          return jointFailure(`Cannot correct ${field} in ${group}. Use editable fields and string values.`, 'Invalid field');
        }
        if ((stage[group][field] ?? '') !== value) edits.push([field, value]);
      }
      patch[group] = Object.fromEntries(edits);
    }
    if (!Object.values(patch).some(group => Object.keys(group).length)) {
      return jointFailure('Enter at least one changed field.', 'No changes');
    }
    this.signoff.correctStage(job, routingId, patch, reason.trim());
    return { ok: true, data: { routingId } };
  }

  addReference(key: JointKey, name: string): JointResult<{ references: Reference[] }> {
    if (!this.viewer.canUseLegacyWorkflowActions()) return denied();
    const found = findJoint(key);
    if (!found.ok) return found;
    if (!name.trim()) return jointFailure('Enter the reference file name.', 'Name required');
    this.references.addReference(found.data, name.trim());
    return { ok: true, data: { references: [...this.store.workflowFor(found.data)().references] } };
  }

  removeReference(key: JointKey, id: string): JointResult<{ references: Reference[] }> {
    if (!this.viewer.canUseLegacyWorkflowActions()) return denied();
    const found = findJoint(key);
    if (!found.ok) return found;
    const workflow = this.store.workflowFor(found.data);
    if (!workflow().references.some(reference => reference.id === id)) {
      return jointFailure('This joint has no reference with that ID.', 'Not found');
    }
    this.references.removeReference(found.data, id);
    return { ok: true, data: { references: [...workflow().references] } };
  }

  setFabricationData(key: JointKey, field: string, value: string): JointResult<{ fabricationData: Record<string, string> }> {
    if (!this.viewer.canEditFabrication()) {
      return jointFailure('Editing fabrication data requires the Edit fabrication fields permission.', 'Access denied');
    }
    const found = findJoint(key);
    if (!found.ok) return found;
    const job = found.data;
    const workflow = this.store.workflowFor(job);
    const current = workflow();
    if (!fabricationEditable(current.stages)) {
      return jointFailure('Fabrication is locked at the current routing.', 'Wrong routing');
    }
    const input = fabricationFieldsShown(job, current.fabricationData).find(f => f.key === field);
    if (!input || input.notApplicable) {
      return jointFailure('Choose a fabrication field that applies to this joint.', 'Wrong field');
    }
    if (typeof value !== 'string' || (value && input.type === 'select' && !input.options?.some(o => o.value === value))) {
      return jointFailure('Enter text or a stored option value for the selected field.', 'Wrong value');
    }
    if (value !== (current.fabricationData[field] ?? '')) {
      this.fabrication.setFabricationData(job, field, value);
    }
    return { ok: true, data: { fabricationData: { ...workflow().fabricationData } } };
  }
}
