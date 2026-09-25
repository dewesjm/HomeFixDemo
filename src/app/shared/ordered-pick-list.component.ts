import { Component, computed, input, model, signal } from '@angular/core';
import { LucideGripVertical } from '@lucide/angular';

export interface PickItem {
  key: string;
  label: string;
  required?: boolean;   /* always shown, can't be unchecked, can still be reordered */
  group?: string;       /* when items have groups, "Not shown" is split by group with add/remove all */
}

/* body of the column picker and Adapt Filters dialogs: what's shown, in order (drag or arrows to
   reorder), then the rest. Native HTML drag and drop; the arrows cover touch and keyboard. */
@Component({
  selector: 'app-ordered-pick-list',
  standalone: true,
  imports: [LucideGripVertical],
  styles: [`
    .pick-head { font-weight: 600; margin: 0.5rem 0 0.25rem; }
    .pick-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem; border-top: 2px solid transparent; border-bottom: 2px solid transparent; }
    .pick-row[draggable="true"] { cursor: grab; }
    .pick-row.dragging { opacity: 0.5; }
    .pick-row.drop-above { border-top-color: currentColor; }
    .pick-row.drop-below { border-bottom-color: currentColor; }
    .pick-row label { display: flex; align-items: center; gap: 0.5rem; flex: 1; cursor: pointer; }
    .pick-group { margin-bottom: 0.75rem; }
  `],
  template: `
    <div class="pick-head">Shown, in order (drag to reorder)</div>
    @for (c of shown(); track c.key; let first = $first, last = $last) {
      <div class="pick-row" draggable="true"
           [class.dragging]="dragKey() === c.key"
           [class.drop-above]="dropSide(c.key) === 'above'" [class.drop-below]="dropSide(c.key) === 'below'"
           (dragstart)="onDragStart($event, c.key)" (dragover)="onDragOver($event, c.key)"
           (drop)="onDrop($event, c.key)" (dragend)="clearDrag()">
        <svg lucideGripVertical class="size-4" aria-hidden="true"></svg>
        <label>
          <input type="checkbox" class="checkbox checkbox-sm" checked [disabled]="!!c.required" (change)="toggle(c.key, false)" />
          <span>{{ c.label }}</span>
          @if (c.required) { <span class="required-tag">required</span> }
        </label>
        <button type="button" class="btn btn-ghost btn-xs" [disabled]="first" (click)="move(c.key, -1)"
                [attr.aria-label]="'Move ' + c.label + ' up'">▲</button>
        <button type="button" class="btn btn-ghost btn-xs" [disabled]="last" (click)="move(c.key, 1)"
                [attr.aria-label]="'Move ' + c.label + ' down'">▼</button>
      </div>
    } @empty {
      <div class="empty">Nothing shown{{ filter() ? ' matches "' + filter() + '"' : '' }}.</div>
    }

    <div class="pick-head">Not shown</div>
    @if (grouped()) {
      @for (g of hiddenGroups(); track g.group) {
        <div class="pick-group">
          <div class="group-head">
            <span class="fw-bold">{{ g.group }}</span>
            <span class="spacer"></span>
            <button type="button" class="btn btn-ghost btn-xs" (click)="setGroup(g.group, true)">add all</button>
            <button type="button" class="btn btn-ghost btn-xs" (click)="setGroup(g.group, false)">remove all</button>
          </div>
          <div class="field-grid">
            @for (c of g.items; track c.key) {
              <div class="pick-row">
                <label>
                  <input type="checkbox" class="checkbox checkbox-sm" (change)="toggle(c.key, true)" />
                  <span>{{ c.label }}</span>
                </label>
              </div>
            } @empty {
              <div>All shown.</div>
            }
          </div>
        </div>
      } @empty {
        <div class="empty">Nothing matches "{{ filter() }}".</div>
      }
    } @else {
      @for (c of hidden(); track c.key) {
        <div class="pick-row">
          <label>
            <input type="checkbox" class="checkbox checkbox-sm" (change)="toggle(c.key, true)" />
            <span>{{ c.label }}</span>
          </label>
        </div>
      } @empty {
        <div class="empty">{{ filter() ? 'Nothing else matches "' + filter() + '"' : 'Everything is shown' }}.</div>
      }
    }
  `
})
export class OrderedPickListComponent {
  items = input.required<PickItem[]>();
  keys = model.required<string[]>();
  filter = input('');

  dragKey = signal('');
  overKey = signal('');

  private matches = (label: string) => {
    const q = this.filter().trim().toLowerCase();
    return !q || label.toLowerCase().includes(q);
  };

  shown = computed(() => this.keys()
    .map(k => this.items().find(c => c.key === k))
    .filter((c): c is PickItem => !!c && this.matches(c.label)));

  hidden = computed(() => this.items().filter(c => !this.keys().includes(c.key) && this.matches(c.label)));

  grouped = computed(() => this.items().some(c => c.group));

  /* every group with a matching item, even when all of it is shown, so "remove all" stays reachable */
  hiddenGroups = computed(() => {
    const groups = [...new Set(this.items().filter(c => this.matches(c.label)).map(c => c.group ?? ''))];
    return groups.map(group => ({ group, items: this.hidden().filter(c => (c.group ?? '') === group) }));
  });

  /* checking adds to the end of the shown list */
  toggle(key: string, on: boolean) {
    const rest = this.keys().filter(k => k !== key);
    this.keys.set(on ? [...rest, key] : rest);
  }

  /* required items stay when removing a group */
  setGroup(group: string, on: boolean) {
    const inGroup = this.items().filter(c => (c.group ?? '') === group);
    if (on) {
      this.keys.set([...this.keys(), ...inGroup.map(c => c.key).filter(k => !this.keys().includes(k))]);
    } else {
      const drop = new Set(inGroup.filter(c => !c.required).map(c => c.key));
      this.keys.set(this.keys().filter(k => !drop.has(k)));
    }
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

  dropSide(key: string): '' | 'above' | 'below' {
    const from = this.dragKey();
    if (!from || from === key || this.overKey() !== key) return '';
    return this.keys().indexOf(from) < this.keys().indexOf(key) ? 'below' : 'above';
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
