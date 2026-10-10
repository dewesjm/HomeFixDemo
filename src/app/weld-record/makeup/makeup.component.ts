/* Makeup — grant someone below the foreman level temporary "makeup" (acting-foreman) status.
   UI-only, see makeup.ts's header comment: nothing else in the app reads this yet. A row-edit table
   with the same toolbar as the admin tables (search, Export, Add), but its own nav entry outside the
   Admin menu, since this is routine foreman use, not admin configuration. Ended grants are hidden
   unless Show inactive is checked. */
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
import { downloadCsv } from '../../data/export-csv';
import { AppDatePipe, formatDate } from '../../shared/date-format';
import { PEOPLE, Person, fullName } from '../../data/people';
import {
  makeupGrants, addMakeupGrant, removeMakeupGrant, updateMakeupGrant, grantStatus, GrantStatus,
  daySpan, daysRemaining, ANNUAL_MAKEUP_DAYS, MakeupGrant
} from '../../data/makeup';

interface GrantRow {
  grant: MakeupGrant;
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
  selector: 'app-makeup',
  standalone: true,
  imports: [AppDatePipe, CommonModule, FormsModule, RouterLink, PersonSearchInputComponent, TableToolbarComponent, SortHeaderComponent,
    LucideTrash2, LucidePencil, LucideCheck, LucideX, LucideArrowLeft],
  templateUrl: './makeup.component.html'
})
export class MakeupComponent {
  private messages = inject(ToastService);
  private confirm = inject(ConfirmService);
  readonly annualDays = ANNUAL_MAKEUP_DAYS;
  /* joke placeholder: page shows only "NO MIKE"; set false to restore the real page */
  readonly noMike = false;

  grants = makeupGrants;
  today = new Date().toISOString().slice(0, 10);
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
        grant: g,
        id: g.id,
        person: this.personLabel(g.personId),
        status: grantStatus(g, this.today),
        startDate: g.startDate,
        endDate: g.endDate,
        used: daySpan(g.startDate, g.endDate),
        /* the person's whole balance for the grant's year, this grant's own days included */
        remaining: daysRemaining(g.personId, this.yearOf(g.startDate), all),
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

  private yearOf(isoDate: string): number {
    return new Date(isoDate + 'T00:00:00').getFullYear();
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
    return daysRemaining(p.id, this.yearOf(this.newStartDate()), this.grants());
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
    const person = this.newPerson();
    const start = this.newStartDate();
    const end = this.newEndDate();
    if (!person || !end) {
      this.messages.add({ severity: 'warn', summary: 'Person and end date are required', life: 3000 });
      return;
    }
    if (start < this.today) {
      this.messages.add({ severity: 'warn', summary: "Start date can't be in the past", life: 3000 });
      return;
    }
    const remaining = daysRemaining(person.id, this.yearOf(start), this.grants());
    if (daySpan(start, end) > remaining) {
      this.messages.add({ severity: 'warn', summary: `Only ${remaining} makeup day${remaining === 1 ? '' : 's'} remaining this year for ${fullName(person)}`, life: 4000 });
      return;
    }
    addMakeupGrant(person.id, start, end);
    this.adding.set(false);
    this.messages.add({ severity: 'success', summary: 'Makeup status granted', life: 3000 });
  }

  removeGrant(row: GrantRow) {
    this.confirm.confirmDelete(`makeup for ${row.person}`, () => {
      removeMakeupGrant(row.id);
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
    const g = row.grant;
    const startDate = this.editStart();
    const endDate = this.editEnd();
    if (!endDate) {
      this.messages.add({ severity: 'warn', summary: 'End date is required', life: 3000 });
      return;
    }
    /* only block a start date that's actively being moved into the past -- an untouched historical
       grant's original start date shouldn't stop the end date (or anything else) from being edited */
    if (startDate !== g.startDate && startDate < this.today) {
      this.messages.add({ severity: 'warn', summary: "Start date can't be in the past", life: 3000 });
      return;
    }
    const remaining = daysRemaining(g.personId, this.yearOf(startDate), this.grants(), g.id);
    if (daySpan(startDate, endDate) > remaining) {
      this.messages.add({ severity: 'warn', summary: `Only ${remaining} makeup day${remaining === 1 ? '' : 's'} remaining this year`, life: 4000 });
      return;
    }
    updateMakeupGrant(g.id, { startDate, endDate });
    this.editingId.set(null);
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
