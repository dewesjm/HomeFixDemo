import { FormField } from '../signoff-definition/field-catalog';
/* A step's verify-grid rows (Fit-Up Insp's fitting values, Records Review's record fields) as one
   table: each row's value beside a Verified checkbox. Its definition says what the values are
   checked against (verifyAgainst). */
import { Component, input } from '@angular/core';
import { WorkflowStage } from '../model/workflow-types';
import { verifyAgainst } from '../signoff-definition/step-field-config';
import { SignoffContext } from './signoff-context';

@Component({
  selector: 'app-verify-grid',
  standalone: true,
  host: { class: 'block' },
  template: `
    @let st = stage();
    @let fab = againstFabrication();
    <div class="flex flex-col items-start gap-1">
      <div class="font-semibold text-sm">{{ fab ? 'Verify fitting values' : 'Verify record fields' }}</div>
      <table class="table table-sm w-auto">
        <thead>
          <tr>
            <th class="py-1.5 pl-0 pr-10">Field</th>
            <th class="py-1.5 pr-14">{{ fab ? 'Fabrication Value' : 'Record Value' }}</th>
            <th class="py-1.5 px-5 text-center bg-base-200">Verified</th>
          </tr>
        </thead>
        <tbody>
          @for (f of rows(); track f.key) {
            <tr [class.table-error]="!!ctx().fieldError(st.id, f.key)">
              <td class="py-1 pl-0 pr-10" [class.text-error]="!!ctx().fieldError(st.id, f.key)">{{ f.label }}</td>
              <td class="py-1 pr-14">{{ (fab ? ctx().getFabValue(f.key) : ctx().getReviewValue(f.key)) || '-' }}</td>
              <td class="py-1 px-5 text-center bg-base-200/40">
                <input type="checkbox" class="checkbox checkbox-sm"
                       [class.checkbox-error]="!!ctx().fieldError(st.id, f.key)"
                       [disabled]="!ctx().inputsEditable(st, ctx().selectedRouting())"
                       [checked]="st.inputs[f.key] === 'yes'"
                       (change)="check(f, $any($event.target).checked)" />
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `
})
export class VerifyGridComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();
  rows = input.required<FormField[]>();

  againstFabrication(): boolean {
    return verifyAgainst(this.stage()) === 'fabrication';
  }

  check(f: FormField, checked: boolean) {
    const st = this.stage();
    st.inputs[f.key] = checked ? 'yes' : '';
    if (checked) this.ctx().clearFieldError(st.id, f.key);
  }
}
