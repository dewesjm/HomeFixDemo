/* Work History — "Correct" a signed stage's already-recorded field values in place, with a
   required reason, instead of reopening it (see SignoffService.correctStage()). Fields that fed a
   routing decision at the original signoff are shown disabled with an explanation, never editable
   here — see ROUTING_LOCKED_FIELD_KEYS / [[project-correction-feature-fields]]. */
import { Component, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Job } from '../../data/jobs';
import { StageField, SignoffField, fieldsShown, isUserEditable, isRoutingLockedField } from '../../data/workflow';
import { WorkflowStore } from '../services/workflow-store.service';
import { SignoffService } from '../services/signoff.service';
import { AttachmentService } from '../services/attachment.service';
import { AttachmentsComponent } from '../attachments/attachments.component';
import { PersonSearchInputComponent } from '../../shared/person-search-input.component';

/* fields the live signoff panel already gives a person-search assist to (see workflow.ts's
   NDT_COMMON_FIELDS) -- Correct should offer the same help, not just a plain text box */
const PERSON_SEARCH_FIELDS = new Set(['probationaryInspector', 'oversightInspector']);

export interface CorrectTarget { job: Job; stageId: string }

@Component({
  selector: 'app-correct-stage-dialog',
  standalone: true,
  imports: [FormsModule, AttachmentsComponent, PersonSearchInputComponent],
  templateUrl: './correct-stage-dialog.component.html'
})
export class CorrectStageDialogComponent {
  private store = inject(WorkflowStore);
  private signoffSvc = inject(SignoffService);
  private attachmentSvc = inject(AttachmentService);

  target = input<CorrectTarget | null>(null);
  closed = output<void>();

  private dlg = viewChild<ElementRef<HTMLDialogElement>>('dlg');

  private wf = computed(() => {
    const t = this.target();
    return t ? this.store.workflowFor(t.job)() : null;
  });
  stage = computed(() => this.wf()?.stages.find(s => s.id === this.target()?.stageId) ?? null);
  attachments = computed(() => this.wf()?.attachments ?? []);

  fields = computed<StageField[]>(() => {
    const st = this.stage();
    return st ? fieldsShown(st).filter(f => isUserEditable(st, f)) : [];
  });
  signoffFields = computed<SignoffField[]>(() => this.stage()?.signoffFields ?? []);

  /* pending edits, keyed by field key; absent = unchanged from the stage's current value */
  private edits = signal<Record<string, string>>({});
  reason = signal('');

  constructor() {
    /* open/close the native dialog to match target(); reset the edit buffer each time it opens */
    effect(() => {
      const open = !!this.target();
      const el = this.dlg()?.nativeElement;
      if (!el) return;
      if (open && !el.open) { this.edits.set({}); this.reason.set(''); el.showModal(); }
      if (!open && el.open) el.close();
    });
  }

  isLocked(key: string): boolean {
    const t = this.target();
    return !!t && isRoutingLockedField(t.stageId, key);
  }

  isPersonField(key: string): boolean {
    return PERSON_SEARCH_FIELDS.has(key);
  }

  value(key: string, fromSignoff = false): string {
    const e = this.edits();
    if (key in e) return e[key];
    const st = this.stage();
    if (!st) return '';
    return (fromSignoff ? st.signoffInputs[key] : st.inputs[key]) ?? '';
  }

  setValue(key: string, v: string) {
    this.edits.update(e => ({ ...e, [key]: v }));
  }

  toggleCheckbox(key: string, checked: boolean) {
    this.setValue(key, checked ? 'yes' : '');
  }

  hasChanges = computed(() => {
    const st = this.stage();
    if (!st) return false;
    const e = this.edits();
    return [...this.fields(), ...this.signoffFields()].some(f => {
      if (!(f.key in e)) return false;
      const isSignoff = this.signoffFields().includes(f as SignoffField);
      const current = (isSignoff ? st.signoffInputs[f.key] : st.inputs[f.key]) ?? '';
      return e[f.key] !== current;
    });
  });

  canSave = computed(() => this.hasChanges() && this.reason().trim().length > 0);

  save() {
    const t = this.target();
    const st = this.stage();
    if (!t || !st || !this.canSave()) return;
    const e = this.edits();
    const inputs: Record<string, string> = {};
    const signoffInputs: Record<string, string> = {};
    for (const f of this.fields()) {
      if (f.key in e && e[f.key] !== (st.inputs[f.key] ?? '')) inputs[f.key] = e[f.key];
    }
    for (const f of this.signoffFields()) {
      if (f.key in e && e[f.key] !== (st.signoffInputs[f.key] ?? '')) signoffInputs[f.key] = e[f.key];
    }
    this.signoffSvc.correctStage(t.job, t.stageId, { inputs, signoffInputs }, this.reason().trim());
    this.close();
  }

  addAttachments(files: FileList) {
    const t = this.target();
    if (!t) return;
    for (const f of Array.from(files)) this.attachmentSvc.addAttachment(t.job, f.name);
  }

  removeAttachment(id: string) {
    const t = this.target();
    if (t) this.attachmentSvc.removeAttachment(t.job, id);
  }

  close() {
    this.closed.emit();
  }
}
