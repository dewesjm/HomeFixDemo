/* Admin > Qualifications: demo/testing aid to set which quals the Test User holds, which drives
   Weld Record's Qualification Check (data/welder-quals.ts). */
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../shared/toast.service';
import { procedures } from '../../../data/procedures';
import {
  WELDER_QUALS, DEFAULT_TEST_USER_QUALS, TEST_USER_NAME, testUserQuals, setTestUserQuals
} from '../../../data/welder-quals';

@Component({
  selector: 'app-admin-welder-quals',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-welder-quals.component.html'
})
export class AdminWelderQualsComponent {
  private messages = inject(ToastService);
  userName = TEST_USER_NAME;
  held = signal<ReadonlySet<string>>(new Set(testUserQuals()));

  /* each qual with how many WPS rows (one per GWP+WTN) require it */
  rows = computed(() => WELDER_QUALS.map(q => ({
    qual: q,
    wtnCount: procedures().filter(p => p.qualificationsRequired.includes(q)).length,
  })));

  /* WPS rows the Test User would fail with the current (unsaved) selection */
  failingCount = computed(() => procedures().filter(p => p.qualificationsRequired.some(q => !this.held().has(q))).length);
  totalCount = computed(() => procedures().length);

  toggle(qual: string) {
    this.held.update(s => {
      const next = new Set(s);
      if (!next.delete(qual)) next.add(qual);
      return next;
    });
  }

  setAll(on: boolean) {
    this.held.set(new Set(on ? WELDER_QUALS : []));
  }

  resetDefault() {
    this.held.set(new Set(DEFAULT_TEST_USER_QUALS));
  }

  save() {
    setTestUserQuals([...this.held()]);
    this.messages.add({ severity: 'success', summary: 'Qualifications saved', detail: `${this.held().size} of ${WELDER_QUALS.length} held`, life: 3000 });
  }
}
