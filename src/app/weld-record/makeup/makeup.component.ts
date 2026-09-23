/* Makeup — grant someone below the foreman level temporary "makeup" (acting-foreman) status.
   UI-only, see makeup.ts's header comment: nothing else in the app reads this yet. Flat grid, not
   Teams' list-into-detail: the people who set makeup are a different audience than the people
   managing Teams' permission matrix and are used to a grid view. Its own nav entry outside the
   Admin menu too, since this is routine foreman use, not admin configuration. */
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucidePlus, LucideTrash2, LucideUserCog, LucideUser, LucideX, LucideSearch, LucidePencil, LucideCheck, LucideArrowLeft } from '@lucide/angular';
import { ToastService } from '../../shared/toast.service';
import { PEOPLE, Person, fullName, searchPeople } from '../../data/people';
import {
  makeupGrants, addMakeupGrant, removeMakeupGrant, updateMakeupGrant, isGrantActive,
  daySpan, daysRemaining, ANNUAL_MAKEUP_DAYS, MakeupGrant
} from '../../data/makeup';

@Component({
  selector: 'app-makeup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucidePlus, LucideTrash2, LucideUserCog, LucideUser, LucideX, LucideSearch, LucidePencil, LucideCheck, LucideArrowLeft],
  templateUrl: './makeup.component.html'
})
export class MakeupComponent {
  private messages = inject(ToastService);
  readonly annualDays = ANNUAL_MAKEUP_DAYS;

  grants = makeupGrants;
  fullName = fullName;
  today = new Date().toISOString().slice(0, 10);

  /* search/filter: matches person name/title/id; active grants sort first (not hidden -- inactive
     ones stay reachable by search), then by start date, most recent first */
  searchQuery = signal('');
  filteredGrants = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const rows = !q ? this.grants() : this.grants().filter(g => this.personLabel(g.personId).toLowerCase().includes(q));
    return [...rows].sort((a, b) =>
      Number(this.isActive(b)) - Number(this.isActive(a)) || b.startDate.localeCompare(a.startDate));
  });

  /* person search: below-foreman only -- a Foreman doesn't need to be granted makeup as one */
  personQuery = signal('');
  suggestOpen = signal(false);
  suggestions = computed(() => searchPeople(this.personQuery()).filter(p => p.title !== 'Foreman'));
  newPerson = signal<Person | null>(null);
  newStartDate = signal(new Date().toISOString().slice(0, 10));
  newEndDate = signal('');

  personById = new Map<string, Person>(PEOPLE.map(p => [p.id, p]));
  personLabel(id: string): string {
    const p = this.personById.get(id);
    return p ? `${fullName(p)} · ${p.title}` : id;
  }

  isActive(g: MakeupGrant): boolean {
    return isGrantActive(g);
  }

  /* true remaining balance for the year, counting every grant that person holds -- including this
     one's own days, so 16 used (anywhere) reads as 90 - 16, not 90 minus everything else */
  remainingFor(g: MakeupGrant): number {
    return daysRemaining(g.personId, this.grantYear(g), this.grants());
  }

  usedFor(g: MakeupGrant): number {
    return daySpan(g.startDate, g.endDate);
  }

  private grantYear(g: MakeupGrant): number {
    return new Date(g.startDate + 'T00:00:00').getFullYear();
  }

  choosePerson(p: Person) {
    this.newPerson.set(p);
    this.personQuery.set('');
    this.suggestOpen.set(false);
  }

  clearPerson() {
    this.newPerson.set(null);
    this.personQuery.set('');
  }

  /* remaining days for whoever's picked in the add row, before this grant counts against it */
  newPersonRemaining = computed(() => {
    const p = this.newPerson();
    if (!p) return null;
    return daysRemaining(p.id, new Date(this.newStartDate() + 'T00:00:00').getFullYear(), this.grants());
  });

  addGrant() {
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
    const span = daySpan(start, end);
    const remaining = daysRemaining(person.id, new Date(start + 'T00:00:00').getFullYear(), this.grants());
    if (span > remaining) {
      this.messages.add({ severity: 'warn', summary: `Only ${remaining} makeup day${remaining === 1 ? '' : 's'} remaining this year for ${fullName(person)}`, life: 4000 });
      return;
    }
    addMakeupGrant(person.id, start, end);
    this.newPerson.set(null);
    this.newEndDate.set('');
    this.messages.add({ severity: 'success', summary: 'Makeup status granted', life: 3000 });
  }

  removeGrant(id: string) {
    removeMakeupGrant(id);
    if (this.editingId() === id) this.editingId.set(null);
    this.messages.add({ severity: 'info', summary: 'Makeup status removed', life: 3000 });
  }

  /* date edits require an explicit confirm click (editStart()/editEnd() are just a local buffer
     until then) -- binding straight to (ngModelChange) used to commit and re-validate on every
     native date-input tick, including scrolling through months with the picker's own controls */
  editingId = signal<string | null>(null);
  editStart = signal('');
  editEnd = signal('');

  startEdit(g: MakeupGrant) {
    this.editingId.set(g.id);
    this.editStart.set(g.startDate);
    this.editEnd.set(g.endDate);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  confirmEdit(g: MakeupGrant) {
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
    const span = daySpan(startDate, endDate);
    const remaining = daysRemaining(g.personId, new Date(startDate + 'T00:00:00').getFullYear(), this.grants(), g.id);
    if (span > remaining) {
      this.messages.add({ severity: 'warn', summary: `Only ${remaining} makeup day${remaining === 1 ? '' : 's'} remaining this year`, life: 4000 });
      return;
    }
    updateMakeupGrant(g.id, { startDate, endDate });
    this.editingId.set(null);
  }
}
