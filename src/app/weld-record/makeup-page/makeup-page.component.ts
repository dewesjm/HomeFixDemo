import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideTrash2, LucidePencil, LucideCheck, LucideX, LucideArrowLeft } from '@lucide/angular';
import { ToastService } from '../../shared/toast.service';
import { ConfirmService } from '../../shared/confirm.service';
import { PersonSearchInputComponent } from '../../shared/person-search-input.component';
import { TableState } from '../../shared/table-state';
import { TableToolbarComponent } from '../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../shared/sort-header.component';
import { downloadCsv } from '../../shared/export-csv';
import { AppDatePipe, formatDate } from '../../shared/date-format';
import { PEOPLE, Person, fullName } from '../../data/people';
import { MakeupService } from '../services/makeup.service';
import { daySpan, grantStatus, MAKEUP_TITLES, makeupDate, type GrantStatus } from '../makeup-logic/makeup-rules';

interface GrantRow {
  id: string;
  person: string;
  status: GrantStatus;
  startDate: string;
  endDate: string;
  used: number;
  remaining: number;
  changedBy: string;
}

const STATUS_ORDER: Record<GrantStatus, number> = { Active: 0, Upcoming: 1, Inactive: 2 };

@Component({
  selector: 'app-makeup-page',
  standalone: true,
  imports: [AppDatePipe, CommonModule, FormsModule, RouterLink, PersonSearchInputComponent, TableToolbarComponent, SortHeaderComponent,
    LucideTrash2, LucidePencil, LucideCheck, LucideX, LucideArrowLeft],
  templateUrl: './makeup-page.component.html'
})
export class MakeupPageComponent {
  private messages = inject(ToastService);
  private confirm = inject(ConfirmService);

  private makeup = inject(MakeupService);
  readonly grants = this.makeup.grants;
  readonly eligibleTitles = MAKEUP_TITLES;
  today = makeupDate();
  showInactive = signal(false);

  personById = new Map<string, Person>(PEOPLE.map(p => [p.id, p]));
  personLabel(id: string): string {
    const p = this.personById.get(id);
    return p ? `${fullName(p)} · ${p.title}` : id;
  }

  /* one row per grant; with no column sorted, Active first, then Upcoming, then Inactive,
     each by start date, most recent first */
  private rows = computed<GrantRow[]>(() => {
    const all = this.grants();
    return all
      .map(g => ({
        id: g.id,
        person: this.personLabel(g.personId),
        status: grantStatus(g, this.today),
        startDate: g.startDate,
        endDate: g.endDate,
        used: daySpan(g.startDate, g.endDate),
        /* the person's whole balance for the grant's year, this grant's own days included */
        remaining: this.makeup.remaining(g.personId, g.startDate),
        changedBy: g.changedBy,
      }))
      .filter(r => this.showInactive() || r.status !== 'Inactive')
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.startDate.localeCompare(a.startDate));
  });

  table = new TableState<GrantRow>(['person', 'id', 'changedBy']);
  inactiveCount = computed(() => this.grants().filter(g => grantStatus(g, this.today) === 'Inactive').length);

  constructor() {
    effect(() => this.table.setRows(this.rows()));
  }

  /* Add: a blank row at the top of the table with the person picker and dates */
  adding = signal(false);
  newPerson = signal<Person | null>(null);
  newStartDate = signal(this.today);
  newEndDate = signal('');

  /* remaining days for whoever's picked in the add row, before this grant counts against it */
  newPersonRemaining = computed(() => {
    const p = this.newPerson();
    if (!p) return null;
    return this.makeup.remaining(p.id, this.newStartDate());
  });

  addRow() {
    this.editingId.set(null);
    this.newPerson.set(null);
    this.newStartDate.set(this.today);
    this.newEndDate.set('');
    this.adding.set(true);
  }

  cancelAdd() {
    this.adding.set(false);
  }

  saveAdd() {
    const result = this.makeup.addMakeupGrant(this.newPerson()?.id ?? '', this.newStartDate(), this.newEndDate());
    if (!result.ok) return this.warn(result.message);
    this.adding.set(false);
    this.messages.add({ severity: 'success', summary: 'Makeup status granted', life: 3000 });
  }

  removeGrant(row: GrantRow) {
    this.confirm.confirmDelete(`makeup for ${row.person}`, () => {
      const result = this.makeup.revokeMakeupGrant(row.id);
      if (!result.ok) return this.warn(result.message);
      if (this.editingId() === row.id) this.editingId.set(null);
      this.messages.add({ severity: 'info', summary: 'Makeup status removed', life: 3000 });
    });
  }

  /* date edits require an explicit confirm click (editStart()/editEnd() are just a local buffer
     until then): binding straight to (ngModelChange) would commit and re-validate on every native
     date-input tick, including scrolling through months with the picker's own controls */
  editingId = signal<string | null>(null);
  editStart = signal('');
  editEnd = signal('');

  startEdit(row: GrantRow) {
    this.adding.set(false);
    this.editingId.set(row.id);
    this.editStart.set(row.startDate);
    this.editEnd.set(row.endDate);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  confirmEdit(row: GrantRow) {
    const result = this.makeup.updateMakeupGrant(row.id, this.editStart(), this.editEnd());
    if (!result.ok) return this.warn(result.message);
    this.editingId.set(null);
  }

  private warn(summary: string): void {
    this.messages.add({ severity: 'warn', summary, life: 4000 });
  }

  exportCsv() {
    downloadCsv('makeup', [
      { header: 'Person', value: (r: GrantRow) => r.person },
      { header: 'Status', value: (r: GrantRow) => r.status },
      { header: 'Start', value: (r: GrantRow) => formatDate(r.startDate) },
      { header: 'End', value: (r: GrantRow) => formatDate(r.endDate) },
      { header: 'Days used', value: (r: GrantRow) => String(r.used) },
      { header: 'Days remaining', value: (r: GrantRow) => String(r.remaining) },
      { header: 'Changed by', value: (r: GrantRow) => r.changedBy },
    ], this.table.sorted());
  }
}
