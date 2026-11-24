/* The Joint type select at the top of a per-joint-type settings page: picking a type opens the page for it
   (the type goes in the URL, so Back returns to the type before). */
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { JointType } from '../../../data/jobs';
import { SETTINGS_JOINT_TYPE, SETTINGS_JOINT_TYPE_CHOICES, jointTypeParam } from './joint-type-settings';

@Component({
  selector: 'app-joint-type-select',
  template: `
    <div class="mb-sm">
      <label class="select select-sm w-64">
        <span class="label">Joint type</span>
        <select [value]="jointType" (change)="pick($any($event.target).value)">
          @for (c of choices; track c.value) {
            <option [value]="c.value" [disabled]="c.disabled" [selected]="c.value === jointType">{{ c.label }}</option>
          }
        </select>
      </label>
    </div>`,
})
export class JointTypeSelectComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly jointType = inject(SETTINGS_JOINT_TYPE);
  readonly choices = SETTINGS_JOINT_TYPE_CHOICES;

  pick(value: JointType) {
    this.router.navigate([], { relativeTo: this.route, queryParams: { type: jointTypeParam(value) }, queryParamsHandling: 'merge' });
  }
}
