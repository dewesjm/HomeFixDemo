import { Injectable, computed, inject } from '@angular/core';
import { makeupGrants, saveMakeupGrants, type MakeupGrant } from '../../data/makeup-grants';
import { PEOPLE } from '../../data/people';
import { ViewerService } from '../access-logic/viewer.service';
import { MAKEUP_MAX_DAYS_OUT, MAKEUP_TITLES, makeupDate, makeupLatestDate, validMakeupDate } from '../makeup-logic/makeup-rules';

@Injectable({ providedIn: 'root' })
export class MakeupService {
  private readonly viewer = inject(ViewerService);
  readonly grants = computed(() => {
    const viewerId = this.viewer.person().id;
    if (this.viewer.canReviewAllMakeup()) return makeupGrants();
    if (this.viewer.canManageMakeup()) return makeupGrants().filter(grant => grant.foremanId === viewerId);
    return makeupGrants().filter(grant => grant.personId === viewerId);
  });

  getMakeupGrants() {
    if (!this.viewer.canViewMakeup()) return this.failure('Makeup access is required.', 'Access denied');
    return { ok: true as const, data: this.grants().map(grant => ({ ...grant })) };
  }

  addMakeupGrant(personId: string, startDate: string, endDate: string) {
    if (!this.viewer.canManageMakeup()) return this.denied();
    if (!PEOPLE.some(person => person.id === personId && MAKEUP_TITLES.includes(person.title))) {
      return this.failure('Choose a fitter or welder.', 'Wrong value');
    }
    const grant: MakeupGrant = {
      id: crypto.randomUUID(), personId, foremanId: this.viewer.person().id,
      startDate, endDate, changedBy: this.viewer.personName(this.viewer.person().id),
    };
    const problem = this.validate(grant);
    return problem ? this.failure(problem, 'Wrong value') : this.save([...makeupGrants(), grant], grant.id);
  }

  updateMakeupGrant(id: string, startDate: string, endDate: string) {
    if (!this.viewer.canManageMakeup()) return this.denied();
    const existing = this.grants().find(grant => grant.id === id);
    if (!existing) return this.failure('Makeup status not found.', 'Not found');
    const updated = { ...existing, startDate, endDate };
    const problem = this.validate(updated, existing);
    return problem ? this.failure(problem, 'Wrong value')
      : this.save(makeupGrants().map(grant => grant.id === id ? updated : grant), id);
  }

  revokeMakeupGrant(id: string) {
    if (!this.viewer.canManageMakeup()) return this.denied();
    if (!this.grants().some(grant => grant.id === id)) return this.failure('Makeup status not found.', 'Not found');
    return this.save(makeupGrants().filter(grant => grant.id !== id), id);
  }

  private validate(grant: MakeupGrant, existing?: MakeupGrant): string | undefined {
    const { startDate, endDate } = grant;
    if (!validMakeupDate(startDate) || !validMakeupDate(endDate) || endDate < startDate) {
      return 'Enter a valid date range with the end on or after the start.';
    }
    if (startDate !== existing?.startDate && startDate < makeupDate()) return "Start date can't be in the past.";
    if (endDate !== existing?.endDate && endDate > makeupLatestDate()) {
      return "End date can't be more than " + MAKEUP_MAX_DAYS_OUT + ' days out.';
    }
    return undefined;
  }

  private save(grants: MakeupGrant[], id: string) {
    try {
      saveMakeupGrants(grants);
      return { ok: true as const, data: { id } };
    } catch {
      return this.failure('Could not save Makeup status.', 'Not saved');
    }
  }

  private denied() {
    return this.failure('Manage Makeup permission is required for a foreman.', 'Access denied');
  }

  private failure(error: string, title: string) {
    return { ok: false as const, error, title };
  }
}
