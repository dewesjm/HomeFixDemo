/* The sign-off form's red field messages on the joint page: set when a field loses focus, a droplist
   changes or Signoff is pressed, and cleared the moment the field is fixed. What counts as an error
   is rules/sign-validation.ts. Provided by JointPageComponent, so the messages last as long as the page. */
import { Injectable, signal } from '@angular/core';
import { Job } from '../../data/jobs';
import { JobWorkflow, StageField, WorkflowStage } from '../model/workflow-types';
import { ACTUAL_REQUIREMENT } from '../signoff-definition/weld-fields';
import { errorsAfterBlur, errorsAfterSelect } from './rules/sign-validation';

/* what the page hands over: its joint and live workflow */
interface SignoffFormErrorsSource {
  job: Job;
  wf: () => JobWorkflow;
}

@Injectable()
export class SignoffFormErrorsService {
  private src: SignoffFormErrorsSource | null = null;

  init(src: SignoffFormErrorsSource) { this.src = src; }

  /* key = `${stageId}:${fieldKey}` */
  private errors = signal<Record<string, string>>({});

  private liveStage(stageId: string): WorkflowStage | undefined {
    return this.src?.wf().stages.find(s => s.id === stageId);
  }

  fieldError(stageId: string, fieldKey: string): string | undefined {
    /* an actual set to NC by its requirement has nothing to check; drops an error left from an
       earlier Signoff attempt, before the WTN made it NC */
    if (fieldKey in ACTUAL_REQUIREMENT && this.liveStage(stageId)?.inputs[fieldKey] === 'NC') return undefined;
    return this.errors()[`${stageId}:${fieldKey}`];
  }

  /* clears one field's error the moment its value changes, so a red highlight from a failed
     signoff attempt (e.g. Fit-Up Insp's unchecked verification boxes) doesn't linger after it's fixed */
  clearFieldError(stageId: string, fieldKey: string) {
    const key = `${stageId}:${fieldKey}`;
    const prev = this.errors();
    if (!prev[key]) return;
    const next = { ...prev };
    delete next[key];
    this.errors.set(next);
  }

  /* a field lost focus: checks required + Actual Min/Max order on the live stage, since the stage a
     handler holds may be stale */
  afterBlur(stage: WorkflowStage, field: StageField) {
    this.errors.set(errorsAfterBlur(this.errors(), this.liveStage(stage.id), stage.id, field));
  }

  /* a droplist changed */
  afterSelect(stageId: string, fieldKey: string) {
    this.errors.set(errorsAfterSelect(this.errors(), this.liveStage(stageId), this.src?.job, stageId, fieldKey));
  }

  /* Signoff was pressed: shows every error at once and brings the first into view; true when there
     were any */
  showSigningErrors(errors: Record<string, string>): boolean {
    this.errors.set(errors);
    if (!Object.keys(errors).length) return false;
    setTimeout(() => {
      const err = document.querySelector('.signoff-panel .field-error');
      if (!err) return;
      err.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (err.parentElement?.querySelector('input, select') as HTMLElement | null)?.focus({ preventScroll: true });
    });
    return true;
  }
}
