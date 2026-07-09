/* DaisyUI dropdown + checkbox list, replaces p-multiselect for column/filter-bar use. */
import { Component, computed, input, output } from '@angular/core';

export interface SelectOption<T = string> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-multiselect-dropdown',
  standalone: true,
  template: `
    <div class="dropdown">
      <div tabindex="0" role="button" class="btn btn-sm btn-outline w-full justify-between font-normal">
        <span class="truncate">{{ summary() }}</span>
        <span class="opacity-60">▾</span>
      </div>
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

  toggle(value: T) {
    const cur = this.selected();
    const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
    this.selectedChange.emit(next);
  }
}
