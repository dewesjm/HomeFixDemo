/* Read-only note on a Routing Settings or Signoff Types By Routing row: the attribute codes with an
   Attribute Code Exceptions row for that routing, linking to the table where they are edited */
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { codesChangingRouting } from '../../attribute-codes/attribute-code-exceptions';

@Component({
  selector: 'app-attribute-code-note',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (codes().length) {
      <div class="text-sm mt-1"><a routerLink="/admin/attribute-code-exceptions" class="link">Attribute Code Exceptions</a>
        {{ codes().join(', ') }}</div>
    }
  `,
})
export class AttributeCodeNoteComponent {
  routingId = input.required<string>();
  codes = computed(() => codesChangingRouting(this.routingId()));
}
