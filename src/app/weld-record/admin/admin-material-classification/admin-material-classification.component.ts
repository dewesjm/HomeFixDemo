import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucideTrash2 } from '@lucide/angular';
import { ToastService } from '../../../shared/toast.service';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../data/export-csv';
import {
  materialClassification, setMaterialClassification, addMaterialCode, removeMaterialCode, MaterialClassificationEntry
} from '../../../data/material-classification';

@Component({
  selector: 'app-admin-material-classification',
  standalone: true,
  imports: [CommonModule, FormsModule, TableToolbarComponent, SortHeaderComponent, LucidePlus, LucideTrash2],
  templateUrl: './admin-material-classification.component.html'
})
export class AdminMaterialClassificationComponent {
  private messages = inject(ToastService);
  entries = signal<MaterialClassificationEntry[]>(materialClassification().map(e => ({ ...e })));
  newCode = signal('');
  table = new TableState<MaterialClassificationEntry>(['code']);

  constructor() {
    effect(() => this.table.setRows(this.entries()));
  }

  exportCsv() {
    downloadCsv('material-classification', [
      { header: 'Material Code', value: (r: MaterialClassificationEntry) => r.code },
      { header: 'Non-Ferrous or Austenitic', value: (r: MaterialClassificationEntry) => (r.nonFerrousOrAustenitic ? 'Yes' : 'No') },
    ], this.table.sorted());
  }

  toggleClassification(entry: MaterialClassificationEntry) {
    entry.nonFerrousOrAustenitic = !entry.nonFerrousOrAustenitic;
    this.entries.update(e => [...e]);
  }

  save() {
    setMaterialClassification(this.entries().map(e => ({ ...e })));
    this.messages.add({ severity: 'success', summary: 'Material classification saved', life: 3000 });
  }

  addEntry() {
    const val = this.newCode().trim();
    if (!val) return;
    if (this.entries().some(e => e.code === val)) {
      this.messages.add({ severity: 'warn', summary: 'Material code already exists', life: 3000 });
      return;
    }
    this.entries.update(e => [...e, { code: val, nonFerrousOrAustenitic: false }]);
    addMaterialCode(val);
    this.newCode.set('');
    this.messages.add({ severity: 'success', summary: 'Material code added', detail: val, life: 3000 });
  }

  removeEntry(entry: MaterialClassificationEntry) {
    this.entries.update(e => e.filter(x => x.code !== entry.code));
    removeMaterialCode(entry.code);
    this.messages.add({ severity: 'info', summary: 'Material code removed', detail: entry.code, life: 3000 });
  }
}
