import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucideTrash2 } from '@lucide/angular';
import { ToastService } from '../shared/toast.service';
import {
  mclTraceability, setMclTraceability, addMclValue, removeMclValue, MclTraceabilityEntry
} from '../data/mcl-traceability';

@Component({
  selector: 'app-admin-material-traceability',
  standalone: true,
  imports: [CommonModule, FormsModule, LucidePlus, LucideTrash2],
  templateUrl: './admin-material-traceability.component.html'
})
export class AdminMaterialTraceabilityComponent {
  private messages = inject(ToastService);
  entries = signal<MclTraceabilityEntry[]>(mclTraceability().map(e => ({ ...e })));
  newMclValue = signal('');

  toggleTraceability(entry: MclTraceabilityEntry) {
    entry.requiresTraceability = !entry.requiresTraceability;
    this.entries.update(e => [...e]);
  }

  save() {
    setMclTraceability(this.entries().map(e => ({ ...e })));
    this.messages.add({ severity: 'success', summary: 'Traceability settings saved', life: 3000 });
  }

  addEntry() {
    const val = this.newMclValue().trim();
    if (!val) return;
    if (this.entries().some(e => e.mclValue === val)) {
      this.messages.add({ severity: 'warn', summary: 'MCL value already exists', life: 3000 });
      return;
    }
    this.entries.update(e => [...e, { mclValue: val, requiresTraceability: true }]);
    addMclValue(val);
    this.newMclValue.set('');
    this.messages.add({ severity: 'success', summary: 'MCL value added', detail: val, life: 3000 });
  }

  removeEntry(entry: MclTraceabilityEntry) {
    this.entries.update(e => e.filter(x => x.mclValue !== entry.mclValue));
    removeMclValue(entry.mclValue);
    this.messages.add({ severity: 'info', summary: 'MCL value removed', detail: entry.mclValue, life: 3000 });
  }
}
