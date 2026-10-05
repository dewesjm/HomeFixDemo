/* Edits one AND/OR group of a qual condition's requirement (data/qual-requirements.ts). Items are
   quals or nested groups, which render this same editor. Each qual carries a toggle for whether the
   Test User holds it; the parent saves that right away. Edits are emitted as a new group. */
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideX } from '@lucide/angular';
import { QualGroup, QualTerm } from '../../../data/qual-requirements';

@Component({
  selector: 'app-qual-group-editor',
  standalone: true,
  imports: [FormsModule, LucideX],
  templateUrl: './qual-group-editor.component.html'
})
export class QualGroupEditorComponent {
  group = input.required<QualGroup>();
  held = input.required<readonly string[]>();
  allQuals = input.required<readonly string[]>();
  nested = input(false);
  changed = output<QualGroup>();
  removed = output<void>();
  toggleHeld = output<string>();

  asGroup(t: QualTerm): QualGroup | null {
    return typeof t === 'string' ? null : t;
  }

  asQual(t: QualTerm): string {
    return typeof t === 'string' ? t : '';
  }

  /* quals not already directly in this group */
  addable(): string[] {
    return this.allQuals().filter(q => !this.group().items.includes(q));
  }

  setOp(op: 'all' | 'any') {
    this.changed.emit({ ...this.group(), op });
  }

  addQual(q: string) {
    if (q) this.changed.emit({ ...this.group(), items: [...this.group().items, q] });
  }

  /* a new group starts as the opposite operator, since a group of the same kind adds nothing */
  addGroup() {
    const op = this.group().op === 'all' ? 'any' : 'all';
    this.changed.emit({ ...this.group(), items: [...this.group().items, { op, items: [] }] });
  }

  setItem(i: number, g: QualGroup) {
    this.changed.emit({ ...this.group(), items: this.group().items.map((t, j) => j === i ? g : t) });
  }

  removeItem(i: number) {
    this.changed.emit({ ...this.group(), items: this.group().items.filter((_, j) => j !== i) });
  }
}
