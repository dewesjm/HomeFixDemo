/* Edits a grid field's rows on a procedure: one row per line, one input per column (set in Admin >
   Procedure Sections), Add Row and a remove button per row. Changes the value it's given in place. */
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucideX } from '@lucide/angular';
import type { ExtraField, GridColumn, GridRow, GridValue, RangeValue } from '../procedure-sections';

@Component({
  selector: 'app-procedure-grid-editor',
  standalone: true,
  imports: [FormsModule, LucidePlus, LucideX],
  templateUrl: './grid-editor.component.html'
})
export class ProcedureGridEditorComponent {
  field = input.required<ExtraField>();
  value = input.required<GridValue>();

  columns(): GridColumn[] {
    return this.field().columns ?? [];
  }

  /* a range cell, made on first use so its Min and Max can bind */
  range(row: GridRow, key: string): RangeValue {
    const c = row[key];
    if (typeof c === 'object' && c !== null) return c;
    const blank: RangeValue = { min: null, max: null };
    row[key] = blank;
    return blank;
  }

  addRow() {
    const row: GridRow = {};
    for (const c of this.columns()) row[c.key] = c.type === 'number' ? null : c.type === 'range' ? { min: null, max: null } : '';
    this.value().rows.push(row);
  }

  removeRow(i: number) {
    this.value().rows.splice(i, 1);
  }
}
