/* Ordered Joint Details rules selecting a routing's persona, with its base persona as fallback. */
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Job } from '../../../data/jobs';
import { ROLES, StageTemplate } from '../../model/workflow-types';
import { getTemplates, updateStageTemplate } from '../../routing/stage-templates';
import { ConditionClause, STEP_CONDITION_FIELDS, describeConditions } from '../../routing/step-conditions';
import { clauseTyped, clauseValid, conditionValueOptions, newConditionClause, patchClause } from './condition-editing';

@Component({
  selector: 'app-persona-rules', standalone: true, imports: [FormsModule],
  template: `
    <dialog class="modal modal-open" (close)="closed.emit()" aria-labelledby="persona-rules-title">
      <div class="modal-box max-w-3xl">
        <h3 id="persona-rules-title" class="text-lg font-semibold">Persona rules: {{ routing().label }}</h3>
        <p class="my-3">The first matching rule chooses the persona when this routing is created. Otherwise use {{ routing().role }}. Existing routings keep their recorded persona.</p>
        @for (rule of rules; track $index; let ri = $index) {
          <div class="border border-base-300 rounded-box p-3 mb-3">
            <div class="flex gap-2 items-center mb-2">
              <span>Rule {{ ri + 1 }}</span>
              <button class="btn btn-xs" (click)="move(ri, -1)" [disabled]="ri === 0" aria-label="Check persona rule earlier">Up</button>
              <button class="btn btn-xs" (click)="move(ri, 1)" [disabled]="ri === rules.length - 1" aria-label="Check persona rule later">Down</button>
              <button class="btn btn-xs" (click)="rules.splice(ri, 1)" aria-label="Remove persona rule">Remove</button>
            </div>
            @for (clause of rule.when; track $index; let ci = $index) {
              <div class="my-2">
                @if (ci > 0) { <span>And </span> }
                <select class="select select-sm" aria-label="Persona condition field" [ngModel]="clause.field" (ngModelChange)="patch(ri, ci, {field: $event})">
                  @for (field of fields; track field.key) { <option [value]="field.key">{{ field.label }}</option> }
                </select>
                <select class="select select-sm" aria-label="Persona condition operator" [ngModel]="clause.op" (ngModelChange)="patch(ri, ci, {op: $event})">
                  <option value="is">is</option><option value="isNot">is not</option><option value="contains">contains</option>
                </select>
                <button class="btn btn-xs" (click)="rule.when.splice(ci, 1)" aria-label="Remove persona condition">Remove condition</button>
                @if (typed(clause)) {
                  <input class="input input-sm" aria-label="Persona condition value" [ngModel]="clause.values[0]" (ngModelChange)="patch(ri, ci, {values: [$event]})" />
                } @else {
                  <div class="flex flex-wrap gap-3 mt-2">
                    @for (option of options(clause.field); track option.value) {
                      <label class="flex gap-1 items-center"><input type="checkbox" class="checkbox checkbox-sm" [checked]="clause.values.includes(option.value)" (change)="toggle(ri, ci, option.value)" />{{ option.label }}</label>
                    }
                  </div>
                }
                @if (!validClause(clause)) { <p class="text-error">Enter or select a value.</p> }
              </div>
            } @empty { <p>Always</p> }
            <button class="btn btn-xs" (click)="rule.when.push(newClause())">And condition</button>
            <label class="flex gap-2 items-center mt-3">Persona
              <select class="select select-sm" aria-label="Rule persona" [(ngModel)]="rule.role">
                @for (role of roles; track role) { <option [value]="role">{{ role }}</option> }
              </select>
            </label>
          </div>
        } @empty { <p>No rules: use {{ routing().role }}.</p> }
        <button class="btn btn-sm mt-2" (click)="add()">Add persona rule</button>
        <div class="modal-action">
          <button class="btn btn-ghost" (click)="closed.emit()">Cancel</button>
          <button class="btn btn-primary" [disabled]="!valid()" (click)="save()">Save persona rules</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button type="button" (click)="closed.emit()">Close</button></form>
    </dialog>
  `,
})
export class PersonaRulesComponent {
  routing = input.required<StageTemplate>();
  trade = input.required<Job['trade']>();
  closed = output<void>();
  saved = output<void>();
  fields = STEP_CONDITION_FIELDS.filter(field => !field.stepAnswer);
  roles: string[] = [...ROLES];
  rules: NonNullable<StageTemplate['roleRules']> = [];
  newClause = newConditionClause;
  ngOnInit() {
    this.rules = structuredClone(this.routing().roleRules ?? []);
    this.roles = [...new Set([...this.roles, ...Object.values(getTemplates()).flatMap(rows => rows.flatMap(row => [row.role ?? '', ...(row.roleRules ?? []).map(rule => rule.role)]))])].filter(Boolean).sort();
  }
  typed(clause: ConditionClause) { return clauseTyped(this.fields, clause); }
  options(key: string) { return conditionValueOptions(this.fields, key); }
  validClause(clause: ConditionClause) { return this.fields.some(field => field.key === clause.field) && clauseValid(this.fields, clause); }
  valid() { return this.rules.every(rule => !!rule.role && rule.when.every(clause => this.validClause(clause))); }
  add() { this.rules.push({ when: [newConditionClause()], role: this.routing().role ?? 'Inspector' }); }
  patch(ri: number, ci: number, patch: Partial<ConditionClause>) { this.rules[ri].when[ci] = patchClause(this.fields, this.rules[ri].when[ci], patch); }
  toggle(ri: number, ci: number, value: string) {
    const clause = this.rules[ri].when[ci];
    this.patch(ri, ci, { values: clause.values.includes(value) ? clause.values.filter(item => item !== value) : [...clause.values, value] });
  }
  move(index: number, delta: number) {
    const target = index + delta;
    if (target >= 0 && target < this.rules.length) [this.rules[index], this.rules[target]] = [this.rules[target], this.rules[index]];
  }
  save() {
    if (!this.valid()) return;
    updateStageTemplate(this.trade(), this.routing().id, { roleRules: structuredClone(this.rules) });
    this.saved.emit();
    this.closed.emit();
  }
}

export function personaRuleSummary(template: StageTemplate): string {
  if (!template.roleRules?.length) return template.role ?? '';
  return [...(template.roleRules ?? []).map(rule => `${describeConditions([rule.when])} → ${rule.role}`), `Otherwise: ${template.role ?? ''}`].join('; ');
}
