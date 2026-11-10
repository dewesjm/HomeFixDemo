/* One droplist of named choices, as wide as its longest name, for the field lists on Admin > Signoff Type Forms. */
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface Choice {
  id: string;
  label: string;
}

@Component({
  selector: 'app-choice-select',
  standalone: true,
  imports: [FormsModule],
  host: { class: 'contents' },
  template: `
    <select class="select select-bordered select-xs w-auto max-w-full" [attr.aria-label]="name()"
            [ngModel]="value()" (ngModelChange)="picked.emit($event)">
      <option value="" [disabled]="!emptyPickable()">{{ emptyLabel() }}</option>
      @for (c of choices(); track c.id) {
        <option [value]="c.id">{{ c.label }}</option>
      }
    </select>
  `,
})
export class ChoiceSelectComponent {
  choices = input.required<Choice[]>();
  value = input('');
  /* names the droplist for screen readers */
  name = input.required<string>();
  emptyLabel = input('Nothing');
  emptyPickable = input(true);
  picked = output<string>();
}
