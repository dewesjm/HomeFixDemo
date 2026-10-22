/* Pre-Fit and Fit's sign-off: the Consumable Insert row and the Backing Ring row (each shown when the
   joint design calls for it), and Fit's Defer Tack */
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SignoffField, WorkflowStage } from '../../data/workflow';
import { SignoffContext } from './signoff-context';

/* visibleSignoffFields() leaves out a row's fields when the joint design doesn't call for them */
const FIT_ROWS = [
  ['consumableInsertType', 'consumableInsertSize', 'consumableInsertId'],
  ['backingRingType', 'backingRingId'],
];

@Component({
  selector: 'app-fit-signoff-form',
  standalone: true,
  imports: [FormsModule],
  host: { class: 'block' },
  templateUrl: './fit-signoff-form.component.html'
})
export class FitSignoffFormComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();

  rows(): SignoffField[][] {
    const visible = this.ctx().visibleSignoffFields(this.stage());
    return FIT_ROWS
      .map(keys => keys.map(k => visible.find(f => f.key === k)).filter((f): f is SignoffField => !!f))
      .filter(row => row.length > 0);
  }

  deferTack(): SignoffField | undefined {
    return this.ctx().visibleSignoffFields(this.stage()).find(f => f.key === 'deferTack');
  }
}
