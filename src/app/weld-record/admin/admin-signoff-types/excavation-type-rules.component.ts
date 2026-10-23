/* Excavation's dynamic Type source and material exceptions are saved with its availability row. */
import { Component, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EXCAVATION_TYPE_ROW, getSignoffTypeRows, setSignoffTypeRows, SignoffTypeRow } from '../../signoff-definition/signoff-types';
import { NDT_KINDS } from '../../routing/ndt';
@Component({
  selector: 'app-excavation-type-rules', standalone: true, imports: [FormsModule],
  template: `
    <h3 class="text-lg font-semibold mt-6">Excavation NDT Type</h3>
    <p class="text-sm mb-2">Type comes from the inspection that rejected the joint. The first matching exception below replaces it. Material conditions test either member using Admin &gt; Material Classification.</p>
    <label class="flex items-center gap-2 mb-2">Type source
      <select class="select select-sm" [(ngModel)]="source" aria-label="Excavation Type source">
        <option value="rejecting-inspection">Rejecting inspection</option>
        <option value="">Options on the routing row</option>
      </select>
    </label>
    <table class="table table-sm"><thead><tr><th>Rejecting Type</th><th>When either material is</th><th>Use Type</th><th></th></tr></thead><tbody>
      @for (r of rules; track $index; let i = $index) {
        <tr><td><select class="select select-sm" [(ngModel)]="r.from" aria-label="Rejecting Type">
          @for (t of types; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
        </select></td><td><select class="select select-sm" [(ngModel)]="r.materialFlag" aria-label="Material condition">
          <option value="nonFerrousOrAustenitic">Non-ferrous or austenitic</option><option value="titanium">Titanium</option><option value="">Always</option>
        </select></td><td><select class="select select-sm" [(ngModel)]="r.to" aria-label="Replacement Type">
          @for (t of types; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
        </select></td><td>
          <button class="btn btn-xs" (click)="move(i, -1)" [disabled]="i === 0">Up</button>
          <button class="btn btn-xs" (click)="move(i, 1)" [disabled]="i === rules.length - 1">Down</button>
          <button class="btn btn-xs" (click)="rules.splice(i, 1)">Remove</button>
        </td></tr>
      }
    </tbody></table>
    <div class="flex gap-2 mt-2"><button class="btn btn-sm" (click)="add()">Add exception</button>
      <button class="btn btn-sm btn-primary" (click)="save()">Save Type rules</button><span role="status">{{ message }}</span></div>
  `,
})
export class ExcavationTypeRulesComponent {
  saved = output<void>();
  types = Object.values(NDT_KINDS).flatMap(k => k.options);
  private row = getSignoffTypeRows().find(r => r.stepId === EXCAVATION_TYPE_ROW);
  source = this.row?.typeSource ?? '';
  rules = structuredClone(this.row?.typeExceptions ?? []);
  message = '';
  add() { this.rules.push({ from: 'pt', to: '5x', materialFlag: 'nonFerrousOrAustenitic' }); }
  move(i: number, delta: number) {
    const j = i + delta;
    if (j >= 0 && j < this.rules.length) [this.rules[i], this.rules[j]] = [this.rules[j], this.rules[i]];
  }
  save() {
    const rows = getSignoffTypeRows();
    const patch: SignoffTypeRow = { ...(rows.find(r => r.stepId === EXCAVATION_TYPE_ROW) ?? { stepId: EXCAVATION_TYPE_ROW, types: [] }),
      typeSource: this.source === 'rejecting-inspection' ? 'rejecting-inspection' : undefined, typeExceptions: structuredClone(this.rules) };
    setSignoffTypeRows([...rows.filter(r => r.stepId !== EXCAVATION_TYPE_ROW), patch]);
    this.message = 'Type rules saved';
    this.saved.emit();
  }
}
