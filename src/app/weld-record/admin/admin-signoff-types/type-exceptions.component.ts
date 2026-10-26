import { Component, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2, LucideArrowUp, LucideArrowDown, LucideGripVertical } from '@lucide/angular';
import { getSignoffTypeRows, setSignoffTypeRows } from '../../signoff-definition/signoff-types';
import { getRoutingSignoffTypes } from '../../signoff-definition/routing-signoff-types';
import { getTemplates } from '../../routing/stage-templates';
import { TypeEnableConditionsComponent } from './type-enable-conditions.component';
import { TypeException, typeExceptionCondition } from '../../signoff-definition/type-exceptions';

interface ExceptionRow { id: number; routing: string; rule: TypeException; }

@Component({
  selector: 'app-type-exceptions', standalone: true,
  imports: [FormsModule, TypeEnableConditionsComponent, LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2, LucideArrowUp, LucideArrowDown, LucideGripVertical],
  templateUrl: './type-exceptions.component.html',
})
export class TypeExceptionsComponent {
  saved = output<void>();
  types = getRoutingSignoffTypes();
  get routings() { return (getTemplates()['Welding'] ?? []).filter(t => getSignoffTypeRows().some(r => r.stepId === t.id)); }
  private seq = 0;
  rows: ExceptionRow[] = this.load();
  editing: number | null = null;
  private original?: ExceptionRow;
  dragId: number | null = null;
  message = '';
  condition = typeExceptionCondition;
  label(id: string) { return this.routings.find(r => r.id === id)?.label ?? id; }
  typeLabel(id: string) { return this.types.find(t => t.value === id)?.label ?? id; }
  private load(): ExceptionRow[] {
    return getSignoffTypeRows().flatMap(r => (r.typeExceptions ?? []).map(rule => ({ id: ++this.seq, routing: r.stepId, rule: structuredClone(rule) })));
  }
  add() {
    const row = { id: ++this.seq, routing: '', rule: { from: 'pt', to: '5x', materialFlag: 'nonFerrousOrAustenitic' as const } };
    this.rows = [row, ...this.rows]; this.editing = row.id; this.original = undefined;
  }
  edit(row: ExceptionRow) { this.original = structuredClone(row); this.editing = row.id; }
  cancel(row: ExceptionRow) {
    this.rows = this.original ? this.rows.map(r => r.id === row.id ? this.original! : r) : this.rows.filter(r => r.id !== row.id);
    this.editing = null; this.original = undefined; this.message = '';
  }
  save(row: ExceptionRow) {
    if (!this.routings.some(r => r.id === row.routing) || !this.types.some(t => t.value === row.rule.from) || !this.types.some(t => t.value === row.rule.to)) {
      this.message = 'Select a routing and existing original and replacement Types.'; return;
    }
    this.editing = null; this.original = undefined; this.persist();
  }
  remove(row: ExceptionRow) { this.rows = this.rows.filter(r => r.id !== row.id); this.persist(); }
  siblings(row: ExceptionRow) { return this.rows.filter(r => r.routing === row.routing); }
  canMove(row: ExceptionRow, delta: number) {
    const siblings = this.siblings(row); const index = siblings.indexOf(row) + delta;
    return this.editing === null && index >= 0 && index < siblings.length;
  }
  move(row: ExceptionRow, delta: number) {
    if (!this.canMove(row, delta)) return;
    this.reorder(row, this.siblings(row)[this.siblings(row).indexOf(row) + delta]);
  }
  private reorder(row: ExceptionRow, target: ExceptionRow) {
    const from = this.rows.indexOf(row), to = this.rows.indexOf(target);
    this.rows.splice(from, 1); this.rows.splice(to, 0, row); this.persist();
  }
  startDrag(event: DragEvent, row: ExceptionRow) {
    if (this.editing !== null) { event.preventDefault(); return; }
    this.dragId = row.id; event.dataTransfer?.setData('text/plain', String(row.id));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }
  dragOver(event: DragEvent, row: ExceptionRow) {
    if (this.dragId !== row.id && this.rows.some(r => r.id === this.dragId && r.routing === row.routing)) event.preventDefault();
  }
  drop(event: DragEvent, row: ExceptionRow) {
    event.preventDefault(); const from = this.rows.find(r => r.id === this.dragId);
    if (from && from !== row && from.routing === row.routing && this.editing === null) this.reorder(from, row);
    this.dragId = null;
  }
  private persist() {
    setSignoffTypeRows(getSignoffTypeRows().map(r => ({ ...r, typeExceptions: this.rows.filter(e => e.routing === r.stepId).map(e => structuredClone(e.rule)) })));
    this.message = 'Type exceptions saved'; this.saved.emit();
  }
}
