/* DaisyUI dropdown + checkbox list, replaces p-multiselect for column/filter-bar use.
   With [columnFilter]="true" the closed box looks like a column's text filter box (same size, fill,
   filter icon and clear X) so text and list filters in a table heading match. */
import { Component, computed, input, output } from '@angular/core';
import { LucideListFilter, LucideX } from '@lucide/angular';

export interface SelectOption<T = string> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-multiselect-dropdown',
  standalone: true,
  imports: [LucideListFilter, LucideX],
  template: `
    <div class="dropdown w-full min-w-0">
      @if (columnFilter()) {
        <div tabindex="0" role="button" class="input input-xs input-bordered flex items-center gap-1 w-full min-w-0 cursor-pointer">
          <svg lucideListFilter class="size-3 opacity-60 shrink-0"></svg>
          <span class="grow min-w-0 truncate" [class.opacity-60]="!selected().length">{{ summary() }}</span>
          @if (selected().length) {
            <button type="button" class="btn btn-ghost btn-xs p-0 shrink-0" aria-label="Clear filter"
                    (click)="clear($event)">
              <svg lucideX class="size-3 opacity-60"></svg>
            </button>
          } @else {
            <span class="opacity-60 shrink-0">▾</span>
          }
        </div>
      } @else {
        <div tabindex="0" role="button" class="btn btn-sm btn-outline w-full min-w-0 justify-between font-normal">
          <span class="truncate">{{ summary() }}</span>
          <span class="opacity-60">▾</span>
        </div>
      }
      <div tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-10 mt-1 w-56 max-h-64 overflow-y-auto p-2 shadow">
        @for (opt of options(); track opt.value) {
          <label class="label cursor-pointer justify-start gap-2 py-1">
            <input type="checkbox" class="checkbox checkbox-sm"
                   [checked]="isChecked(opt.value)" (change)="toggle(opt.value)" />
            <span class="label-text">{{ opt.label }}</span>
          </label>
        }
      </div>
    </div>
  `
})
export class MultiselectDropdownComponent<T = string> {
  options = input<SelectOption<T>[]>([]);
  selected = input<T[]>([]);
  placeholder = input('Any');
  columnFilter = input(false);
  selectedChange = output<T[]>();

  summary = computed(() => {
    const sel = this.selected();
    if (!sel || sel.length === 0) return this.placeholder();
    if (sel.length === 1) {
      return this.options().find(o => o.value === sel[0])?.label ?? this.placeholder();
    }
    return `${sel.length} selected`;
  });

  isChecked(value: T): boolean {
    return this.selected().includes(value);
  }

  /* the clear X sits inside the dropdown's trigger: don't let the click also open the list */
  clear(event: Event) {
    event.stopPropagation();
    (event.currentTarget as HTMLElement).blur();
    this.selectedChange.emit([]);
  }

  toggle(value: T) {
    const cur = this.selected();
    const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
    this.selectedChange.emit(next);
  }
}
