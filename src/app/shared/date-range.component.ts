/* Two DaisyUI date inputs behind a dropdown, replaces p-datepicker selectionMode="range". */
import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-date-range',
  standalone: true,
  template: `
    <div class="dropdown">
      <div tabindex="0" role="button" class="btn btn-sm btn-outline w-full justify-between font-normal">
        <span class="truncate">{{ summary() }}</span>
        <span class="opacity-60">▾</span>
      </div>
      <div tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-10 mt-1 w-56 p-3 shadow gap-2 flex flex-col">
        <label class="flex flex-col gap-1 text-xs">
          From
          <input type="date" class="input input-sm input-bordered" [value]="fromStr()" (change)="onFrom($event)" />
        </label>
        <label class="flex flex-col gap-1 text-xs">
          To
          <input type="date" class="input input-sm input-bordered" [value]="toStr()" (change)="onTo($event)" />
        </label>
        @if (from() || to()) {
          <button type="button" class="btn btn-ghost btn-xs" (click)="clear()">Clear</button>
        }
      </div>
    </div>
  `
})
export class DateRangeComponent {
  from = input<Date | null>(null);
  to = input<Date | null>(null);
  rangeChange = output<[Date | null, Date | null]>();

  fromStr = computed(() => toInputDate(this.from()));
  toStr = computed(() => toInputDate(this.to()));

  summary = computed(() => {
    const f = this.from(), t = this.to();
    if (!f && !t) return 'Any';
    const fmt = (d: Date | null) => (d ? d.toLocaleDateString() : '…');
    return `${fmt(f)} – ${fmt(t)}`;
  });

  onFrom(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this.rangeChange.emit([v ? new Date(v) : null, this.to()]);
  }
  onTo(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this.rangeChange.emit([this.from(), v ? new Date(v) : null]);
  }
  clear() {
    this.rangeChange.emit([null, null]);
  }
}

function toInputDate(d: Date | null): string {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
