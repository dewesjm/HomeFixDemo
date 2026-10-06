/* Admin → Ship Locations: per hull, the Deck / Frame / P/S/CL / Usage rows Fabrication's droplists
   cascade from (data/ship-locations.ts). A row a joint is using can't be changed or deleted. */
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucidePencil, LucideCheck, LucideX, LucideTrash2, LucideUpload } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { ShipLocationEntry, PSCL_VALUES, getShipLocations, setShipLocations } from '../../../data/ship-locations';
import { HULLS, JOBS } from '../../../data/jobs';
import { isShipboardLocation } from '../../../data/shops';
import { WorkflowStore } from '../../services/workflow-store.service';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../data/export-csv';

type Field = 'hull' | 'deck' | 'frame' | 'pscl' | 'usage';
interface LocRow extends ShipLocationEntry { uid: string; }

const keyOf = (e: ShipLocationEntry) => [e.hull, e.deck, e.frame, e.pscl, e.usage].join('|');

@Component({
  selector: 'app-admin-ship-locations',
  standalone: true,
  imports: [TableToolbarComponent, SortHeaderComponent, CommonModule, FormsModule, RouterLink,
    LucidePencil, LucideCheck, LucideX, LucideTrash2, LucideUpload],
  templateUrl: './admin-ship-locations.component.html'
})
export class AdminShipLocationsComponent {
  private messages = inject(ToastService);
  private store = inject(WorkflowStore);
  private confirm = inject(ConfirmService);
  private seq = 0;

  hulls = HULLS;
  psclValues = PSCL_VALUES;
  rows = signal<LocRow[]>(getShipLocations().map((e, i) => ({ ...e, uid: `sl-${i}` })));
  editingId = signal<string | null>(null);
  private cloned: Record<string, LocRow> = {};
  table = new TableState<LocRow>(['hull', 'deck', 'frame', 'pscl', 'usage']);

  /* how many joints on the Ship use each Hull/Deck/Frame/P-S-CL/Usage combination */
  usedBy = computed(() => {
    const counts = new Map<string, number>();
    for (const job of JOBS) {
      const fab = this.store.workflowFor(job)().fabricationData;
      if (!isShipboardLocation(fab['location'])) continue;
      const k = keyOf({ hull: job.hull, deck: fab['deck'] ?? '', frame: fab['frame'] ?? '', pscl: fab['pscl'] ?? '', usage: fab['usage'] ?? '' });
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return counts;
  });
  useCount(row: LocRow) {
    return this.usedBy().get(keyOf(row)) ?? 0;
  }

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  addRow() {
    const uid = `new-${++this.seq}`;
    this.table.clearFilters();
    this.rows.update(r => [{ uid, hull: '', deck: '', frame: '', pscl: '', usage: '' }, ...r]);
    this.editingId.set(uid);
  }

  deleteRow(row: LocRow) {
    const n = this.useCount(row);
    if (n) {
      this.messages.add({ severity: 'error', summary: 'In use', detail: `Used by ${n} joint${n === 1 ? '' : 's'}, so it can't be deleted.`, life: 4000 });
      return;
    }
    this.confirm.confirmDelete(`Hull ${row.hull}, Deck ${row.deck}, Frame ${row.frame}`, () => {
      this.rows.update(r => r.filter(x => x.uid !== row.uid));
      this.persist();
      this.messages.add({ severity: 'info', summary: 'Deleted', life: 3000 });
    });
  }

  startEdit(row: LocRow) {
    const n = this.useCount(row);
    if (n) {
      this.messages.add({ severity: 'error', summary: 'In use', detail: `Used by ${n} joint${n === 1 ? '' : 's'}, so it can't be changed.`, life: 4000 });
      return;
    }
    this.cloned[row.uid] = { ...row };
    this.editingId.set(row.uid);
  }

  saveEdit(row: LocRow) {
    const current = this.rows().find(x => x.uid === row.uid)!;
    if (!current.hull || !current.deck.trim() || !current.frame.trim() || !current.pscl || !current.usage.trim()) {
      this.messages.add({ severity: 'error', summary: 'Missing values', detail: 'Hull, Deck, Frame, P/S/CL and Usage are all required.', life: 4000 });
      return;
    }
    const trimmed: LocRow = { ...current, deck: current.deck.trim(), frame: current.frame.trim(), usage: current.usage.trim() };
    if (this.rows().some(x => x.uid !== row.uid && keyOf(x) === keyOf(trimmed))) {
      this.messages.add({ severity: 'error', summary: 'Duplicate', detail: 'That location is already on the list.', life: 4000 });
      return;
    }
    this.rows.update(r => r.map(x => x.uid === row.uid ? trimmed : x));
    this.persist();
    delete this.cloned[row.uid];
    this.editingId.set(null);
    this.messages.add({ severity: 'success', summary: 'Saved', detail: `${trimmed.hull} ${trimmed.deck} ${trimmed.frame} ${trimmed.pscl} ${trimmed.usage}`, life: 3000 });
  }

  cancelEdit(row: LocRow) {
    const original = this.cloned[row.uid];
    this.rows.update(r => original ? r.map(x => x.uid === row.uid ? original : x) : r.filter(x => x.uid !== row.uid));
    delete this.cloned[row.uid];
    this.editingId.set(null);
  }

  updateField(row: LocRow, field: Field, value: string) {
    this.rows.update(r => r.map(x => x.uid === row.uid ? { ...x, [field]: value } : x));
  }

  exportCsv() {
    downloadCsv('ship-locations', [
      { header: 'Hull', value: (r: LocRow) => r.hull },
      { header: 'Deck', value: r => r.deck },
      { header: 'Frame', value: r => r.frame },
      { header: 'P/S/CL', value: r => r.pscl },
      { header: 'Usage', value: r => r.usage },
      { header: 'Used by joints', value: r => this.useCount(r) },
    ], this.table.sorted());
  }

  private persist() {
    setShipLocations(this.rows().filter(r => r.hull && r.deck && r.frame && r.pscl && r.usage)
      .map(({ hull, deck, frame, pscl, usage }) => ({ hull, deck, frame, pscl, usage })));
  }
}
