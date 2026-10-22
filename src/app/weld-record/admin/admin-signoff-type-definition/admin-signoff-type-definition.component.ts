/* Admin → Signoff Type Definition: toggle which catalog fields are active on each step.
   Stored in welding:step-field-config:v1 (step-field-config.ts). */
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ToastService } from '../../../shared/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import {
  DEFAULT_STEP_FIELD_ACTIVATIONS, StepFieldActivation,
  FIELD_CATALOG, SIGNOFF_FIELD_CATALOG,
  getActivationForStep, getStepFieldConfig, setStepFieldConfig, resetStepFieldConfig,
  getTemplates,
} from '../../../data/workflow';

interface StepOption {
  stepId: string;
  label: string;
}

interface FieldRow {
  key: string;
  label: string;
}

@Component({
  selector: 'app-admin-signoff-type-definition',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-signoff-type-definition.component.html',
})
export class AdminSignoffTypeDefinitionComponent {
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly steps: StepOption[];

  selectedStepId = signal('');
  availableFields: FieldRow[] = [];
  availableSignoffFields: FieldRow[] = [];

  activeFieldKeys = signal(new Set<string>());
  activeSignoffFieldKeys = signal(new Set<string>());

  /* snapshot of what was last saved / loaded — used to detect unsaved changes */
  private savedSnapshot = signal<{ fieldKeys: Set<string>; signoffKeys: Set<string> } | null>(null);

  isDirty = computed(() => {
    const snap = this.savedSnapshot();
    if (!snap) return false;
    const f = this.activeFieldKeys();
    const sf = this.activeSignoffFieldKeys();
    if (f.size !== snap.fieldKeys.size || sf.size !== snap.signoffKeys.size) return true;
    for (const k of f) if (!snap.fieldKeys.has(k)) return true;
    for (const k of sf) if (!snap.signoffKeys.has(k)) return true;
    return false;
  });

  constructor() {
    const labelMap = new Map<string, string>();
    const templates = getTemplates();
    for (const group of Object.values(templates)) {
      for (const s of group as { id: string; label: string; displayName?: string }[]) {
        labelMap.set(s.id, s.displayName || s.label);
      }
    }
    this.steps = DEFAULT_STEP_FIELD_ACTIVATIONS.map(a => ({
      stepId: a.stepId,
      label: labelMap.get(a.stepId) ?? a.stepId,
    }));
  }

  selectStep(stepId: string) {
    this.selectedStepId.set(stepId);
    if (!stepId) {
      this.availableFields = [];
      this.availableSignoffFields = [];
      this.savedSnapshot.set(null);
      return;
    }

    const defaultAct = DEFAULT_STEP_FIELD_ACTIVATIONS.find(a => a.stepId === stepId)!;
    this.availableFields = defaultAct.fields.map(act => ({
      key: act.key,
      label: FIELD_CATALOG.find(f => f.key === act.key)?.label ?? act.key,
    }));
    this.availableSignoffFields = defaultAct.signoffFields.map(act => ({
      key: act.key,
      label: SIGNOFF_FIELD_CATALOG.find(f => f.key === act.key)?.label ?? act.key,
    }));

    const current = getActivationForStep(stepId);
    const activeF = new Set(current.fields.map(f => f.key));
    const activeSF = new Set(current.signoffFields.map(f => f.key));
    this.activeFieldKeys.set(activeF);
    this.activeSignoffFieldKeys.set(activeSF);
    this.savedSnapshot.set({ fieldKeys: new Set(activeF), signoffKeys: new Set(activeSF) });
  }

  toggleField(key: string) {
    this.activeFieldKeys.update(s => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }

  toggleSignoffField(key: string) {
    this.activeSignoffFieldKeys.update(s => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }

  save() {
    const stepId = this.selectedStepId();
    const defaultAct = DEFAULT_STEP_FIELD_ACTIVATIONS.find(a => a.stepId === stepId);
    if (!defaultAct) return;

    /* preserve per-activation conditions (showIf, disabledIf, required) from the defaults */
    const newFields = defaultAct.fields.filter(f => this.activeFieldKeys().has(f.key));
    const newSignoffFields = defaultAct.signoffFields.filter(f => this.activeSignoffFieldKeys().has(f.key));
    const newActivation: StepFieldActivation = { stepId, fields: newFields, signoffFields: newSignoffFields };

    const full = getStepFieldConfig();
    const idx = full.findIndex(a => a.stepId === stepId);
    const updated = idx >= 0
      ? full.map((a, i) => i === idx ? newActivation : a)
      : [...full, newActivation];

    setStepFieldConfig(updated);
    this.savedSnapshot.set({
      fieldKeys: new Set(this.activeFieldKeys()),
      signoffKeys: new Set(this.activeSignoffFieldKeys()),
    });
    const label = this.steps.find(s => s.stepId === stepId)?.label ?? stepId;
    this.toast.add({ severity: 'success', summary: 'Saved', detail: label, life: 3000 });
  }

  discard() {
    const snap = this.savedSnapshot();
    if (snap) {
      this.activeFieldKeys.set(new Set(snap.fieldKeys));
      this.activeSignoffFieldKeys.set(new Set(snap.signoffKeys));
    }
  }

  resetToDefaults() {
    this.confirm.confirmDelete('all custom step field configuration', () => {
      resetStepFieldConfig();
      this.toast.add({ severity: 'info', summary: 'Reset to defaults', life: 3000 });
      /* reload active step if one is selected */
      const step = this.selectedStepId();
      if (step) this.selectStep(step);
    });
  }
}
