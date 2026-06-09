// Sidebar "Theme" button: opens a popover to switch the PrimeNG PRIMARY and SURFACE
// color palettes at runtime. Uses PrimeNG's theming API (@primeng/themes) and persists
// the choices to localStorage so they survive reloads.
import { Component, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { updatePrimaryPalette, updateSurfacePalette } from '@primeng/themes';

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// Primary = the accent color (buttons, links, active states). These are the colored
// preset palettes that ship with Aura; the hex is only for painting the swatch dot.
const PRIMARY: { name: string; hex: string }[] = [
  { name: 'red',     hex: '#ef4444' },
  { name: 'orange',  hex: '#f97316' },
  { name: 'amber',   hex: '#f59e0b' },
  { name: 'yellow',  hex: '#eab308' },
  { name: 'lime',    hex: '#84cc16' },
  { name: 'green',   hex: '#22c55e' },
  { name: 'emerald', hex: '#10b981' },
  { name: 'teal',    hex: '#14b8a6' },
  { name: 'cyan',    hex: '#06b6d4' },
  { name: 'sky',     hex: '#0ea5e9' },
  { name: 'blue',    hex: '#3b82f6' },
  { name: 'indigo',  hex: '#6366f1' },
  { name: 'violet',  hex: '#8b5cf6' },
  { name: 'purple',  hex: '#a855f7' },
  { name: 'fuchsia', hex: '#d946ef' },
  { name: 'pink',    hex: '#ec4899' },
  { name: 'rose',    hex: '#f43f5e' },
];

// Neutral ramps — the conventional, tasteful background choices.
const NEUTRALS: { name: string; hex: string }[] = [
  { name: 'slate',   hex: '#64748b' },
  { name: 'gray',    hex: '#6b7280' },
  { name: 'zinc',    hex: '#71717a' },
  { name: 'neutral', hex: '#737373' },
  { name: 'stone',   hex: '#78716c' },
];

// Surface = the page/card background ramp. We expose EVERY palette (neutrals + colors)
// so the user can pick any background; colored ones give deep tinted backgrounds in dark mode.
const SURFACE: { name: string; hex: string }[] = [...NEUTRALS, ...PRIMARY];

const PRIMARY_KEY = 'homefix:primary-color';
const SURFACE_KEY = 'homefix:surface-color';

/** Build the {color.shade} token map PrimeNG expects, e.g. { 500: '{blue.500}', … }. */
function paletteFor(name: string): Record<number, string> {
  return Object.fromEntries(SHADES.map(s => [s, `{${name}.${s}}`])) as Record<number, string>;
}

@Component({
  selector: 'app-theme-picker',
  standalone: true,
  imports: [ButtonModule, PopoverModule],
  template: `
    <p-button label="Theme" icon="pi pi-palette" severity="secondary" [text]="true"
              (onClick)="op.toggle($event)" />

    <p-popover #op>
      <div class="theme-panel">
        <div>
          <span class="theme-label">Primary</span>
          <div class="swatches">
            @for (c of primary; track c.name) {
              <button type="button" class="swatch" [class.selected]="selectedPrimary() === c.name"
                      [style.background]="c.hex" [title]="c.name" [attr.aria-label]="'Primary ' + c.name"
                      (click)="pickPrimary(c.name)"></button>
            }
          </div>
        </div>

        <div>
          <span class="theme-label">Surface (background)</span>
          <div class="swatches">
            @for (c of surface; track c.name) {
              <button type="button" class="swatch" [class.selected]="selectedSurface() === c.name"
                      [style.background]="c.hex" [title]="c.name" [attr.aria-label]="'Surface ' + c.name"
                      (click)="pickSurface(c.name)"></button>
            }
          </div>
        </div>
      </div>
    </p-popover>
  `,
  styles: [`
    .theme-panel { display: flex; flex-direction: column; gap: 1rem; min-width: 14rem; }
    .theme-label { display: block; font-size: .75rem; color: var(--p-text-muted-color); margin-bottom: .45rem; }
    .swatches { display: flex; flex-wrap: wrap; gap: .4rem; }
    .swatch {
      width: 1.5rem; height: 1.5rem; border-radius: 50%; padding: 0;
      border: 2px solid transparent; cursor: pointer; transition: transform .1s ease;
    }
    .swatch:hover { transform: scale(1.1); }
    .swatch.selected { border-color: var(--p-text-color); box-shadow: 0 0 0 2px var(--app-surface); }
  `]
})
export class ThemePickerComponent {
  primary = PRIMARY;
  surface = SURFACE;
  selectedPrimary = signal<string | null>(localStorage.getItem(PRIMARY_KEY));
  selectedSurface = signal<string | null>(localStorage.getItem(SURFACE_KEY));

  constructor() {
    // Re-apply saved choices on load; leave the preset defaults if nothing was chosen.
    const p = this.selectedPrimary();
    if (p) updatePrimaryPalette(paletteFor(p));
    const s = this.selectedSurface();
    if (s) updateSurfacePalette(paletteFor(s));
  }

  pickPrimary(name: string) {
    this.selectedPrimary.set(name);
    updatePrimaryPalette(paletteFor(name));
    localStorage.setItem(PRIMARY_KEY, name);
  }

  pickSurface(name: string) {
    this.selectedSurface.set(name);
    updateSurfacePalette(paletteFor(name));
    localStorage.setItem(SURFACE_KEY, name);
  }
}
