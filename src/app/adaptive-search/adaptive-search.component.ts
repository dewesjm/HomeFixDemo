/* adaptive filters screen, schema-driven */
//heavily custom
import { Component, ElementRef, computed, effect, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideSave, LucideX, LucideSlidersHorizontal, LucideListFilter,
  LucideFileSpreadsheet, LucideArrowUpRight, LucideCheck, LucideColumns3
} from '@lucide/angular';

import { TableState } from '../shared/table-state';
import { TablePagerComponent } from '../shared/table-pager.component';
import { MultiselectDropdownComponent } from '../shared/multiselect-dropdown.component';
import { DateRangeComponent } from '../shared/date-range.component';
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

/* ── Result column definitions ── */
export interface ResultColumn {
  key: string;
  label: string;
  field?: keyof Job;
  sortField?: string;
  width?: string;
}

const ALL_COLUMNS: ResultColumn[] = [
  { key: 'jobNumber',        label: 'Job #',            field: 'jobNumber',        sortField: 'jobNumber',        width: 'min-w-8' },
  { key: 'title',            label: 'Job',              field: 'title',            sortField: 'title',            width: 'min-w-14' },
  { key: 'trade',            label: 'Trade',            field: 'trade',            sortField: 'trade',            width: 'min-w-12' },
  { key: 'technician',       label: 'Technician',       field: 'technician',       sortField: 'technician',       width: 'min-w-11' },
  { key: 'drawingAndJoint',  label: 'Drawing & joint',  field: 'drawingAndJoint',  sortField: 'drawingAndJoint',  width: 'min-w-14' },
  { key: 'jointDesign',      label: 'Joint design',     field: 'jointDesign',      sortField: 'jointDesign',      width: 'min-w-12' },
  { key: 'weldType',         label: 'Weld type',        field: 'weldType',         sortField: 'weldType',         width: 'min-w-11' },
  { key: 'materialType1',    label: 'Material 1',       field: 'materialType1',    sortField: 'materialType1',    width: 'min-w-14' },
  { key: 'materialType2',    label: 'Material 2',       field: 'materialType2',    sortField: 'materialType2',    width: 'min-w-14' },
  { key: 'wps',              label: 'WPS',              field: 'wps',              sortField: 'wps',              width: 'min-w-11' },
  { key: 'nde',              label: 'NDE',              field: 'nde',              sortField: 'nde',              width: 'min-w-12' },
  { key: 'pwht',             label: 'PWHT',             field: 'pwht',             sortField: 'pwht',             width: 'min-w-14' },
  { key: 'estimatedCost',    label: 'Est. cost',        field: 'estimatedCost',    sortField: 'estimatedCost',    width: 'min-w-13' },
  { key: 'estimatedHours',   label: 'Est. hours',       field: 'estimatedHours',   sortField: 'estimatedHours',   width: 'min-w-10' },
  { key: 'scheduledFor',     label: 'Scheduled',        field: 'scheduledFor',     sortField: 'scheduledFor',     width: 'min-w-13' },
  { key: 'currentStep',      label: 'Current step',                                                                  width: 'min-w-13' },
  { key: 'tags',             label: 'Tags',                                                                            width: 'min-w-11' },
];

const DEFAULT_COLUMN_KEYS = ['jobNumber', 'title', 'drawingAndJoint', 'jointDesign', 'weldType', 'materialType1', 'currentStep', 'tags'];
const COLUMNS_LS_KEY = 'pn-demo:result-columns';

function loadColumnKeys(): string[] {
  try {
    const raw = localStorage.getItem(COLUMNS_LS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_COLUMN_KEYS;
  } catch { return DEFAULT_COLUMN_KEYS; }
}
function saveColumnKeys(keys: string[]) {
  try { localStorage.setItem(COLUMNS_LS_KEY, JSON.stringify(keys)); } catch { /* */ }
}

@Component({
  selector: 'app-adaptive-search',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TablePagerComponent, MultiselectDropdownComponent, DateRangeComponent,
    TooltipDirective,
    LucideSave, LucideX, LucideSlidersHorizontal, LucideListFilter,
    LucideFileSpreadsheet, LucideArrowUpRight, LucideCheck, LucideColumns3
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

  // --- Column picker (results grid) ---
  allColumns = ALL_COLUMNS;
  visibleColumnKeys = signal<string[]>(loadColumnKeys());
  visibleColumns = computed<ResultColumn[]>(() =>
    this.visibleColumnKeys().map(k => ALL_COLUMNS.find(c => c.key === k)).filter((c): c is ResultColumn => !!c)
  );

  showColPicker = signal(false);
  draftColKeys = signal<Set<string>>(new Set());
  colFilter = signal<string>('');

  groupedColumns = computed(() => {
    const q = this.colFilter().trim().toLowerCase();
    return ALL_COLUMNS.filter(c => !q || c.label.toLowerCase().includes(q));
  });

  openColPicker() {
    this.draftColKeys.set(new Set(this.visibleColumnKeys()));
    this.colFilter.set('');
    this.showColPicker.set(true);
  }

  isDraftCol(key: string): boolean { return this.draftColKeys().has(key); }
  toggleDraftCol(key: string, checked: boolean) {
    const next = new Set(this.draftColKeys());
    if (checked) next.add(key); else next.delete(key);
    this.draftColKeys.set(next);
  }
  selectAllCols(selected: boolean) {
    this.draftColKeys.set(selected ? new Set(ALL_COLUMNS.map(c => c.key)) : new Set());
  }
  applyColPicker() {
    const keys = ALL_COLUMNS.map(c => c.key).filter(k => this.draftColKeys().has(k));
    this.visibleColumnKeys.set(keys);
    saveColumnKeys(keys);
    this.showColPicker.set(false);
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
      { header: 'Drawing & joint', value: (r: Job) => r.drawingAndJoint },
      { header: 'Joint design', value: (r: Job) => r.jointDesign },
      { header: 'Weld type', value: (r: Job) => r.weldType },
      { header: 'Material 1', value: (r: Job) => r.materialType1 },
      { header: 'Material 2', value: (r: Job) => r.materialType2 },
      { header: 'WPS', value: (r: Job) => r.wps },
      { header: 'NDE', value: (r: Job) => r.nde },
      { header: 'PWHT', value: (r: Job) => r.pwht },
      { header: 'Est. cost', value: (r: Job) => Number(r.estimatedCost).toFixed(2) },
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
