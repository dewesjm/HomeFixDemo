import { FormField } from '../signoff-definition/field-catalog';
/* One field on a form laid out from its Signoff Type Form (definition-form): the control its
   type calls for, its error or warning, and the description under it. A step field saves to the
   step's inputs; a sign-off field (Pre-Fit/Fit's insert, backing ring and Defer Tack) to its
   sign-off inputs. */
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ACTUAL_REQUIREMENT } from '../signoff-definition/weld-fields';
import { WorkflowStage } from '../model/workflow-types';
import { isFieldLocked, isReadonlyLimit } from '../signoff-definition/field-locks';
import { isPersonField } from '../signoff-definition/field-catalog';
import { qualCheck, QualCheckResult } from '../qualifications/qualifications';
import { conditionRequirements, heldQuals } from '../qualifications/qual-conditions';
import { PersonSearchInputComponent } from '../../shared/person-search-input.component';
import { SignoffContext } from './signoff-context';

@Component({
  selector: 'app-definition-field',
  standalone: true,
  imports: [FormsModule, PersonSearchInputComponent],
  templateUrl: './definition-field.component.html'
})
export class DefinitionFieldComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();
  field = input.required<FormField>();
  /* a sign-off field rather than a step field */
  signoff = input(false);

  stageField(): FormField { return this.field() as FormField; }
  signoffField(): FormField { return this.field() as FormField; }

  error(): string | undefined {
    return this.ctx().fieldError(this.stage().id, this.field().key);
  }

  warning(): string {
    return this.signoff() ? '' : this.ctx().fieldWarning(this.stage(), this.field().key);
  }

  /* disabled by its rules, or set by the external system until an override opens it */
  disabled(): boolean {
    const st = this.stage(), f = this.field();
    if (this.signoff()) return !this.ctx().editable(st) || !!f.disabled;
    return !this.ctx().inputsEditable(st, this.ctx().selectedRouting()) || !!f.disabled
      || isFieldLocked(st, f) || this.ctx().assignedLocked(st, f.key);
  }

  value(): string {
    const st = this.stage(), key = this.field().key;
    return (this.signoff() ? st.signoffInputs[key] : st.inputs[key]) ?? '';
  }

  qualCheck(): QualCheckResult {
    return qualCheck(heldQuals(), conditionRequirements(this.ctx().job, this.stage()));
  }

  isPerson(): boolean { return isPersonField(this.field().key); }
  isReadonlyLimit(): boolean { return isReadonlyLimit(this.stage(), this.field().key); }
  isActual(): boolean { return this.field().key in ACTUAL_REQUIREMENT; }

  /* GWP/WTN options carry descriptions: the closed select shows just the chosen code over them */
  hasDetails(): boolean {
    return !!this.stageField().options?.some(o => o.detail);
  }
  selectedLabel(): string {
    return this.field().options?.find(o => o.value === this.value())?.label ?? '';
  }

  /* Actual PH/IP take whole numbers only: strips anything but digits as it's typed or pasted */
  digitsOnly(el: HTMLInputElement) {
    const clean = el.value.replace(/[^0-9]/g, '');
    if (clean !== el.value) el.value = clean;
  }

  checkboxChange(checked: boolean) {
    const st = this.stage(), f = this.field();
    if (this.signoff()) { this.ctx().signoffCheckboxChange(st, this.signoffField(), checked); return; }
    if (f.key === 'consumableInsertOnly') { this.ctx().onConsumableInsertChange(st, checked ? 'yes' : ''); return; }
    st.inputs[f.key] = checked ? 'yes' : '';
    if (checked) this.ctx().clearFieldError(st.id, f.key);
  }

  selectChange(value: string | null) {
    if (this.signoff()) this.ctx().signoffSelectChange(this.stage(), this.signoffField(), value);
    else this.ctx().stageSelectChange(this.stage(), this.stageField(), value);
  }

  commit(value: string) {
    if (this.signoff()) this.ctx().blurSignoffField(this.stage(), this.signoffField(), value);
    else this.ctx().stageInputBlur(this.stage(), this.stageField(), value);
  }
}
