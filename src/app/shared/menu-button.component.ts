import { Component, ElementRef, HostListener, inject, input, signal } from '@angular/core';
import { LucideEllipsis } from '@lucide/angular';

/* A ⋯ button that opens a small menu of the projected buttons (each a <li><button>).
   Clicking an item, clicking elsewhere or pressing Escape closes it. */
@Component({
  selector: 'app-menu-button',
  standalone: true,
  imports: [LucideEllipsis],
  template: `
    <button type="button" class="btn btn-sm btn-ghost" [attr.aria-label]="label()" [attr.title]="label()"
            [attr.aria-expanded]="open()" (click)="open.set(!open())">
      <svg lucideEllipsis class="size-4"></svg>
    </button>
    @if (open()) {
      <ul class="menu menu-pop bg-base-100 rounded-box shadow" [class.menu-pop-end]="alignEnd()"
          (click)="onItemClick($event)">
        <ng-content />
      </ul>
    }
  `,
  styles: [`
    :host { position: relative; display: inline-block; }
    .menu-pop { position: absolute; top: 100%; left: 0; z-index: 30; min-width: 12rem; margin-top: .25rem;
                border: 1px solid var(--app-border); }
    .menu-pop-end { left: auto; right: 0; }
  `],
})
export class MenuButtonComponent {
  label = input('More');
  /* open toward the left, for a button near the right edge */
  alignEnd = input(false);
  open = signal(false);
  private host = inject(ElementRef<HTMLElement>);

  onItemClick(e: Event) {
    if ((e.target as HTMLElement).closest('button')) this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() { this.open.set(false); }
}
