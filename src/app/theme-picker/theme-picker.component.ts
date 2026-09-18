/* Theme button: switch the active DaisyUI theme at runtime, persisted. */
import { Component, signal } from '@angular/core';
import { LucidePalette } from '@lucide/angular';

interface ThemeOption { name: string; label: string; }

const THEMES: ThemeOption[] = [
  { name: 'light', label: 'Light' },
  { name: 'dark', label: 'Dark' },
  { name: 'cupcake', label: 'Cupcake' },
  { name: 'bumblebee', label: 'Bumblebee' },
  { name: 'emerald', label: 'Emerald' },
  { name: 'corporate', label: 'Corporate' },
  { name: 'synthwave', label: 'Synthwave' },
  { name: 'retro', label: 'Retro' },
  { name: 'cyberpunk', label: 'Cyberpunk' },
  { name: 'valentine', label: 'Valentine' },
  { name: 'halloween', label: 'Halloween' },
  { name: 'garden', label: 'Garden' },
  { name: 'forest', label: 'Forest' },
  { name: 'aqua', label: 'Aqua' },
  { name: 'lofi', label: 'Lo-Fi' },
  { name: 'pastel', label: 'Pastel' },
  { name: 'fantasy', label: 'Fantasy' },
  { name: 'wireframe', label: 'Wireframe' },
  { name: 'black', label: 'Black' },
  { name: 'luxury', label: 'Luxury' },
  { name: 'dracula', label: 'Dracula' },
  { name: 'cmyk', label: 'CMYK' },
  { name: 'autumn', label: 'Autumn' },
  { name: 'business', label: 'Business' },
  { name: 'acid', label: 'Acid' },
  { name: 'lemonade', label: 'Lemonade' },
  { name: 'night', label: 'Night' },
  { name: 'coffee', label: 'Coffee' },
  { name: 'winter', label: 'Winter' },
  { name: 'dim', label: 'Dim' },
  { name: 'nord', label: 'Nord' },
  { name: 'sunset', label: 'Sunset' },
];

const THEME_KEY = 'homefix:theme';

@Component({
  selector: 'app-theme-picker',
  standalone: true,
  imports: [LucidePalette],
  template: `
    <div class="dropdown dropdown-bottom w-full">
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
  active = signal<string>(localStorage.getItem(THEME_KEY) ?? 'corporate');

  constructor() {
    document.documentElement.setAttribute('data-theme', this.active());
  }

  pick(name: string) {
    this.active.set(name);
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem(THEME_KEY, name);
  }
}
