/* Theme list, in the avatar menu (same look as Compass): one row per DaisyUI theme with that theme's
   colour swatches and a check on the active one. Switches the theme at runtime, persisted. */
import { STORAGE } from '../../data/storage-keys';
import { Component, signal } from '@angular/core';
import { LucideCheck } from '@lucide/angular';

interface ThemeOption { name: string; label: string; dark?: boolean; }

const THEMES: ThemeOption[] = [
  { name: 'light', label: 'Light' },
  { name: 'dark', label: 'Dark', dark: true },
  { name: 'cupcake', label: 'Cupcake' },
  { name: 'bumblebee', label: 'Bumblebee' },
  { name: 'emerald', label: 'Emerald' },
  { name: 'corporate', label: 'Corporate' },
  { name: 'synthwave', label: 'Synthwave', dark: true },
  { name: 'retro', label: 'Retro' },
  { name: 'cyberpunk', label: 'Cyberpunk' },
  { name: 'valentine', label: 'Valentine' },
  { name: 'halloween', label: 'Halloween', dark: true },
  { name: 'garden', label: 'Garden' },
  { name: 'forest', label: 'Forest', dark: true },
  { name: 'aqua', label: 'Aqua', dark: true },
  { name: 'lofi', label: 'Lo-Fi' },
  { name: 'pastel', label: 'Pastel' },
  { name: 'fantasy', label: 'Fantasy' },
  { name: 'wireframe', label: 'Wireframe' },
  { name: 'black', label: 'Black', dark: true },
  { name: 'luxury', label: 'Luxury', dark: true },
  { name: 'dracula', label: 'Dracula', dark: true },
  { name: 'cmyk', label: 'CMYK' },
  { name: 'autumn', label: 'Autumn' },
  { name: 'business', label: 'Business', dark: true },
  { name: 'acid', label: 'Acid' },
  { name: 'lemonade', label: 'Lemonade' },
  { name: 'night', label: 'Night', dark: true },
  { name: 'coffee', label: 'Coffee', dark: true },
  { name: 'winter', label: 'Winter' },
  { name: 'dim', label: 'Dim', dark: true },
  { name: 'nord', label: 'Nord' },
  { name: 'sunset', label: 'Sunset', dark: true },
];

const THEME_KEY = STORAGE.theme;

@Component({
  selector: 'app-theme-picker',
  standalone: true,
  imports: [LucideCheck],
  template: `
    <div role="radiogroup" aria-label="Theme">
      <div class="px-2 pt-1 pb-2 text-xs font-semibold uppercase opacity-70">Theme</div>
      @for (t of themes; track t.name) {
        <button type="button" role="radio"
                class="flex w-full items-center gap-3 rounded-field px-2 py-1.5 text-left text-sm hover:bg-base-200 focus-visible:bg-base-200"
                [attr.aria-checked]="active() === t.name" [attr.data-theme-option]="t.name" (click)="pick(t.name)">
          <!-- data-theme on the swatch shows that theme's own colours -->
          <span [attr.data-theme]="t.name" class="flex shrink-0 gap-0.5 rounded-selector border border-base-300 bg-base-100 p-1" aria-hidden="true">
            <span class="size-2.5 rounded-full bg-primary"></span>
            <span class="size-2.5 rounded-full bg-secondary"></span>
            <span class="size-2.5 rounded-full bg-accent"></span>
            <span class="size-2.5 rounded-full bg-neutral"></span>
          </span>
          <span class="grow">{{ t.label }}</span>
          @if (active() === t.name) { <svg lucideCheck class="size-4"></svg> }
        </button>
      }
    </div>
  `
})
export class ThemePickerComponent {
  themes = THEMES;
  active = signal<string>(localStorage.getItem(THEME_KEY) ?? 'light');

  constructor() {
    this.apply(this.active());
  }

  pick(name: string) {
    this.active.set(name);
    this.apply(name);
    localStorage.setItem(THEME_KEY, name);
  }

  /* data-scheme lets global CSS style fields per light/dark (editable inputs go black in dark themes) */
  private apply(name: string) {
    const root = document.documentElement;
    root.setAttribute('data-theme', name);
    root.setAttribute('data-scheme', THEMES.find(t => t.name === name)?.dark ? 'dark' : 'light');
  }
}
