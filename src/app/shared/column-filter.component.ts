/* Unobtrusive per-column filter: just a small icon until clicked, then a compact popover text box
   -- for grid/div-based tables (not <table>/<th>) where sort-header.component's always-open filter
   box would take up too much header space. Closes on blur; the clear button uses (mousedown) with
   preventDefault so it fires before the blur would close the popover out from under it. */
import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideListFilter, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-column-filter',
  standalone: true,
  imports: [FormsModule, LucideListFilter, LucideX],
  templateUrl: './column-filter.component.html'
})
export class ColumnFilterComponent {
  label = input.required<string>();
  value = input<string>('');
  valueChange = output<string>();

  open = signal(false);
  private inputEl = viewChild<ElementRef<HTMLInputElement>>('inputEl');

  toggle() {
    this.open.update(o => !o);
    if (this.open()) setTimeout(() => this.inputEl()?.nativeElement.focus());
  }

  close() {
    this.open.set(false);
  }

  clear() {
    this.valueChange.emit('');
    this.close();
  }
}
