/* Admin > Makeup — set up a Foreman's temporary "makeup" (acting-foreman) status and the ad hoc
   team they build under it. UI-only, see makeup.ts's header comment: nothing else in the app reads
   this yet. */
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucidePlus, LucideTrash2, LucideChevronLeft, LucideUserCog } from '@lucide/angular';
import { ToastService } from '../../../shared/toast.service';
import { PEOPLE, Person, fullName } from '../../../data/people';
import { Role, ROLES } from '../../../data/workflow';
import {
  makeupGrants, addMakeupGrant, removeMakeupGrant, updateMakeupGrant,
  addMakeupMember, removeMakeupMember, isGrantActive, MakeupGrant
} from '../../../data/makeup';

@Component({
  selector: 'app-admin-makeup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucidePlus, LucideTrash2, LucideChevronLeft, LucideUserCog],
  templateUrl: './admin-makeup.component.html'
})
export class AdminMakeupComponent {
  private messages = inject(ToastService);

  grants = makeupGrants;
  people = PEOPLE;
  fullName = fullName;
  /* who can hold makeup status: today's Foremen (title-based, same free-text Person.title the rest
     of the demo directory uses — not the app's own Role enum, which is per-stage routing, not identity) */
  foremen = PEOPLE.filter(p => p.title === 'Foreman');
  /* roles a makeup team member can be assigned — everything except Foreman itself (that's the grant)
     and View (not a working role) */
  memberRoles: Role[] = ROLES.filter(r => r !== 'Foreman' && r !== 'View');

  selectedGrantId = signal<string | null>(null);
  selectedGrant = computed(() => this.grants().find(g => g.id === this.selectedGrantId()) ?? null);

  showAddForm = signal(false);
  newForemanId = signal('');
  newStartDate = signal(new Date().toISOString().slice(0, 10));
  newEndDate = signal('');

  newMemberPersonId = signal('');
  newMemberRole = signal<Role>('Welding');

  personById = new Map<string, Person>(PEOPLE.map(p => [p.id, p]));
  personLabel(id: string): string {
    const p = this.personById.get(id);
    return p ? `${fullName(p)} · ${p.title}` : id;
  }

  isActive(g: MakeupGrant): boolean {
    return isGrantActive(g);
  }

  selectGrant(id: string) {
    this.selectedGrantId.set(id);
    this.newMemberPersonId.set('');
    this.newMemberRole.set('Welding');
  }

  backToList() {
    this.selectedGrantId.set(null);
  }

  addGrant() {
    const foremanId = this.newForemanId();
    const start = this.newStartDate();
    const end = this.newEndDate();
    if (!foremanId || !end) {
      this.messages.add({ severity: 'warn', summary: 'Foreman and end date are required', life: 3000 });
      return;
    }
    const id = addMakeupGrant(foremanId, start, end);
    this.newForemanId.set('');
    this.newEndDate.set('');
    this.showAddForm.set(false);
    this.messages.add({ severity: 'success', summary: 'Makeup status granted', life: 3000 });
    this.selectGrant(id);
  }

  removeGrant(id: string) {
    removeMakeupGrant(id);
    if (this.selectedGrantId() === id) this.selectedGrantId.set(null);
    this.messages.add({ severity: 'info', summary: 'Makeup status removed', life: 3000 });
  }

  updateDates(g: MakeupGrant, startDate: string, endDate: string) {
    if (!endDate) {
      this.messages.add({ severity: 'warn', summary: 'End date is required', life: 3000 });
      return;
    }
    updateMakeupGrant(g.id, { startDate, endDate });
  }

  addMember(g: MakeupGrant) {
    const personId = this.newMemberPersonId();
    if (!personId) return;
    if (personId === g.foremanId) {
      this.messages.add({ severity: 'warn', summary: "Already the makeup foreman", life: 3000 });
      return;
    }
    addMakeupMember(g.id, personId, this.newMemberRole());
    this.newMemberPersonId.set('');
  }

  removeMember(g: MakeupGrant, personId: string) {
    removeMakeupMember(g.id, personId);
  }
}
