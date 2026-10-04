/* Raw stage: each line exactly as received, with a column ruler and the layout's fields shaded
   so you can see where each one sits. Hover a field for its name and value. */
import { Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideSearch, LucideX } from '@lucide/angular';

import { RawLine } from '../../data/external-loads/convert';
import { LAYOUT, LINE_WIDTH, USED_WIDTH } from '../../data/external-loads/layout';

interface Segment { text: string; title: string; shade: number }

/* "1   ...   10   ...   20" over "....+....|....+....|" */
function ruler(): string[] {
  const numbers = Array(LINE_WIDTH).fill(' ');
  for (let p = 10; p <= LINE_WIDTH; p += 10) {
    const s = String(p);
    for (let k = 0; k < s.length; k++) numbers[p - s.length + k] = s[k];
  }
  numbers[0] = '1';
  const ticks = Array.from({ length: LINE_WIDTH }, (_, i) => ((i + 1) % 10 === 0 ? '|' : (i + 1) % 5 === 0 ? '+' : '.'));
  return [numbers.join(''), ticks.join('')];
}

function segments(text: string): Segment[] {
  const out: Segment[] = LAYOUT.map((f, i) => {
    const value = text.slice(f.start - 1, f.start - 1 + f.length);
    return { text: value, title: `${f.label} (${f.start}-${f.start + f.length - 1}): "${value.trim()}"`, shade: i % 2 + 1 };
  });
  out.push({ text: text.slice(USED_WIDTH), title: 'Vendor fields this load does not use', shade: 0 });
  return out;
}

@Component({
  selector: 'app-raw-lines',
  standalone: true,
  imports: [FormsModule, LucideSearch, LucideX],
  styles: [`
    .raw { overflow-x: auto; font-family: monospace; white-space: pre; line-height: 1.6; }
    .raw-row { display: flex; }
    .line-no { position: sticky; left: 0; min-width: 4rem; padding-right: 0.75rem; text-align: right; background: var(--color-base-100); font-weight: 600; }
    .shade-1 { background: color-mix(in oklch, var(--color-primary) 22%, transparent); }
    .shade-2 { background: var(--color-base-300); }
    .ruler { font-weight: 600; }
  `],
  template: `
    <div class="facet-row">
      <label class="input input-sm input-bordered flex items-center gap-2 search-input">
        <svg lucideSearch class="size-4"></svg>
        <input type="text" class="grow" placeholder="Search raw lines…" [ngModel]="search()" (ngModelChange)="search.set($event)" />
        @if (search()) {
          <button type="button" class="btn btn-ghost btn-xs p-0" title="Clear search" (click)="search.set('')">
            <svg lucideX class="size-3.5"></svg>
          </button>
        }
      </label>
      <span>Shaded blocks are the fields in the layout; the rest of each line is vendor data this load doesn't use. Lines should be {{ lineWidth }} characters.</span>
    </div>

    <div class="raw">
      @for (r of rulerLines; track $index) {
        <div class="raw-row ruler"><span class="line-no">{{ $first ? 'Pos' : '' }}</span><span>{{ r }}</span></div>
      }
      @for (line of shown(); track line.lineNo) {
        <div class="raw-row">
          <span class="line-no">{{ line.lineNo }}</span>
          <span>@for (s of line.segments; track $index) {<span [class]="'shade-' + s.shade" [title]="s.title">{{ s.text }}</span>}</span>
          @if (line.short) { <span class="badge badge-sm badge-error ml-2">{{ line.length }} characters</span> }
        </div>
      } @empty {
        <div class="empty">No lines match.</div>
      }
    </div>

    <details class="mt-4">
      <summary class="cursor-pointer font-semibold">File layout</summary>
      <table class="table table-sm mt-2" style="max-width: 40rem">
        <thead><tr><th>Field</th><th>Start</th><th>Length</th><th>Type</th><th>Required</th></tr></thead>
        <tbody>
          @for (f of layout; track f.key) {
            <tr><td>{{ f.label }}</td><td>{{ f.start }}</td><td>{{ f.length }}</td><td>{{ f.type }}</td><td>{{ f.required ? 'Yes' : '' }}</td></tr>
          }
        </tbody>
      </table>
    </details>
  `,
})
export class RawLinesComponent {
  lines = input.required<RawLine[]>();

  readonly layout = LAYOUT;
  readonly lineWidth = LINE_WIDTH;
  readonly rulerLines = ruler();
  search = signal('');

  shown = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.lines()
      .filter(l => !q || l.text.toLowerCase().includes(q) || String(l.lineNo) === q)
      .map(l => ({ lineNo: l.lineNo, length: l.text.length, short: l.text.length !== LINE_WIDTH, segments: segments(l.text) }));
  });
}
