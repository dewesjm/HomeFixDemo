import { Injectable, computed, inject } from '@angular/core';
import { makeupGrants, saveMakeupGrants, type MakeupGrant } from '../../data/makeup-grants';
import { PEOPLE } from '../../data/people';
import { ViewerService } from '../access-logic/viewer.service';
import { daySpan, daysRemaining, MAKEUP_TITLES, makeupDate, validMakeupDate } from '../makeup-logic/makeup-rules';

@Injectable({ providedIn: 'root' })
export class MakeupService {
  private readonly viewer = inject(ViewerService);
  readonly grants = computed(() => {
    const viewerId = this.viewer.person().id;
    if (this.viewer.canReviewAllMakeup()) return makeupGrants();
    if (this.viewer.canManageMakeup()) return makeupGrants().filter(grant => grant.foremanId === viewerId);
    return makeupGrants().filter(grant => grant.personId === viewerId);
  });

  remaining(personId: string, startDate: string, excludeGrantId?: string): number {
    return daysRemaining(personId, Number(startDate.slice(0, 4)), makeupGrants(), excludeGrantId);
  }

  getMakeupGrants() {
    if (!this.viewer.canViewMakeup()) return { ok: false as const, message: 'Makeup access is required.' };
    return { ok: true as const, data: this.grants().map(grant => ({ ...grant })) };
  }

  addMakeupGrant(personId: string, startDate: string, endDate: string) {
    if (!this.viewer.canManageMakeup()) return this.denied();
    if (!PEOPLE.some(person => person.id === personId && MAKEUP_TITLES.includes(person.title))) {
      return this.failure('Choose a fitter or welder.');
    }
    const grant: MakeupGrant = {
      id: crypto.randomUUID(), personId, foremanId: this.viewer.person().id,
      startDate, endDate, changedBy: this.viewer.personName(this.viewer.person().id),
    };
    const problem = this.validate(grant);
    return problem ? this.failure(problem) : this.save([...makeupGrants(), grant], grant.id);
  }

  updateMakeupGrant(id: string, startDate: string, endDate: string) {
    if (!this.viewer.canManageMakeup()) return this.denied();
    const existing = this.grants().find(grant => grant.id === id);
    if (!existing) return this.failure('Makeup status not found.');
    const updated = { ...existing, startDate, endDate };
    const problem = this.validate(updated, existing);
    return problem ? this.failure(problem)
      : this.save(makeupGrants().map(grant => grant.id === id ? updated : grant), id);
  }

  revokeMakeupGrant(id: string) {
    if (!this.viewer.canManageMakeup()) return this.denied();
    if (!this.grants().some(grant => grant.id === id)) return this.failure('Makeup status not found.');
    return this.save(makeupGrants().filter(grant => grant.id !== id), id);
  }

  private validate(grant: MakeupGrant, existing?: MakeupGrant): string | undefined {
    const { personId, startDate, endDate } = grant;
    if (!validMakeupDate(startDate) || !validMakeupDate(endDate) || endDate < startDate) {
      return 'Enter a valid date range with the end on or after the start.';
    }
    if (startDate !== existing?.startDate && startDate < makeupDate()) return "Start date can't be in the past.";
    const remaining = this.remaining(personId, startDate, existing?.id);
    if (daySpan(startDate, endDate) > remaining) return 'Only ' + remaining + ' makeup days remain for this year.';
    return undefined;
  }

  private save(grants: MakeupGrant[], id: string) {
    try {
      saveMakeupGrants(grants);
      return { ok: true as const, data: { id } };
    } catch {
      return this.failure('Could not save Makeup status.');
    }
  }

  private denied() {
    return this.failure('Manage Makeup permission is required for a foreman.');
  }

  private failure(message: string) {
    return { ok: false as const, message };
  }
}
