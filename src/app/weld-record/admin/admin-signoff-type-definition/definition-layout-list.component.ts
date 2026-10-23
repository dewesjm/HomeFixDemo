/* Admin > Signoff Type Definition's Layout list: the order the form draws a definition's ticked
   fields in, which share a line, their widths, headings (optionally starting a box), and where
   Inspection Results goes. Edits are emitted as the new list. */
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideArrowDown, LucideArrowUp, LucidePlus, LucideX } from '@lucide/angular';
import { DECISION_KEY, FieldActivation, HEADING_KEY_PREFIX, isHeadingItem } from '../../signoff-definition/step-field-config';
import { isVerifyRow, lookupCatalogField } from '../../signoff-definition/field-catalog';
import { definitionFieldNote } from '../../signoff-definition/stage-rules';
import { drawnOutsideForm } from '../../signoff-definition/signoff-parts';

let seq = 0;

@Component({
  selector: 'app-definition-layout-list',
  standalone: true,
  imports: [FormsModule, LucideArrowDown, LucideArrowUp, LucidePlus, LucideX],
  templateUrl: './definition-layout-list.component.html',
})
export class DefinitionLayoutListComponent {
  items = input.required<FieldActivation[]>();
  stepId = input.required<string>();
  itemsChange = output<FieldActivation[]>();

  readonly isHeading = isHeadingItem;

  isDecision(a: FieldActivation): boolean {
    return a.key === DECISION_KEY;
  }

  /* Type, Comments and References keep their own spot outside the form, whatever the order */
  isOutsideForm(a: FieldActivation): boolean {
    return drawnOutsideForm(a.key);
  }

  /* drawn as a block the width of the form: a verify-grid row (the grid goes where its first shown
     row is) or Signoff History; no width or same line */
  isBlockItem(a: FieldActivation): boolean {
    return isVerifyRow(a.key) || a.key === 'signoffHistory';
  }

  fieldNote(a: FieldActivation): string {
    return definitionFieldNote(this.stepId(), a.key);
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

  moveItem(i: number, by: -1 | 1) {
    this.update(items => {
      const j = i + by;
      if (j < 0 || j >= items.length) return items;
      [items[i], items[j]] = [items[j], items[i]];
      return items;
    });
  }

  /* unticked layout settings and blank widths are left off the saved definition */
  setItem(i: number, partial: Partial<FieldActivation>) {
    this.update(items => items.map((a, idx) => {
      if (idx !== i) return a;
      const next = { ...a, ...partial };
      if (!next.sameLine) delete next.sameLine;
      if (!next.newBox) delete next.newBox;
      if (!next.width || next.width <= 0) delete next.width;
      return next;
    }));
  }

  addHeading() {
    this.update(items => [...items, { key: `${HEADING_KEY_PREFIX}${Date.now()}-${++seq}`, heading: '' }]);
  }

  removeHeading(i: number) {
    this.update(items => items.filter((_, idx) => idx !== i));
  }
}
