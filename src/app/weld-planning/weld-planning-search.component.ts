/* Advanced Search for Weld Planning — schema-driven filter bar + saved variants + column picker,
   mirrors adaptive-search.component.ts but scoped to WeldJoint records */
import { STORAGE } from '../data/storage-keys';
import { Component, ElementRef, computed, effect, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  LucideSave, LucideX, LucideTrash2, LucideSlidersHorizontal, LucideListFilter,
  LucideFileSpreadsheet, LucideArrowUpRight, LucideCheck, LucideColumns3, LucideArrowLeft
} from '@lucide/angular';

import { TableState } from '../shared/table-state';
import { TablePagerComponent } from '../shared/table-pager.component';
import { MultiselectDropdownComponent } from '../shared/multiselect-dropdown.component';
import { DateRangeComponent } from '../shared/date-range.component';
import { TooltipDirective } from '../shared/tooltip.directive';
import { OrderedPickListComponent } from '../shared/ordered-pick-list.component';
import { downloadCsv } from '../data/export-csv';

import { weldJoints, JOINT_EXTRA_FIELDS, type WeldJoint } from './weld-planning.data';
import {
  FILTER_SCHEMA, FilterField, FilterValues, FilterVariant,
  applyFilters, defaultValuesFor, getField, isEmpty,
  loadVariants, saveVariants
} from './weld-planning-filter-schema';

const DEFAULT_KEYS = ['hull', 'joint', 'status'];

export interface ResultColumn {
  key: string;
  label: string;
  field?: keyof WeldJoint;
  sortField?: string;
  width?: string;
}

const ALL_COLUMNS: ResultColumn[] = [
  { key: 'id',            label: 'XREFID',         field: 'id',            sortField: 'id',            width: 'min-w-8' },
  { key: 'hull',          label: 'Hull',           field: 'hull',          sortField: 'hull',          width: 'min-w-10' },
  { key: 'joint',         label: 'Joint',          field: 'joint',         sortField: 'joint',         width: 'min-w-11' },
  { key: 'description',   label: 'Description',    field: 'description',  sortField: 'description',  width: 'min-w-14' },
  { key: 'status',        label: 'Status',         field: 'status',       sortField: 'status',        width: 'min-w-10' },
  { key: 'priority',      label: 'Priority',       field: 'priority',     sortField: 'priority',      width: 'min-w-10' },
  { key: 'jointType',     label: 'Type',           field: 'jointType',    sortField: 'jointType',     width: 'min-w-8' },
  { key: 'drawing',       label: 'Drawing',        field: 'drawing',      sortField: 'drawing',       width: 'min-w-12' },
  { key: 'drawingRev',    label: 'Drawing Rev',    field: 'drawingRev',   sortField: 'drawingRev',    width: 'min-w-10' },
  { key: 'jointDesign',   label: 'Joint Design',   field: 'jointDesign',  sortField: 'jointDesign',   width: 'min-w-12' },
  { key: 'weldType',      label: 'Weld Type',      field: 'weldType',     sortField: 'weldType',      width: 'min-w-11' },
  { key: 'pipeSize',      label: 'Pipe Size',      field: 'pipeSize',     sortField: 'pipeSize',      width: 'min-w-10' },
  { key: 'wallThickness', label: 'Wall Thickness', field: 'wallThickness', sortField: 'wallThickness', width: 'min-w-10' },
  { key: 'materialType1', label: 'Material 1',     field: 'materialType1', sortField: 'materialType1', width: 'min-w-14' },
  { key: 'materialType2', label: 'Material 2',     field: 'materialType2', sortField: 'materialType2', width: 'min-w-14' },
  { key: 'rtRoot',        label: 'RT Root',        field: 'rtRoot',       sortField: 'rtRoot',        width: 'min-w-8' },
  { key: 'rtFinal',       label: 'RT Final',       field: 'rtFinal',      sortField: 'rtFinal',       width: 'min-w-8' },
  { key: 'ndtRoot',       label: 'NDT Root',       field: 'ndtRoot',      sortField: 'ndtRoot',       width: 'min-w-8' },
  { key: 'ndtEach',       label: 'NDT Each',       field: 'ndtEach',      sortField: 'ndtEach',       width: 'min-w-8' },
  { key: 'ndtFinal',      label: 'NDT Final',      field: 'ndtFinal',     sortField: 'ndtFinal',      width: 'min-w-8' },
  { key: 'ut',            label: 'UT',             field: 'ut',           sortField: 'ut',            width: 'min-w-8' },
  { key: 'vt',            label: 'VT',             field: 'vt',           sortField: 'vt',            width: 'min-w-8' },
  ...JOINT_EXTRA_FIELDS.map(f => ({ key: f.key, label: f.label, field: f.key, sortField: f.key, width: 'min-w-10' })),
  { key: 'notes',         label: 'Notes',          field: 'notes',        sortField: 'notes',         width: 'min-w-14' },
  { key: 'createdBy',     label: 'Created By',     field: 'createdBy',    sortField: 'createdBy',     width: 'min-w-10' },
  { key: 'createdAt',     label: 'Created',        field: 'createdAt',    sortField: 'createdAt',     width: 'min-w-11' },
];

const DEFAULT_COLUMN_KEYS = ['hull', 'joint', 'status', 'jointDesign', 'weldType', 'drawing'];
const COLUMNS_LS_KEY = STORAGE.weldPlanningResultColumns;

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
  selector: 'app-weld-planning-search',
  standalone: true,
  imports: [OrderedPickListComponent, 
    CommonModule, FormsModule, RouterLink,
    TablePagerComponent, MultiselectDropdownComponent, DateRangeComponent,
    TooltipDirective,
    LucideSave, LucideX, LucideTrash2, LucideSlidersHorizontal, LucideListFilter,
    LucideFileSpreadsheet, LucideArrowUpRight, LucideCheck, LucideColumns3, LucideArrowLeft
  ],
  templateUrl: './weld-planning-search.component.html'
})
export class WeldPlanningSearchComponent {
  private adaptDlg = viewChild<ElementRef<HTMLDialogElement>>('adaptDlg');

  constructor(private router: Router) {
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

  table = new TableState<WeldJoint>(['hull', 'joint', 'description']);

  openDetails(joint: WeldJoint) {
    this.router.navigate(['/weld-planning', joint.id]);
  }

  visibleKeys = signal<string[]>([...DEFAULT_KEYS]);
  values = signal<FilterValues>(defaultValuesFor(DEFAULT_KEYS));

  visibleFields = computed<FilterField[]>(() =>
    this.visibleKeys()
      .map(k => getField(k))
      .filter((f): f is FilterField => !!f)
  );

  totalJoints = weldJoints().length;
  filtered = computed<WeldJoint[]>(() => applyFilters(weldJoints(), this.values()));

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
  draftKeys = signal<string[]>([]);
  adaptFilter = signal<string>('');

  openAdapt() {
    this.draftKeys.set([...this.visibleKeys()]);
    this.adaptFilter.set('');
    this.showAdapt.set(true);
  }

  selectAll(selected: boolean) {
    const next: string[] = [];
    for (const f of this.schema) {
      if (selected || f.required) next.push(f.key);
    }
    this.draftKeys.set(next);
  }

  applyAdapt() {
    const requiredKeys = this.schema.filter(f => f.required).map(f => f.key);
    const draft = this.draftKeys();
    const finalKeys = draft.length ? draft : this.schema.map(f => f.key).filter(k => requiredKeys.includes(k));

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
  /* name of the variant chosen in the droplist ('' = none); the name box only shows while saving */
  selectedVariant = signal<string>('');
  savingVariant = signal(false);

  pickVariant(name: string) {
    this.selectedVariant.set(name);
    const v = this.variants().find(x => x.name === name);
    if (v) this.applyVariant(v);
  }

  /* prefill with the chosen variant's name, so saving again updates it */
  startSaveVariant() {
    this.variantName.set(this.selectedVariant());
    this.savingVariant.set(true);
  }

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
    this.selectedVariant.set(name);
    this.savingVariant.set(false);
  }

  deleteVariant(name: string) {
    const merged = this.variants().filter(v => v.name !== name);
    this.variants.set(merged);
    saveVariants(merged);
    if (this.selectedVariant() === name) this.selectedVariant.set('');
  }

  // --- Column picker (results grid) ---
  allColumns = ALL_COLUMNS;
  visibleColumnKeys = signal<string[]>(loadColumnKeys());
  visibleColumns = computed<ResultColumn[]>(() =>
    this.visibleColumnKeys().map(k => ALL_COLUMNS.find(c => c.key === k)).filter((c): c is ResultColumn => !!c)
  );

  showColPicker = signal(false);
  draftColKeys = signal<string[]>([]);
  colFilter = signal<string>('');


  openColPicker() {
    this.draftColKeys.set([...this.visibleColumnKeys()]);
    this.colFilter.set('');
    this.showColPicker.set(true);
  }

  selectAllCols(selected: boolean) {
    this.draftColKeys.set(selected ? ALL_COLUMNS.map(c => c.key) : []);
  }
  applyColPicker() {
    const keys = this.draftColKeys();
    this.visibleColumnKeys.set(keys);
    saveColumnKeys(keys);
    this.showColPicker.set(false);
  }

  // --- Field value helpers ---
  setValue(key: string, val: any) {
    this.values.set({ ...this.values(), [key]: val });
  }
  valueOf(key: string): any { return this.values()[key]; }

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
    this.selectedVariant.set('');
  }

  chipLabelFor(f: FilterField, v: any): string {
    switch (f.type) {
      case 'text':        return `${f.label}: "${v}"`;
      case 'multiselect': return `${f.label}: ${(v as any[]).join(', ')}`;
      case 'select':      return `${f.label}: ${v || 'Blank'}`;
      case 'daterange': {
        const fmt = (d: Date) => d ? d.toLocaleDateString() : '…';
        return `${f.label}: ${fmt(v[0])} – ${fmt(v[1])}`;
      }
    }
  }

  exportCsv() {
    downloadCsv('weld-planning-advanced-search', this.visibleColumns().map(col => ({
      header: col.label,
      value: (r: WeldJoint) => col.field ? String((r as any)[col.field] ?? '') : ''
    })), this.table.sorted());
  }

  /* typed casts for discriminated fields */
  asMulti(f: FilterField): Extract<FilterField, { type: 'multiselect' | 'select' }> {
    return f as any;
  }
}
