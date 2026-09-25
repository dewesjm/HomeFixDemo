/* Theme button: switch the active DaisyUI theme at runtime, persisted. */
import { STORAGE } from '../data/storage-keys';
import { Component, signal } from '@angular/core';
import { LucidePalette } from '@lucide/angular';

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
  imports: [LucidePalette],
  template: `
    <div class="dropdown dropdown-bottom dropdown-end w-full">
      <div tabindex="0" role="button" class="btn btn-ghost btn-sm w-full justify-start">
        <svg lucidePalette class="size-4"></svg> Theme
      </div>
      <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-10 w-48 p-2 shadow max-h-[60vh] overflow-y-auto overflow-x-hidden flex-nowrap">
        @for (t of themes; track t.name) {
          <li>
            <a [class.menu-active]="active() === t.name" (click)="pick(t.name)">{{ t.label }}</a>
          </li>
        }
      </ul>
    </div>
  `
})
export class ThemePickerComponent {
  themes = THEMES;
  active = signal<string>(localStorage.getItem(THEME_KEY) ?? 'forest');

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
