import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideMegaphone, LucideCheck, LucideX } from '@lucide/angular';
import { ToastService } from '../shared/toast.service';

const BANNER_KEY = 'homefix:banner';

export type BannerPage = 'all' | 'ewr' | 'weld-planning';

interface BannerData {
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  enabled: boolean;
  pages: BannerPage[];
}

const DEFAULT_BANNER: BannerData = { message: '', type: 'info', enabled: false, pages: ['all'] };

function loadBanner(): BannerData {
  try {
    const raw = localStorage.getItem(BANNER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_BANNER, pages: parsed.pages ?? ['all'], ...parsed };
    }
  } catch {}
  return { ...DEFAULT_BANNER };
}

@Component({
  selector: 'app-admin-banner',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideMegaphone, LucideCheck, LucideX],
  templateUrl: './admin-banner.component.html'
})
export class AdminBannerComponent {
  message = signal(loadBanner().message);
  type = signal<BannerData['type']>(loadBanner().type);
  enabled = signal(loadBanner().enabled);
  pages = signal<BannerPage[]>(loadBanner().pages);

  types: { label: string; value: BannerData['type'] }[] = [
    { label: 'Info', value: 'info' },
    { label: 'Warning', value: 'warning' },
    { label: 'Error', value: 'error' },
    { label: 'Success', value: 'success' },
  ];

  pageOptions: { label: string; value: BannerPage }[] = [
    { label: 'All pages', value: 'all' },
    { label: 'Pipe Welding (EWR)', value: 'ewr' },
    { label: 'Joint Search (Weld Planning)', value: 'weld-planning' },
  ];

  togglePage(page: BannerPage) {
    const current = this.pages();
    if (page === 'all') {
      this.pages.set(current.includes('all') ? [] : ['all']);
    } else {
      const next = current.includes(page) ? current.filter(p => p !== page) : [...current.filter(p => p !== 'all'), page];
      this.pages.set(next);
    }
  }

  private messages = inject(ToastService);

  save() {
    const data: BannerData = {
      message: this.message(),
      type: this.type(),
      enabled: this.enabled(),
      pages: this.pages(),
    };
    localStorage.setItem(BANNER_KEY, JSON.stringify(data));
    this.messages.add({ severity: 'success', summary: 'Banner saved', life: 3000 });
  }

  clear() {
    this.message.set('');
    this.type.set('info');
    this.enabled.set(false);
    this.pages.set(['all']);
    localStorage.removeItem(BANNER_KEY);
    this.messages.add({ severity: 'info', summary: 'Banner cleared', life: 3000 });
  }
}
