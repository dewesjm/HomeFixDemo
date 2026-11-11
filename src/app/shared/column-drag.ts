/* Dragging a results table's column headings to reorder them (both Advanced Search pages). A drag is
   only armed when the press starts outside the heading's filter box, so typing/selecting there still works. */
import { WritableSignal, signal } from '@angular/core';

export class ColumnDrag {
  armedCol = signal<string | null>(null);
  dragCol = signal<string | null>(null);
  dropAt = signal<{ key: string; before: boolean } | null>(null);

  constructor(private columnKeys: WritableSignal<string[]>) {}

  arm(e: MouseEvent, key: string) {
    const t = e.target as HTMLElement;
    this.armedCol.set(t.closest('input, select, button, label, app-multiselect-dropdown') ? null : key);
  }

  start(e: DragEvent, key: string) {
    this.dragCol.set(key);
    e.dataTransfer?.setData('text/plain', key);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  over(e: DragEvent, key: string) {
    const from = this.dragCol();
    if (!from) return;
    e.preventDefault();
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.dropAt.set(key === from ? null : { key, before: e.clientX < box.left + box.width / 2 });
  }

  drop(e: DragEvent) {
    e.preventDefault();
    const from = this.dragCol(), at = this.dropAt();
    if (from && at) {
      const keys = this.columnKeys().filter(k => k !== from);
      const i = keys.indexOf(at.key);
      keys.splice(at.before ? i : i + 1, 0, from);
      this.columnKeys.set(keys);
    }
    this.end();
  }

  end() {
    this.dragCol.set(null);
    this.dropAt.set(null);
    this.armedCol.set(null);
  }
}
