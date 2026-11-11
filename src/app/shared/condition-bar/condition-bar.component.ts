/* The Advanced Search filter bar both search pages use (Pipe Welding and Weld Planning's Advanced
   Search): one column per field, each stacking its own conditions, plus the "Add field" tile.
   Matching is shared/filter-engine.ts; the page owns the values and which fields are in the bar. */
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideX, LucidePlus } from '@lucide/angular';

import { MultiselectDropdownComponent } from '../multiselect-dropdown.component';
import { DateRangeComponent } from '../date-range.component';
import { TooltipDirective } from '../tooltip.directive';
import {
  Condition, FilterValues, MatchField, Op, OPS_BY_KIND, opLabel, isExclude, needsNoValue, newCondition, activeConditions, isoDay
} from '../filter-engine';

export interface BarField extends MatchField { label: string }

@Component({
  selector: 'app-condition-bar',
  standalone: true,
  imports: [FormsModule, MultiselectDropdownComponent, DateRangeComponent, TooltipDirective, LucideX, LucidePlus],
  templateUrl: './condition-bar.component.html',
  /* the bar lays out as if it sat straight in the page */
  host: { style: 'display: contents' }
})
export class ConditionBarComponent {
  fields = input.required<BarField[]>();
  values = input.required<FilterValues>();
  /* a list field's choices */
  optionsFor = input.required<(key: string) => { label: string; value: string }[]>();
  valuesChange = output<FilterValues>();
  /* the "Add field" tile */
  adapt = output<void>();

  /* what the bar shows for a field: its conditions, or one empty one to type into */
  conditionsOf(f: BarField): Condition[] {
    const c = this.values()[f.key];
    return c?.length ? c : [newCondition(f.kind)];
  }

  private setConditions(key: string, conds: Condition[]) {
    this.valuesChange.emit({ ...this.values(), [key]: conds });
  }

  updateCondition(f: BarField, i: number, patch: Partial<Condition>) {
    this.setConditions(f.key, this.conditionsOf(f).map((c, n) => (n === i ? { ...c, ...patch } : c)));
  }

  setOp(f: BarField, i: number, op: Op) {
    /* list fields keep their picks between is / is not, and typed text between the text operators */
    this.updateCondition(f, i, { op, ...(op === 'between' ? {} : { to: '' }) });
  }

  addCondition(f: BarField) {
    this.setConditions(f.key, [...this.conditionsOf(f), newCondition(f.kind)]);
  }

  /* a field's only line, still empty, has nothing to remove */
  canRemoveCondition(f: BarField, c: Condition): boolean {
    return this.conditionsOf(f).length > 1 || activeConditions(f, [c]).length > 0;
  }

  removeCondition(f: BarField, i: number) {
    this.setConditions(f.key, this.conditionsOf(f).filter((_, n) => n !== i));
  }

  /* the word shown in front of a stacked condition: includes are OR'd, excludes must all hold */
  joinWord(c: Condition): string { return isExclude(c.op) ? 'and' : 'or'; }

  numStr(v: number | null): string { return v == null ? '' : String(v); }

  opsFor(f: BarField) { return OPS_BY_KIND[f.kind].map(op => ({ op, label: opLabel(op, f.kind) })); }
  needsNoValue = needsNoValue;
  /* the operator box fits the chosen operator, so short ones (is) leave room for the value */
  opWidth(op: Op, f: BarField): number { return opLabel(op, f.kind).length + 5; }

  /* between on a date field: app-date-range works in Dates, the condition stores yyyy-mm-dd */
  asDate(s: string): Date | null { return s ? new Date(s + 'T00:00:00') : null; }
  setDateBetween(f: BarField, i: number, [from, to]: [Date | null, Date | null]) {
    this.updateCondition(f, i, { value: isoDay(from), to: isoDay(to) });
  }
}
