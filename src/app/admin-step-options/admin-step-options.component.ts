/* Admin → Step Options: manage per-stage dropdown options (e.g. Fit/Weld Build up, MT/PT) */
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2, LucideChevronUp, LucideChevronDown } from '@lucide/angular';

import { ToastService } from '../shared/toast.service';
import { getTemplates, setStageStepOptions, type StageOption } from '../data/workflow';

interface StageRow {
  uid: string;
  trade: string;
  stageId: string;
  stageLabel: string;
  options: StageOption[];
}

@Component({
  selector: 'app-admin-step-options',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2, LucideChevronUp, LucideChevronDown
  ],
  templateUrl: './admin-step-options.component.html'
})
export class AdminStepOptionsComponent {
  private messages = inject(ToastService);

  rows = signal<StageRow[]>(this.loadRows());
  editingUid = signal<string | null>(null);
  private cloned: Record<string, StageOption[]> = {};

  private loadRows(): StageRow[] {
    const templates = getTemplates();
    const rows: StageRow[] = [];
    for (const [trade, stages] of Object.entries(templates)) {
      for (const s of stages) {
        if (s.id === 'prep' || s.id === 'handover') continue;
        rows.push({
          uid: `${trade}:${s.id}`,
          trade,
          stageId: s.id,
          stageLabel: s.label,
          options: s.stepOptions ? [...s.stepOptions] : [],
        });
      }
    }
    return rows;
  }

  startEdit(row: StageRow) {
    this.cloned[row.uid] = [...row.options.map(o => ({ ...o }))];
    this.editingUid.set(row.uid);
  }

  saveEdit(row: StageRow) {
    setStageStepOptions(row.trade, row.stageId, row.options);
    delete this.cloned[row.uid];
    this.editingUid.set(null);
    this.messages.add({ severity: 'success', summary: 'Saved', detail: `${row.stageLabel} options`, life: 3000 });
  }

  cancelEdit(row: StageRow) {
    const original = this.cloned[row.uid];
    if (original) {
      row.options = [...original];
      delete this.cloned[row.uid];
    }
    this.editingUid.set(null);
  }

  addOption(row: StageRow) {
    row.options.push({ label: '', value: '' });
  }

  removeOption(row: StageRow, idx: number) {
    row.options.splice(idx, 1);
    this.clearDefaultIfRemoved(row, idx);
  }

  moveUp(row: StageRow, idx: number) {
    if (idx <= 0) return;
    const opts = row.options;
    [opts[idx - 1], opts[idx]] = [opts[idx], opts[idx - 1]];
  }

  moveDown(row: StageRow, idx: number) {
    const opts = row.options;
    if (idx >= opts.length - 1) return;
    [opts[idx], opts[idx + 1]] = [opts[idx + 1], opts[idx]];
  }

  setDefault(row: StageRow, idx: number) {
    row.options.forEach((o, i) => o.default = i === idx);
  }

  private clearDefaultIfRemoved(row: StageRow, removedIdx: number) {
    const removed = row.options[removedIdx];
    if (removed?.default && row.options.length > 0) {
      row.options[0].default = true;
    }
  }
}
