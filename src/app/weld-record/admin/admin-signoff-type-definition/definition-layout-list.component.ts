/* Admin > Signoff Type Forms's Layout list: the line number of each of a definition's ticked
   fields and headings (optionally starting a box), which also places Inspection Results, and the
   fields' widths. The list is kept sorted by line number; the arrows reorder within a line. Edits are
   emitted as the new list. */
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideArrowDown, LucideArrowUp, LucidePlus, LucideX } from '@lucide/angular';
import { DECISION_KEY, FieldActivation, HEADING_KEY_PREFIX, isHeadingItem } from '../../signoff-definition/step-field-config';
import { isVerifyRow, lookupCatalogField } from '../../signoff-definition/field-catalog';
import { definitionFieldNote } from '../../signoff-definition/stage-rules';
import { inLineOrder, nextLine } from '../../signoff-definition/definition-layout';

let seq = 0;

@Component({
  selector: 'app-definition-layout-list',
  standalone: true,
  imports: [FormsModule, LucideArrowDown, LucideArrowUp, LucidePlus, LucideX],
  templateUrl: './definition-layout-list.component.html',
})
export class DefinitionLayoutListComponent {
  items = input.required<FieldActivation[]>();
  typeId = input.required<string>();
  itemsChange = output<FieldActivation[]>();

  readonly isHeading = isHeadingItem;

  isDecision(a: FieldActivation): boolean {
    return a.key === DECISION_KEY;
  }

  /* drawn as a block the width of the form: a verify-grid row (the grid goes where its first shown
     row is), Signoff History or References; no width, and always on a line of its own */
  isBlockItem(a: FieldActivation): boolean {
    return isVerifyRow(a.key) || a.key === 'signoffHistory' || a.key === 'references';
  }

  fieldNote(a: FieldActivation): string {
    return definitionFieldNote(this.typeId(), a.key);
  }

  blockNote(a: FieldActivation): string {
    return isVerifyRow(a.key) ? 'A row of the verify grid, which is drawn where its first shown row is.' : this.fieldNote(a);
  }

  itemLabel(a: FieldActivation): string {
    return lookupCatalogField(a.key)?.label ?? a.key;
  }

  private update(change: (items: FieldActivation[]) => FieldActivation[]) {
    this.itemsChange.emit(change([...this.items()]));
  }

  /* the arrows only swap items on the same line */
  canMove(i: number, by: -1 | 1): boolean {
    const items = this.items();
    return items[i + by] !== undefined && items[i + by].line === items[i].line;
  }

  moveItem(i: number, by: -1 | 1) {
    if (!this.canMove(i, by)) return;
    this.update(items => {
      const j = i + by;
      [items[i], items[j]] = [items[j], items[i]];
      return items;
    });
  }

  /* a whole number from 1 moves the item to that line, after what's already on it; anything else puts
     the box back to the item's line */
  setLine(i: number, box: HTMLInputElement) {
    const line = box.valueAsNumber;
    if (!Number.isInteger(line) || line < 1) {
      box.value = String(this.items()[i].line ?? '');
      return;
    }
    this.update(items => {
      const moved = { ...items[i], line };
      return inLineOrder([...items.filter((_, idx) => idx !== i), moved]);
    });
  }

  /* unticked layout settings and blank widths are left off the saved definition */
  setItem(i: number, partial: Partial<FieldActivation>) {
    this.update(items => items.map((a, idx) => {
      if (idx !== i) return a;
      const next = { ...a, ...partial };
      if (!next.newBox) delete next.newBox;
      if (!next.width || next.width <= 0) delete next.width;
      return next;
    }));
  }

  addHeading() {
    this.update(items => [...items, { key: `${HEADING_KEY_PREFIX}${Date.now()}-${++seq}`, heading: '', line: nextLine(items) }]);
  }

  removeHeading(i: number) {
    this.update(items => items.filter((_, idx) => idx !== i));
  }
}
