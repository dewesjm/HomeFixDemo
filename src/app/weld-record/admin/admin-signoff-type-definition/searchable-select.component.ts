/* One droplist with a search box beside it, for the long field lists on Admin > Signoff Type Forms.
   The current pick stays in the list while searching, so the droplist keeps showing it. */
import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideX } from '@lucide/angular';

export interface SearchChoice {
  id: string;
  label: string;
}

export function matchingChoices<T extends SearchChoice>(choices: T[], search: string, selectedId: string): T[] {
  const text = search.trim().toLowerCase();
  return text ? choices.filter(c => c.id === selectedId || c.label.toLowerCase().includes(text)) : choices;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [FormsModule, LucideX],
  host: { class: 'contents' },
  template: `
    <input type="text" class="input input-bordered input-xs w-36" placeholder="Search fields" [attr.aria-label]="'Search ' + name()"
           [ngModel]="search()" (ngModelChange)="search.set($event)" />
    @if (search()) {
      <button type="button" class="btn btn-ghost btn-xs" [attr.aria-label]="'Clear ' + name() + ' search'" (click)="search.set('')">
        <svg lucideX class="size-3"></svg>
      </button>
    }
    <select class="select select-bordered select-xs w-80 max-w-full" [attr.aria-label]="name()"
            [ngModel]="value()" (ngModelChange)="picked.emit($event)">
      <option value="" [disabled]="!emptyPickable()">{{ emptyLabel() }}</option>
      @for (c of shown(); track c.id) {
        <option [value]="c.id">{{ c.label }}</option>
      }
    </select>
  `,
})
export class SearchableSelectComponent {
  choices = input.required<SearchChoice[]>();
  value = input('');
  /* names the droplist and its search box for screen readers */
  name = input.required<string>();
  emptyLabel = input('Nothing');
  emptyPickable = input(true);
  picked = output<string>();

  search = signal('');
  shown = computed(() => matchingChoices(this.choices(), this.search(), this.value()));
}
