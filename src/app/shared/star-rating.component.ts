/* DaisyUI radio-based star rating, replaces p-rating (editable or [readonly]). */
import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  template: `
    <div class="rating rating-sm" [class.pointer-events-none]="readonly()">
      @for (i of stars; track i) {
        <input type="radio" [name]="name" class="mask mask-star-2 bg-orange-400"
               [attr.aria-label]="i + ' star'"
               [checked]="roundedValue() === i"
               (change)="onChange(i)" />
      }
    </div>
  `
})
export class StarRatingComponent {
  value = input<number>(0);
  readonly = input(false);
  valueChange = output<number>();

  stars = [1, 2, 3, 4, 5];
  name = `rating-${Math.random().toString(36).slice(2)}`;
  roundedValue = computed(() => Math.round(this.value()));

  onChange(i: number) {
    if (!this.readonly()) this.valueChange.emit(i);
  }
}
