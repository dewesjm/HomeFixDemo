import { Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { LucideMegaphone } from '@lucide/angular';
import { BannerData, isLongBanner } from '../data/banner';

/* The admin banner message. A short one is a pill beside the page title; a long one is a
   full-width strip under the page header. Pages place it twice: placement="inline" in the header
   and placement="below" right after it, and only the one that fits the message shows.
   placement="auto" (the Admin preview) shows whichever applies. */
@Component({
  selector: 'app-banner-pill',
  standalone: true,
  imports: [NgClass, LucideMegaphone],
  template: `
    @if (shown(); as b) {
      <div class="items-center gap-1.5 text-sm font-semibold"
           [class.inline-flex]="!long()" [class.px-3]="!long()" [class.py-1]="!long()" [class.rounded-full]="!long()"
           [class.flex]="long()" [class.banner-strip]="long()"
           [ngClass]="{
             'bg-info/20 text-info': b.type === 'info',
             'bg-warning/20 text-warning': b.type === 'warning',
             'bg-error/20 text-error': b.type === 'error',
             'bg-success/20 text-success': b.type === 'success'
           }">
        <svg lucideMegaphone class="size-4 shrink-0"></svg>
        <span>{{ b.message }}</span>
      </div>
    }
  `,
  styles: [`
    :host { display: contents; }
    .banner-strip { width: 100%; padding: .5rem .75rem; border-radius: .5rem; margin-bottom: .75rem; }
  `],
})
export class BannerPillComponent {
  banner = input<Pick<BannerData, 'message' | 'type'> | null>(null);
  placement = input<'inline' | 'below' | 'auto'>('inline');

  long = computed(() => isLongBanner(this.banner()?.message ?? ''));
  shown = computed(() => {
    const p = this.placement();
    return p === 'auto' || (p === 'below') === this.long() ? this.banner() : null;
  });
}
