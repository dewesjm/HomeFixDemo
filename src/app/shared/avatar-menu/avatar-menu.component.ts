/* Top-right avatar button and its panel, which holds the theme picker. The panel is hidden rather
   than removed, because the theme picker applies the saved theme when it's created. Clicking
   elsewhere or pressing Escape closes it; picking a theme doesn't, so themes can be tried in turn. */
import { Component, ElementRef, inject, signal } from '@angular/core';
import { LucideUser } from '@lucide/angular';
import { ThemePickerComponent } from './theme-picker.component';

@Component({
  selector: 'app-avatar-menu',
  standalone: true,
  imports: [LucideUser, ThemePickerComponent],
  host: {
    class: 'relative inline-block',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'open.set(false)',
  },
  template: `
    <button type="button" class="btn btn-ghost btn-circle btn-sm avatar avatar-placeholder" title="User menu" aria-label="User menu"
            [attr.aria-expanded]="open()" (click)="open.set(!open())">
      <div class="bg-primary text-primary-content w-8 rounded-full">
        <svg lucideUser class="size-4"></svg>
      </div>
    </button>
    <div class="absolute right-0 top-full z-50 mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-box border border-base-content/20 bg-base-100 p-4 shadow-lg"
         [class.hidden]="!open()">
      <app-theme-picker />
    </div>
  `,
})
export class AvatarMenuComponent {
  open = signal(false);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  onDocumentClick(e: Event) {
    if (!this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
  }
}
