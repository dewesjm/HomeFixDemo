import { Component, computed, input, model, signal } from '@angular/core';
import { LucideGripVertical } from '@lucide/angular';

/* column picker body: the shown columns in their grid order (drag or arrows to reorder), then the rest.
   Native HTML drag and drop; the arrows cover touch and keyboard. */
@Component({
  selector: 'app-column-order-list',
  standalone: true,
  imports: [LucideGripVertical],
  styles: [`
    .col-head { font-weight: 600; margin: 0.5rem 0 0.25rem; }
    .col-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem; border-top: 2px solid transparent; border-bottom: 2px solid transparent; }
    .col-row[draggable="true"] { cursor: grab; }
    .col-row.dragging { opacity: 0.5; }
    .col-row.drop-above { border-top-color: currentColor; }
    .col-row.drop-below { border-bottom-color: currentColor; }
    .col-row label { display: flex; align-items: center; gap: 0.5rem; flex: 1; cursor: pointer; }
  `],
  template: `
    <div class="col-head">Shown, in order (drag to reorder)</div>
    @for (c of shown(); track c.key; let first = $first, last = $last) {
      <div class="col-row" draggable="true"
           [class.dragging]="dragKey() === c.key" [class.drop-above]="dropSide(c.key) === 'above'" [class.drop-below]="dropSide(c.key) === 'below'"
           (dragstart)="onDragStart($event, c.key)" (dragover)="onDragOver($event, c.key)"
           (drop)="onDrop($event, c.key)" (dragend)="clearDrag()">
        <svg lucideGripVertical class="size-4" aria-hidden="true"></svg>
        <label>
          <input type="checkbox" class="checkbox checkbox-sm" checked (change)="toggle(c.key, false)" />
          <span>{{ c.label }}</span>
        </label>
        <button type="button" class="btn btn-ghost btn-xs" [disabled]="first" (click)="move(c.key, -1)"
                [attr.aria-label]="'Move ' + c.label + ' up'">▲</button>
        <button type="button" class="btn btn-ghost btn-xs" [disabled]="last" (click)="move(c.key, 1)"
                [attr.aria-label]="'Move ' + c.label + ' down'">▼</button>
      </div>
    } @empty {
      <div class="empty">No columns shown{{ filter() ? ' match "' + filter() + '"' : '' }}.</div>
    }

    <div class="col-head">Not shown</div>
    @for (c of hidden(); track c.key) {
      <div class="col-row">
        <label>
          <input type="checkbox" class="checkbox checkbox-sm" (change)="toggle(c.key, true)" />
          <span>{{ c.label }}</span>
        </label>
      </div>
    } @empty {
      <div class="empty">{{ filter() ? 'No other columns match "' + filter() + '"' : 'Every column is shown' }}.</div>
    }
  `
})
export class ColumnOrderListComponent {
  columns = input.required<{ key: string; label: string }[]>();
  keys = model.required<string[]>();
  filter = input('');

  dragKey = signal('');
  overKey = signal('');

  private matches = (label: string) => {
    const q = this.filter().trim().toLowerCase();
    return !q || label.toLowerCase().includes(q);
  };

  shown = computed(() => this.keys()
    .map(k => this.columns().find(c => c.key === k))
    .filter((c): c is { key: string; label: string } => !!c && this.matches(c.label)));

  hidden = computed(() => this.columns().filter(c => !this.keys().includes(c.key) && this.matches(c.label)));

  /* checking adds to the end of the shown list */
  toggle(key: string, on: boolean) {
    const rest = this.keys().filter(k => k !== key);
    this.keys.set(on ? [...rest, key] : rest);
  }

  /* moves within the visible (possibly filtered) list, so up/down always steps past a row you can see */
  move(key: string, dir: -1 | 1) {
    const visible = this.shown().map(c => c.key);
    const neighbour = visible[visible.indexOf(key) + dir];
    if (!neighbour) return;
    const a = [...this.keys()];
    const i = a.indexOf(key), j = a.indexOf(neighbour);
    [a[i], a[j]] = [a[j], a[i]];
    this.keys.set(a);
  }

  onDragStart(e: DragEvent, key: string) {
    this.dragKey.set(key);
    e.dataTransfer?.setData('text/plain', key);   /* Firefox won't start a drag without data */
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  onDragOver(e: DragEvent, key: string) {
    if (!this.dragKey()) return;
    e.preventDefault();
    this.overKey.set(key);
  }

  dropSide(key: string): '' | 'above' | 'below' {
    const from = this.dragKey();
    if (!from || from === key || this.overKey() !== key) return '';
    return this.keys().indexOf(from) < this.keys().indexOf(key) ? 'below' : 'above';
  }

  /* dragging up lands above the drop row, dragging down lands below it (so the last spot is reachable) */
  onDrop(e: DragEvent, targetKey: string) {
    e.preventDefault();
    const from = this.dragKey();
    if (from && from !== targetKey) {
      const movingDown = this.keys().indexOf(from) < this.keys().indexOf(targetKey);
      const a = this.keys().filter(k => k !== from);
      a.splice(a.indexOf(targetKey) + (movingDown ? 1 : 0), 0, from);
      this.keys.set(a);
    }
    this.clearDrag();
  }

  clearDrag() {
    this.dragKey.set('');
    this.overKey.set('');
  }
}
