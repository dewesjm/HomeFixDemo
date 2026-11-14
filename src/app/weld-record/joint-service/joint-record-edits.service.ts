import { inject, Injectable } from '@angular/core';
import { ViewerService } from '../access-logic/viewer.service';
import type { Reference } from '../model/workflow-types';
import { ReferenceService } from '../services/reference.service';
import { SignoffService } from '../services/signoff.service';
import { WorkflowStore } from '../services/workflow-store.service';
import { isUserEditable } from '../signoff-forms-logic/field-locks';
import { fieldsShown, visibleSignoffFields } from '../signoff-forms-logic/shown-fields';
import { isRoutingLockedField } from '../signoff-forms-logic/stage-rules';
import { findJoint, type JointKey, type JointResult } from './joint-service';

type Correction = { inputs?: Record<string, string>; signoffInputs?: Record<string, string> };
const fail = (title: string, error: string) => ({ ok: false as const, title, error });
const denied = () => fail('Access denied', 'This action requires permission to edit completed workflow records.');
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

@Injectable({ providedIn: 'root' })
export class JointRecordEditsService {
  private readonly viewer = inject(ViewerService);
  private readonly store = inject(WorkflowStore);
  private readonly signoff = inject(SignoffService);
  private readonly references = inject(ReferenceService);

  correctRouting(key: JointKey, routingId: string, changes: unknown, reason: string): JointResult<{ routingId: string }> {
    if (!this.viewer.canUseLegacyWorkflowActions()) return denied();
    const found = findJoint(key);
    if (!found.ok) return found;
    if (!reason.trim()) return fail('Reason required', 'Enter a correction reason.');
    const job = found.data;
    const wf = this.store.workflowFor(job)();
    const stage = wf.stages.find(candidate => candidate.id === routingId && candidate.signed);
    if (!stage) return fail('Wrong routing', 'Choose a signed routing.');
    if (!isRecord(changes) || Object.keys(changes).some(key => key !== 'inputs' && key !== 'signoffInputs')) {
      return fail('Invalid changes', 'Use inputs and signoffInputs to group the fields to correct.');
    }
    const allowed = {
      inputs: fieldsShown(stage, job, wf.stages, wf.fabricationData).filter(field => isUserEditable(stage, field)),
      signoffInputs: visibleSignoffFields(stage, job, wf.fabricationData).filter(field => !field.disabled),
    };
    const patch: Correction = {};
    for (const group of ['inputs', 'signoffInputs'] as const) {
      const values = changes[group];
      if (values === undefined) continue;
      if (!isRecord(values)) return fail('Invalid changes', 'Each field group must be an object.');
      const edits: [string, string][] = [];
      for (const [field, value] of Object.entries(values)) {
        if (typeof value !== 'string' || isRoutingLockedField(routingId, field) || !allowed[group].some(f => f.key === field)) {
          return fail('Invalid field', `Cannot correct ${field} in ${group}. Use editable fields and string values.`);
        }
        if ((stage[group][field] ?? '') !== value) edits.push([field, value]);
      }
      patch[group] = Object.fromEntries(edits);
    }
    if (!Object.values(patch).some(group => Object.keys(group).length)) {
      return fail('No changes', 'Enter at least one changed field.');
    }
    this.signoff.correctStage(job, routingId, patch, reason.trim());
    return { ok: true, data: { routingId } };
  }

  addReference(key: JointKey, name: string): JointResult<{ references: Reference[] }> {
    if (!this.viewer.canUseLegacyWorkflowActions()) return denied();
    const found = findJoint(key);
    if (!found.ok) return found;
    if (!name.trim()) return fail('Name required', 'Enter the reference file name.');
    this.references.addReference(found.data, name.trim());
    return { ok: true, data: { references: [...this.store.workflowFor(found.data)().references] } };
  }

  removeReference(key: JointKey, id: string): JointResult<{ references: Reference[] }> {
    if (!this.viewer.canUseLegacyWorkflowActions()) return denied();
    const found = findJoint(key);
    if (!found.ok) return found;
    const workflow = this.store.workflowFor(found.data);
    if (!workflow().references.some(reference => reference.id === id)) {
      return fail('Not found', 'This joint has no reference with that ID.');
    }
    this.references.removeReference(found.data, id);
    return { ok: true, data: { references: [...workflow().references] } };
  }
}
