import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { LucideMegaphone } from '@lucide/angular';
import { BannerData } from '../data/banner';

/* The admin banner message, shown as a pill beside a page title (the one banner style everywhere). */
@Component({
  selector: 'app-banner-pill',
  standalone: true,
  imports: [NgClass, LucideMegaphone],
  template: `
    @if (banner(); as b) {
      <span class="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full"
            [ngClass]="{
              'bg-info/20 text-info': b.type === 'info',
              'bg-warning/20 text-warning': b.type === 'warning',
              'bg-error/20 text-error': b.type === 'error',
              'bg-success/20 text-success': b.type === 'success'
            }">
        <svg lucideMegaphone class="size-4"></svg>
        <span>{{ b.message }}</span>
      </span>
    }
  `,
})
export class BannerPillComponent {
  banner = input<Pick<BannerData, 'message' | 'type'> | null>(null);
}
