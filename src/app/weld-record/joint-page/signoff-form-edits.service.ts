/* What happens when a value changes on the joint page's sign-off form, before Signoff is pressed: the
   value is saved to the step, fields it hides are blanked, fill rules and the WPS cascade run, and the
   field's red message is updated (SignoffFormErrorsService). Covers the step's fields, its sign-off
   fields, Affected Item, Type and SAT/UNSAT. The rules themselves are in rules/ and
   signoff-definition/. Provided by JointPageComponent, one per joint page. */
import { Injectable, WritableSignal, inject } from '@angular/core';
import { Job } from '../../data/jobs';
import { JobWorkflow, SignoffField, StageField, StageResult, WorkflowStage } from '../model/workflow-types';
import { RoutingService } from '../services/routing.service';
import { SignoffService } from '../services/signoff.service';
import { WeldAssignmentService } from '../services/weld-assignment.service';
import { isAssignedStage } from '../../data/weld-assignment';
import { inspectionProcedureOptions } from '../../data/inspection-procedures';
import { show } from '../signoff-definition/stage-display';
import { fillChanges } from '../signoff-definition/field-fill';
import { REQUIREMENT_KEYS, hiddenFieldsWithValues } from './rules/stage-form';
import { selectChangeCascade, typedRequirementChanges } from './rules/weld-cascade';
import { typeChange } from './rules/type-change';
import { JointOverridesService } from './joint-overrides.service';
import { SignoffFormErrorsService } from './signoff-form-errors.service';

/* what the page hands over: its joint and live workflow */
interface SignoffFormEditsSource {
  job: Job;
  wf: WritableSignal<JobWorkflow>;
}

@Injectable()
export class SignoffFormEditsService {
  private wfService = inject(RoutingService);
  private signoffService = inject(SignoffService);
  private weldAssignment = inject(WeldAssignmentService);
  private overrides = inject(JointOverridesService);
  private errors = inject(SignoffFormErrorsService);

  private src: SignoffFormEditsSource | null = null;

  init(src: SignoffFormEditsSource) { this.src = src; }

  /* ── The step's fields ── */

  private setInput(stage: WorkflowStage, key: string, value: string) {
    const field = stage.fields.find(f => f.key === key);
    if (this.src && field) this.wfService.setStageInput(this.src.job, stage.id, field, value);
  }

  /* blank any dependent field whose trigger no longer matches */
  private clearHidden(stage: WorkflowStage) {
    if (!this.src) return;
    const hidden = hiddenFieldsWithValues(stage);
    if (hidden.length) this.wfService.setStageInputs(this.src.job, stage.id, hidden.map(field => ({ field, value: '' })));
  }

  /* a typed field lost focus */
  stageInputBlur(stage: WorkflowStage, field: StageField, value: string) {
    if (stage.engineeringEntry && REQUIREMENT_KEYS.has(field.key)) {
      this.typedRequirementBlur(stage, field, value);
      return;
    }
    if (this.src && value !== (stage.inputs[field.key] ?? '')) {
      const job = this.src.job;
      this.overrides.engineeringEdit(stage, field, value, () => {
        this.wfService.setStageInput(job, stage.id, field, value);
        this.clearHidden(stage);
        this.applyFills(stage);
      });
    }
    this.errors.afterBlur(stage, field);
    /* clear required error if now filled */
    if (field.required && value && this.errors.fieldError(stage.id, field.key)?.endsWith('is required')) {
      this.errors.clearFieldError(stage.id, field.key);
    }
  }

  /* a typed PH/IP requirement (engineering override); see typedRequirementChanges */
  private typedRequirementBlur(stage: WorkflowStage, field: StageField, raw: string) {
    if (!this.src) return;
    const changes = typedRequirementChanges(stage, field, raw);
    if (changes.length) {
      const job = this.src.job;
      this.overrides.engineeringEdit(stage, field, changes[0].value, () => {
        this.wfService.setStageInputs(job, stage.id, changes);
        this.applyFills(stage);
      });
    }
    this.errors.afterBlur(stage, field);
  }

  /* select fields commit on change, clear maps to '' */
  stageSelectChange(stage: WorkflowStage, field: StageField, value: string | null) {
    const v = value ?? '';
    if (this.src && v !== (stage.inputs[field.key] ?? '')) {
      const { changes, matchedProc } = selectChangeCascade(stage, field, v, this.overrides.offListUnlocked(stage));
      const job = this.src.job;
      this.overrides.engineeringEdit(stage, field, v, () => {
        this.wfService.setStageInputs(job, stage.id, changes);
        this.applyFills(stage);
      });
      this.clearHidden(stage);
      /* the WTN filled in Weld Process */
      if (field.key === 'wtn' && matchedProc) this.errors.clearFieldError(stage.id, 'weldProcess');
    }
    this.errors.afterSelect(stage.id, field.key);
  }

  toggleAffectedItem(stage: WorkflowStage, item: string, event: Event) {
    if (!this.src) return;
    const checked = (event.target as HTMLInputElement).checked;
    const raw = stage.inputs['affectedItems'] ?? '';
    const current = raw ? raw.split(',') : [];
    const next = checked ? [...current, item] : current.filter(i => i !== item);
    if (next.length) this.errors.clearFieldError(stage.id, 'affectedItem');
    this.wfService.setStageInput(this.src.job, stage.id, { key: 'affectedItems', type: 'text' } as StageField, next.join(','));
  }

  /* "Only Consumable Insert used as filler": the filler fields' fill rule follows it (applyFills) */
  onConsumableInsertChange(stage: WorkflowStage, value: string) {
    this.setInput(stage, 'consumableInsertOnly', value);
    this.applyFills(stage);
  }

  /* Fields prepopulated from another value (Admin > Signoff Type Definition, field-fill.ts) after a
     change on the step: copied in when their rule starts holding or its source changes, blanked when
     it stops. Blanked ones get the external system's values back, unless a Foreman Override or
     engineering override has the step. */
  private applyFills(before: WorkflowStage) {
    if (!this.src) return;
    const { job, wf } = this.src;
    const stages = wf().stages;
    const after = stages.find(s => s.id === before.id);
    if (!after) return;
    const { values, released } = fillChanges(before, after, stages);
    const changes = Object.entries(values).flatMap(([key, value]) => {
      const field = after.fields.find(f => f.key === key);
      return field ? [{ field, value }] : [];
    });
    if (changes.length) this.wfService.setStageInputs(job, after.id, changes);
    if (released.length && isAssignedStage(after) && !this.overrides.offListUnlocked(after) && !after.engineeringEntry) {
      this.weldAssignment.apply(job, after.id);
    }
  }

  /* ── Type, SAT/UNSAT and the sign-off fields ── */

  /* Type: both stored values change; a Type that loads another definition swaps the step's fields
     (typeChange), is recorded in History, and a welding form gets its assignment. A procedure not
     designated for the new Type is cleared. */
  setType(stage: WorkflowStage, value: string) {
    if (!this.src) return;
    const { job, wf } = this.src;
    if (value) this.errors.clearFieldError(stage.id, '__inspectionType');
    const { patch, swapsDefinition } = typeChange(job.trade, stage, value);
    if (swapsDefinition) {
      this.signoffService.updateStageSignoff(job, stage.id, patch, { action: `${stage.label} - Type changed to ${value}` });
      if (isAssignedStage({ ...stage, ...patch })) this.weldAssignment.apply(job, stage.id);
    } else {
      wf.update(w => ({ ...w, stages: w.stages.map(s => s.id === stage.id ? { ...s, ...patch } : s) }));
    }
    const proc = stage.inputs['procedureUsed'] ?? '';
    if (proc && !inspectionProcedureOptions(value).some(o => o.value === proc)) this.setInput(stage, 'procedureUsed', '');
  }

  setStageResult(stage: WorkflowStage, result: StageResult) {
    if (!this.src || result === stage.result) return;
    this.errors.clearFieldError(stage.id, '__decision');
    const old = stage.result;
    this.signoffService.updateStageSignoff(this.src.job, stage.id, { result },
      { action: `${stage.label} - ${stage.decisionLabel || 'Decision'}`, from: old ? old.toUpperCase() : '-', to: result.toUpperCase() });
  }

  /* a sign-off field's new value (text blur, select or checkbox); a value clears that field's error */
  setSignoffInput(stage: WorkflowStage, field: SignoffField, value: string, clearsError = true) {
    if (!this.src) return;
    if (clearsError && value) this.errors.clearFieldError(stage.id, field.key);
    const prev = stage.signoffInputs[field.key] ?? '';
    if (value === prev) return;
    this.signoffService.updateStageSignoff(this.src.job, stage.id,
      { signoffInputs: { ...stage.signoffInputs, [field.key]: value } },
      { action: `${stage.label} - ${field.label}`, from: show(prev), to: show(value) });
  }
}
