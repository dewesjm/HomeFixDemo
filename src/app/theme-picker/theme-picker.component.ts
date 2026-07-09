/* Theme button: switch the active DaisyUI theme at runtime, persisted. */
import { Component, signal } from '@angular/core';
import { LucidePalette } from '@lucide/angular';

interface ThemeOption { name: string; label: string; }

const THEMES: ThemeOption[] = [
  { name: 'light', label: 'Light' },
  { name: 'dark', label: 'Dark' },
  { name: 'corporate', label: 'Corporate' },
  { name: 'winter', label: 'Winter' },
  { name: 'night', label: 'Night' },
  { name: 'business', label: 'Business' },
];

const THEME_KEY = 'homefix:theme';

@Component({
  selector: 'app-theme-picker',
  standalone: true,
  imports: [LucidePalette],
  template: `
    <div class="dropdown dropdown-top w-full">
      <div tabindex="0" role="button" class="btn btn-ghost btn-sm w-full justify-start">
        <svg lucidePalette class="size-4"></svg> Theme
      </div>
      <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-10 w-48 p-2 shadow">
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
  active = signal<string>(localStorage.getItem(THEME_KEY) ?? 'light');

  constructor() {
    document.documentElement.setAttribute('data-theme', this.active());
  }

  pick(name: string) {
    this.active.set(name);
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem(THEME_KEY, name);
  }
}
