/* adaptive filters screen, schema-driven */
//heavily custom
import { Component, ElementRef, computed, effect, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideSave, LucideX, LucideSlidersHorizontal, LucideListFilter,
  LucideFileSpreadsheet, LucideArrowUpRight, LucideCheck
} from '@lucide/angular';

import { TableState } from '../shared/table-state';
import { TablePagerComponent } from '../shared/table-pager.component';
import { MultiselectDropdownComponent } from '../shared/multiselect-dropdown.component';
import { DateRangeComponent } from '../shared/date-range.component';
import { StarRatingComponent } from '../shared/star-rating.component';
import { TooltipDirective } from '../shared/tooltip.directive';
import { downloadCsv } from '../data/export-csv';

import { JOBS, Job } from '../data/jobs';
import {
  FILTER_SCHEMA, FilterField, FilterValues, FilterVariant,
  applyFilters, defaultValuesFor, getField, isEmpty,
  loadVariants, saveVariants
} from '../data/filter-schema';
import { WorkflowService } from '../services/workflow.service';
import { currentStepLabel } from '../data/workflow';

const DEFAULT_KEYS = ['title', 'trade', 'estimatedCost'];

@Component({
  selector: 'app-adaptive-search',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TablePagerComponent, MultiselectDropdownComponent, DateRangeComponent, StarRatingComponent,
    TooltipDirective,
    LucideSave, LucideX, LucideSlidersHorizontal, LucideListFilter,
    LucideFileSpreadsheet, LucideArrowUpRight, LucideCheck
  ],
  templateUrl: './adaptive-search.component.html'
})
export class AdaptiveSearchComponent {
  private adaptDlg = viewChild<ElementRef<HTMLDialogElement>>('adaptDlg');

  constructor(private router: Router, private wfService: WorkflowService) {
    effect(() => this.table.setRows(this.filtered()));
    effect(() => {
      const open = this.showAdapt();
      const el = this.adaptDlg()?.nativeElement;
      if (!el) return;
      if (open && !el.open) el.showModal();
      if (!open && el.open) el.close();
    });
  }

  schema = FILTER_SCHEMA;
  groups = [...new Set(FILTER_SCHEMA.map(f => f.group))];

  table = new TableState<Job>(['jobNumber', 'title', 'trade', 'technician']);

  /* current workflow step label for a job */
  currentStep(job: Job): string {
    return currentStepLabel(this.wfService.workflowFor(job)().stages);
  }

  openDetails(job: Job) {
    this.router.navigate(['/jobs', job.id]);
  }

  visibleKeys = signal<string[]>([...DEFAULT_KEYS]);
  values = signal<FilterValues>(defaultValuesFor(DEFAULT_KEYS));

  visibleFields = computed<FilterField[]>(() =>
    this.visibleKeys()
      .map(k => getField(k))
      .filter((f): f is FilterField => !!f)
  );

  totalJobs = JOBS.length;
  filtered = computed<Job[]>(() => applyFilters(JOBS, this.values()));

  activeChips = computed(() => {
    const chips: { label: string; clear: () => void }[] = [];
    for (const f of this.visibleFields()) {
      const v = this.values()[f.key];
      if (isEmpty(f, v)) continue;
      chips.push({
        label: this.chipLabelFor(f, v),
        clear: () => this.clearOne(f.key)
      });
    }
    return chips;
  });

  // --- Adapt Filters dialog ---
  showAdapt = signal(false);
  draftKeys = signal<Set<string>>(new Set());
  adaptFilter = signal<string>('');

  groupedSchema = computed(() => {
    const q = this.adaptFilter().trim().toLowerCase();
    const out: { group: string; items: FilterField[] }[] = [];
    for (const g of this.groups) {
      const items = this.schema.filter(f =>
        f.group === g && (!q || f.label.toLowerCase().includes(q))
      );
      if (items.length) out.push({ group: g, items });
    }
    return out;
  });

  openAdapt() {
    this.draftKeys.set(new Set(this.visibleKeys()));
    this.adaptFilter.set('');
    this.showAdapt.set(true);
  }

  isDraftSelected(key: string): boolean {
    return this.draftKeys().has(key);
  }
  toggleDraft(key: string, checked: boolean) {
    const next = new Set(this.draftKeys());
    if (checked) next.add(key); else next.delete(key);
    this.draftKeys.set(next);
  }
  selectGroup(group: string, selected: boolean) {
    const next = new Set(this.draftKeys());
    for (const f of this.schema) {
      if (f.group !== group) continue;
      if (selected) next.add(f.key);
      else if (!f.required) next.delete(f.key);
    }
    this.draftKeys.set(next);
  }
  selectAll(selected: boolean) {
    const next = new Set<string>();
    for (const f of this.schema) {
      if (selected || f.required) next.add(f.key);
    }
    this.draftKeys.set(next);
  }

  applyAdapt() {
    const requiredKeys = this.schema.filter(f => f.required).map(f => f.key);
    // preserve schema order so the bar is stable
    const draft = this.draftKeys();
    const finalKeys = this.schema
      .map(f => f.key)
      .filter(k => draft.has(k) || requiredKeys.includes(k));

    const prev = this.values();
    const next = defaultValuesFor(finalKeys);
    for (const k of finalKeys) if (k in prev) next[k] = prev[k];

    this.visibleKeys.set(finalKeys);
    this.values.set(next);
    this.showAdapt.set(false);
  }

  // --- Variants (presets) ---
  variants = signal<FilterVariant[]>(loadVariants());
  variantName = signal<string>('');

  applyVariant(v: FilterVariant) {
    const next = defaultValuesFor(v.visibleKeys);
    for (const k of v.visibleKeys) if (k in v.values) next[k] = v.values[k];
    this.visibleKeys.set([...v.visibleKeys]);
    this.values.set(next);
  }

  saveCurrentVariant() {
    const name = this.variantName().trim();
    if (!name) return;
    const next: FilterVariant = {
      name,
      visibleKeys: [...this.visibleKeys()],
      values: JSON.parse(JSON.stringify(this.values()))
    };
    const others = this.variants().filter(v => v.name !== name);
    const merged = [...others, next];
    this.variants.set(merged);
    saveVariants(merged);
    this.variantName.set('');
  }

  deleteVariant(name: string) {
    const merged = this.variants().filter(v => v.name !== name);
    this.variants.set(merged);
    saveVariants(merged);
  }

  // --- Field value helpers ---
  setValue(key: string, val: any) {
    this.values.set({ ...this.values(), [key]: val });
  }
  valueOf(key: string): any { return this.values()[key]; }

  rangeValue(key: string, field: Extract<FilterField, { type: 'range' }>): [number, number] {
    return this.valueOf(key) ?? [field.min, field.max];
  }
  setRangeMin(key: string, field: Extract<FilterField, { type: 'range' }>, v: string) {
    const [, hi] = this.rangeValue(key, field);
    this.setValue(key, [v === '' ? field.min : Number(v), hi]);
  }
  setRangeMax(key: string, field: Extract<FilterField, { type: 'range' }>, v: string) {
    const [lo] = this.rangeValue(key, field);
    this.setValue(key, [lo, v === '' ? field.max : Number(v)]);
  }

  dateRangeValue(key: string): [Date | null, Date | null] {
    return this.valueOf(key) ?? [null, null];
  }
  setDateRange(key: string, range: [Date | null, Date | null]) {
    this.setValue(key, range[0] || range[1] ? range : null);
  }

  clearOne(key: string) {
    const f = getField(key);
    if (!f) return;
    this.values.set({ ...this.values(), ...defaultValuesFor([key]) });
  }

  resetAll() {
    this.values.set(defaultValuesFor(this.visibleKeys()));
  }

  chipLabelFor(f: FilterField, v: any): string {
    switch (f.type) {
      case 'text':        return `${f.label}: "${v}"`;
      case 'multiselect':
      case 'tags':        return `${f.label}: ${(v as any[]).join(', ')}`;
      case 'select':      return `${f.label}: ${v}`;
      case 'range':       return `${f.label}: ${v[0]}–${v[1]}`;
      case 'rating':      return `${f.label}: ≥ ${v}`;
      case 'daterange': {
        const fmt = (d: Date) => d ? d.toLocaleDateString() : '…';
        return `${f.label}: ${fmt(v[0])} – ${fmt(v[1])}`;
      }
    }
  }

  exportCsv() {
    downloadCsv('adaptive-search', [
      { header: 'Job #', value: (r: Job) => r.jobNumber },
      { header: 'Job', value: (r: Job) => r.title },
      { header: 'Trade', value: (r: Job) => r.trade },
      { header: 'Technician', value: (r: Job) => r.technician },
      { header: 'Est. cost', value: (r: Job) => Number(r.estimatedCost).toFixed(2) },
      { header: 'Score', value: (r: Job) => r.inspectionScore },
      { header: 'Tags', value: (r: Job) => r.tags.join('; ') }
    ], this.table.sorted());
  }

  /* typed casts for discriminated fields */
  asMulti(f: FilterField): Extract<FilterField, { type: 'multiselect' | 'tags' | 'select' }> {
    return f as any;
  }
  asRange(f: FilterField): Extract<FilterField, { type: 'range' }> {
    return f as any;
  }
}
