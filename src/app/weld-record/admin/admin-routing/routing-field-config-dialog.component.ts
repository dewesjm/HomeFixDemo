/* Admin > Routing Settings's Configure fields dialog: edit a step's reading fields and sign-off fields.
   SWITCHED OFF (AdminRoutingComponent.showFieldConfig): most Welding steps use hand-built layouts on
   the weld record, so field edits here don't reliably show up there. Kept working so it can be
   turned back on without a rewrite. */
import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideCheck, LucideX } from '@lucide/angular';
import { ToastService } from '../../../shared/toast.service';
import { Job } from '../../../data/jobs';
import { StageField, SignoffField, defaultSignoffFields, getTemplates, updateStageTemplate } from '../../../data/workflow';

/* lightweight row model for field config */
interface FieldRow {
  uid: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'radio';
  required: boolean;
  placeholder: string;
  unit: string;
  optionsText: string;   // "Label:value, Label:value"
}

function toFieldRow(f: StageField | SignoffField, idx: number): FieldRow {
  return {
    uid: `${idx}`,
    key: f.key,
    label: f.label,
    type: f.type,
    required: 'required' in f ? (f.required ?? false) : false,
    placeholder: f.placeholder ?? ('placeholder' in f ? f.placeholder ?? '' : ''),
    unit: 'unit' in f ? (f as any).unit ?? '' : '',
    optionsText: f.options?.map(o => `${o.label}:${o.value}`).join(', ') ?? '',
  };
}

function fieldRowToStageField(r: FieldRow): StageField {
  return {
    key: r.key, label: r.label, type: r.type, placeholder: r.placeholder || undefined,
    unit: r.unit || undefined,
    options: r.type === 'select' ? parseOptions(r.optionsText) : undefined,
  };
}

function fieldRowToSignoffField(r: FieldRow): SignoffField {
  return {
    key: r.key, label: r.label, type: r.type, required: r.required,
    placeholder: r.placeholder || undefined,
    options: r.type === 'select' ? parseOptions(r.optionsText) : undefined,
  };
}

function parseOptions(text: string): { label: string; value: string }[] | undefined {
  if (!text.trim()) return undefined;
  return text.split(',').map(pair => {
    const [label, value] = pair.trim().split(':');
    return { label: (label ?? pair).trim(), value: (value ?? label ?? pair).trim() };
  });
}

@Component({
  selector: 'app-routing-field-config-dialog',
  standalone: true,
  imports: [FormsModule, LucideCheck, LucideX],
  templateUrl: './routing-field-config-dialog.component.html'
})
export class RoutingFieldConfigDialogComponent implements OnInit {
  trade = input.required<Job['trade']>();
  stageId = input.required<string>();
  stageLabel = input.required<string>();
  closed = output<void>();

  private messages = inject(ToastService);

  readingFields = signal<FieldRow[]>([]);
  signoffFields = signal<FieldRow[]>([]);
  newReadingKey = signal('');
  newReadingLabel = signal('');
  newSignoffKey = signal('');
  newSignoffLabel = signal('');

  ngOnInit() {
    const stage = getTemplates()[this.trade()]?.find(t => t.id === this.stageId());
    this.readingFields.set((stage?.fields ?? []).map(toFieldRow));
    this.signoffFields.set((stage?.signoffFields ?? defaultSignoffFields()).map(toFieldRow));
  }

  /* reading fields */
  addReadingField() {
    const key = this.newReadingKey().trim();
    const label = this.newReadingLabel().trim() || key;
    if (!key) return;
    this.readingFields.update(f => [...f, { uid: `${Date.now()}`, key, label, type: 'text', required: false, placeholder: '', unit: '', optionsText: '' }]);
    this.newReadingKey.set('');
    this.newReadingLabel.set('');
  }
  removeReadingField(uid: string) {
    this.readingFields.update(f => f.filter(x => x.uid !== uid));
  }
  updateReadingField(uid: string, patch: Partial<FieldRow>) {
    this.readingFields.update(f => f.map(x => x.uid === uid ? { ...x, ...patch } : x));
  }

  /* signoff fields */
  addSignoffField() {
    const key = this.newSignoffKey().trim();
    const label = this.newSignoffLabel().trim() || key;
    if (!key) return;
    this.signoffFields.update(f => [...f, { uid: `${Date.now()}`, key, label, type: 'text', required: false, placeholder: '', unit: '', optionsText: '' }]);
    this.newSignoffKey.set('');
    this.newSignoffLabel.set('');
  }
  removeSignoffField(uid: string) {
    this.signoffFields.update(f => f.filter(x => x.uid !== uid));
  }
  updateSignoffField(uid: string, patch: Partial<FieldRow>) {
    this.signoffFields.update(f => f.map(x => x.uid === uid ? { ...x, ...patch } : x));
  }

  saveFieldConfig() {
    updateStageTemplate(this.trade(), this.stageId(), {
      fields: this.readingFields().map(fieldRowToStageField),
      signoffFields: this.signoffFields().map(fieldRowToSignoffField),
    });
    this.closed.emit();
    this.messages.add({ severity: 'success', summary: 'Fields saved', life: 3000 });
  }
}
