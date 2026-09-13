import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideMegaphone, LucideCheck, LucideX } from '@lucide/angular';
import { ToastService } from '../shared/toast.service';

const BANNER_KEY = 'homefix:banner';

interface BannerData {
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  enabled: boolean;
}

function loadBanner(): BannerData {
  try {
    const raw = localStorage.getItem(BANNER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { message: '', type: 'info', enabled: false };
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

  types: { label: string; value: BannerData['type'] }[] = [
    { label: 'Info', value: 'info' },
    { label: 'Warning', value: 'warning' },
    { label: 'Error', value: 'error' },
    { label: 'Success', value: 'success' },
  ];

  private messages = inject(ToastService);

  save() {
    const data: BannerData = {
      message: this.message(),
      type: this.type(),
      enabled: this.enabled(),
    };
    localStorage.setItem(BANNER_KEY, JSON.stringify(data));
    this.messages.add({ severity: 'success', summary: 'Banner saved', life: 3000 });
  }

  clear() {
    this.message.set('');
    this.type.set('info');
    this.enabled.set(false);
    localStorage.removeItem(BANNER_KEY);
    this.messages.add({ severity: 'info', summary: 'Banner cleared', life: 3000 });
  }
}
