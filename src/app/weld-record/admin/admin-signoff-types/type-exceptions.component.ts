import { insertionRelativeTargets } from '../../routing/insertion-target-options';
/* Shared ordered Type replacements, saved independently for each routing. */
import { Component, input, OnInit, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EXCAVATION_TYPE_ROW, getSignoffTypeRows, setSignoffTypeRows, SignoffTypeRow } from '../../signoff-definition/signoff-types';
import { getRoutingSignoffTypes } from '../../signoff-definition/routing-signoff-types';
import { getTemplates } from '../../routing/stage-templates';
import { TypeEnableConditionsComponent } from './type-enable-conditions.component';
import { typeExceptionCondition } from '../../signoff-definition/type-exceptions';
@Component({
  selector: 'app-type-exceptions', standalone: true, imports: [FormsModule, TypeEnableConditionsComponent],
  template: `
    <section aria-label="Type Exceptions">
    <h3 class="text-lg font-semibold mt-6">Type Exceptions</h3>
    <label>Routing <select class="select select-sm" aria-label="Exception routing" [disabled]="dirty()" [ngModel]="selectedId" (ngModelChange)="selectRouting($event)">
      @for (r of routings; track r.id) { <option [value]="r.id">{{ r.label }}</option> }
    </select></label>
    <p class="text-sm mb-2">The first matching exception replaces each original Type once. Configured enable conditions still apply. Save or cancel before changing routing. Changes apply to future instances; recorded inserted choices stay unchanged.</p>
    <label class="flex items-center gap-2 mb-2">Type source
      <select class="select select-sm" [(ngModel)]="source" aria-label="Type source">
        @if (canInherit) { <option value="rejecting-inspection">Rejecting inspection</option> }
        <option value="">Options on the routing row</option>
      </select>
    </label>
    <table class="table table-sm"><thead><tr><th>Original Type</th><th>Conditions</th><th>Use Type</th><th></th></tr></thead><tbody>
      @for (r of rules; track $index; let i = $index) {
        <tr><td><select class="select select-sm" [(ngModel)]="r.from" aria-label="Original Type">
          @for (t of types; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
        </select></td><td><select class="select select-sm" [(ngModel)]="r.materialFlag" aria-label="Material condition">
          <option value="nonFerrousOrAustenitic">Non-ferrous or austenitic</option><option value="titanium">Titanium</option><option value="">Always</option>
        </select><app-type-enable-conditions [rules]="r.when ?? []" [listId]="selectedId + i" (changed)="r.when = $event" /></td><td><select class="select select-sm" [(ngModel)]="r.to" aria-label="Replacement Type">
          @for (t of types; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
        </select></td><td>
          <button class="btn btn-xs" (click)="move(i, -1)" [disabled]="i === 0">Up</button>
          <button class="btn btn-xs" (click)="move(i, 1)" [disabled]="i === rules.length - 1">Down</button>
          <button class="btn btn-xs" (click)="rules.splice(i, 1)">Remove</button>
        </td></tr>
      }
    </tbody></table><p class="text-sm" aria-label="Effective Type path">{{ summary() }}</p>
    <div class="flex gap-2 mt-2"><button class="btn btn-sm" (click)="add()">Add exception</button>
      <button class="btn btn-sm btn-primary" (click)="save()">Save Type rules</button><button class="btn btn-sm" (click)="reset()">Cancel Type rules</button><span role="status">{{ message }}</span></div>
    </section>
  `,
})
export class TypeExceptionsComponent implements OnInit {
  definitionId = input(EXCAVATION_TYPE_ROW);
  saved = output<void>();
  types = getRoutingSignoffTypes();
  get routings() { return (getTemplates()['Welding'] ?? []).filter(t => getSignoffTypeRows().some(r => r.stepId === t.id)); }
  selectedId = EXCAVATION_TYPE_ROW;
  get canInherit() { const routing = this.routings.find(r => r.id === this.selectedId);
    return routing?.lifecycle === 'excavation' || (routing?.classification === 'added' && routing.lifecycle === 'ordinary' &&
      insertionRelativeTargets(this.selectedId, getTemplates()['Welding'] ?? []).some(t => t.id === 'rejecting-ndt'));  }
  selectRouting(id: string) { this.selectedId = id; this.reset(); }
  summary() {
    const source = this.source ? 'Rejecting inspection' : 'Enabled configured options';
    return source + ' -> first matching exception, otherwise original Type. ' + this.rules.map((r, i) =>
      `${i + 1}. ${this.types.find(t => t.value === r.from)?.label ?? r.from} -> ${this.types.find(t => t.value === r.to)?.label ?? r.to}: ${typeExceptionCondition(r)}`).join('; ');
  }
  source: string = '';
  rules: NonNullable<SignoffTypeRow['typeExceptions']> = [];
  ngOnInit() { this.selectedId = this.definitionId(); this.reset(); }
  reset() {
    const row = getSignoffTypeRows().find(r => r.stepId === this.selectedId);
    this.source = row?.typeSource ?? '';
    this.rules = structuredClone(row?.typeExceptions ?? []);
    this.message = '';
  }
  dirty() {
    const row = getSignoffTypeRows().find(r => r.stepId === this.selectedId);
    return this.source !== (row?.typeSource ?? '') || JSON.stringify(this.rules) !== JSON.stringify(row?.typeExceptions ?? []);
  }
  message = '';
  add() { this.rules.push({ from: 'pt', to: '5x', materialFlag: 'nonFerrousOrAustenitic' }); }
  move(i: number, delta: number) {
    const j = i + delta;
    if (j >= 0 && j < this.rules.length) [this.rules[i], this.rules[j]] = [this.rules[j], this.rules[i]];
  }
  save() {
    if (this.source && !this.canInherit) { this.message = 'Rejecting inspection context is unavailable for this routing'; return; }
    if (this.rules.some(r => !this.types.some(t => t.value === r.from) || !this.types.some(t => t.value === r.to))) {
      this.message = 'Select an existing original and replacement Type for every exception'; return;
    }
    const rows = getSignoffTypeRows();
    const patch: SignoffTypeRow = { ...(rows.find(r => r.stepId === this.selectedId) ?? { stepId: this.selectedId, types: [] }),
      typeSource: this.source === 'rejecting-inspection' ? 'rejecting-inspection' : undefined, typeExceptions: structuredClone(this.rules) };
    setSignoffTypeRows([...rows.filter(r => r.stepId !== this.selectedId), patch]);
    this.message = 'Type rules saved';
    this.saved.emit();
  }
}
