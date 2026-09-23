/* adaptive filters screen, schema-driven */
//heavily custom
import { STORAGE } from '../../data/storage-keys';
import { Component, ElementRef, computed, effect, signal, viewChild, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideSave, LucideX, LucideSlidersHorizontal, LucideListFilter,
  LucideFileSpreadsheet, LucideArrowUpRight, LucideCheck, LucideColumns3
} from '@lucide/angular';

import { TableState } from '../../shared/table-state';
import { TablePagerComponent } from '../../shared/table-pager.component';
import { MultiselectDropdownComponent } from '../../shared/multiselect-dropdown.component';
import { DateRangeComponent } from '../../shared/date-range.component';
import { TooltipDirective } from '../../shared/tooltip.directive';
import { downloadCsv } from '../../data/export-csv';

import { JOBS, Job } from '../../data/jobs';
import {
  FILTER_SCHEMA, FilterField, FilterValues, FilterVariant, TextFilterValue,
  applyFilters, defaultValuesFor, getField, isEmpty,
  loadVariants, saveVariants
} from '../../data/filter-schema';
import { WorkflowStore } from '../services/workflow-store.service';
import { currentRoutingLabel } from '../../data/workflow';

const DEFAULT_KEYS = ['hull', 'id', 'drawing', 'joint', 'ndt'];

/* ── Result column definitions ── */
export interface ResultColumn {
  key: string;
  label: string;
  field?: keyof Job;
  sortField?: string;
  width?: string;
}

const ALL_COLUMNS: ResultColumn[] = [
  { key: 'id', label: 'XREFID', field: 'xrefid', sortField: 'xrefid', width: 'min-w-8' },
  { key: 'hull',            label: 'Hull',         field: 'hull',            sortField: 'hull',            width: 'min-w-14' },
  { key: 'trade',           label: 'Trade',           field: 'trade',           sortField: 'trade',           width: 'min-w-11' },
  { key: 'drawing',         label: 'Drawing',         field: 'drawing',         sortField: 'drawing',         width: 'min-w-12' },
  { key: 'drawingRev',      label: 'Drawing Rev',     field: 'drawingRev',      sortField: 'drawingRev',      width: 'min-w-10' },
  { key: 'joint',           label: 'Joint',           field: 'joint',           sortField: 'joint',           width: 'min-w-11' },
  { key: 'jointDesign',     label: 'Joint design',    field: 'jointDesign',     sortField: 'jointDesign',     width: 'min-w-12' },
  { key: 'weldType',        label: 'Weld type',       field: 'weldType',        sortField: 'weldType',        width: 'min-w-11' },
  { key: 'technician',      label: 'Technician',      field: 'technician',      sortField: 'technician',      width: 'min-w-11' },
  { key: 'materialType1',   label: 'Material 1',      field: 'materialType1',   sortField: 'materialType1',   width: 'min-w-14' },
  { key: 'materialType2',   label: 'Material 2',      field: 'materialType2',   sortField: 'materialType2',   width: 'min-w-14' },
  { key: 'pipeSize',        label: 'Pipe size',       field: 'pipeSize',        sortField: 'pipeSize',        width: 'min-w-10' },
  { key: 'wallThickness',   label: 'Wall thickness',  field: 'wallThickness',   sortField: 'wallThickness',   width: 'min-w-10' },
  { key: 'mcl1',            label: 'MCL 1',           field: 'mcl1',            sortField: 'mcl1',            width: 'min-w-10' },
  { key: 'mcl2',            label: 'MCL 2',           field: 'mcl2',            sortField: 'mcl2',            width: 'min-w-10' },
  { key: 'joiningItem',     label: 'Joining item',    field: 'joiningItem',     sortField: 'joiningItem',     width: 'min-w-12' },
  { key: 'joinToItem',      label: 'Join to item',    field: 'joinToItem',      sortField: 'joinToItem',      width: 'min-w-12' },
  { key: 'sequenceNumber',  label: 'Sequence #',      field: 'sequenceNumber',  sortField: 'sequenceNumber',  width: 'min-w-10' },
  { key: 'nInd',            label: 'Nuclear Indicator', field: 'nInd',            sortField: 'nInd',            width: 'min-w-8' },
  { key: 'wps',             label: 'WPS',             field: 'wps',             sortField: 'wps',             width: 'min-w-10' },
  { key: 'engineeringNotes', label: 'Eng. notes',     field: 'engineeringNotes', sortField: 'engineeringNotes', width: 'min-w-14' },
  { key: 'ndt',             label: 'NDT',             field: 'ndt',             sortField: 'ndt',             width: 'min-w-12' },
  { key: 'rtRoot',          label: 'RT Root',         field: 'rtRoot',          sortField: 'rtRoot',          width: 'min-w-10' },
  { key: 'rtFinal',         label: 'RT Final',        field: 'rtFinal',         sortField: 'rtFinal',         width: 'min-w-10' },
  { key: 'ndtRoot',         label: 'NDT Root',        field: 'ndtRoot',         sortField: 'ndtRoot',         width: 'min-w-10' },
  { key: 'ndtEach',         label: 'NDT Each',        field: 'ndtEach',         sortField: 'ndtEach',         width: 'min-w-10' },
  { key: 'ndtFinal',        label: 'NDT Final',       field: 'ndtFinal',        sortField: 'ndtFinal',        width: 'min-w-10' },
  { key: 'ut',              label: 'UT',              field: 'ut',              sortField: 'ut',              width: 'min-w-10' },
  { key: 'pwht',            label: 'PWHT',            field: 'pwht',            sortField: 'pwht',            width: 'min-w-10' },
  { key: 'order',           label: 'Order',           field: 'order',           sortField: 'order',           width: 'min-w-10' },
  { key: 'workPackage',     label: 'Work package',    field: 'workPackage',     sortField: 'workPackage',     width: 'min-w-10' },
  { key: 'workPermit',      label: 'Work permit',     field: 'workPermit',      sortField: 'workPermit',      width: 'min-w-10' },
  { key: 'waff',            label: 'WAFF',            field: 'waff',            sortField: 'waff',            width: 'min-w-10' },
  { key: 'serialNumber',    label: 'Serial #',        field: 'serialNumber',    sortField: 'serialNumber',    width: 'min-w-10' },
  { key: 'refitNumber',     label: 'Refit #',         field: 'refitNumber',     sortField: 'refitNumber',     width: 'min-w-10' },
  { key: 'repairNumber',    label: 'Repair #',        field: 'repairNumber',    sortField: 'repairNumber',    width: 'min-w-10' },
  { key: 'ss',              label: 'SS',              field: 'ss',              sortField: 'ss',              width: 'min-w-8' },
  { key: 'sfff',            label: 'SFFF',            field: 'sfff',            sortField: 'sfff',            width: 'min-w-8' },
  { key: 'dssAaa',          label: 'DSS/AAA',         field: 'dssAaa',          sortField: 'dssAaa',          width: 'min-w-10' },
  { key: 'er1',             label: 'ER 1',            field: 'er1',             sortField: 'er1',             width: 'min-w-10' },
  { key: 'er2',             label: 'ER 2',            field: 'er2',             sortField: 'er2',             width: 'min-w-10' },
  { key: 'er3',             label: 'ER 3',            field: 'er3',             sortField: 'er3',             width: 'min-w-10' },
  { key: 'er4',             label: 'ER 4',            field: 'er4',             sortField: 'er4',             width: 'min-w-10' },
  { key: 'attributeCode1',  label: 'Attr code 1',    field: 'attributeCode1',  sortField: 'attributeCode1',  width: 'min-w-10' },
  { key: 'attributeCode2',  label: 'Attr code 2',    field: 'attributeCode2',  sortField: 'attributeCode2',  width: 'min-w-10' },
  { key: 'attributeCode3',  label: 'Attr code 3',    field: 'attributeCode3',  sortField: 'attributeCode3',  width: 'min-w-10' },
  { key: 'attributeCode4',  label: 'Attr code 4',    field: 'attributeCode4',  sortField: 'attributeCode4',  width: 'min-w-10' },
  { key: 'estimatedCost',   label: 'Est. cost',       field: 'estimatedCost',   sortField: 'estimatedCost',   width: 'min-w-10' },
  { key: 'estimatedHours',  label: 'Est. hours',      field: 'estimatedHours',  sortField: 'estimatedHours',  width: 'min-w-10' },
  { key: 'scheduledFor',    label: 'Scheduled for',   field: 'scheduledFor',    sortField: 'scheduledFor',    width: 'min-w-12' },
  { key: 'currentRouting',     label: 'Current routing',                                                                     width: 'min-w-13' },
];

const DEFAULT_COLUMN_KEYS = ['id', 'hull', 'drawing', 'joint', 'jointDesign', 'weldType', 'ndt', 'currentRouting'];
const COLUMNS_LS_KEY = STORAGE.resultColumns;

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

  constructor(private router: Router, private store: WorkflowStore) {
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

  table = new TableState<Job>(['hull', 'trade', 'technician']);

  /* current routing label for a job */
  currentRouting(job: Job): string {
    return currentRoutingLabel(this.store.workflowFor(job)().stages);
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
  draftKeys = signal<string[]>([]);
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
    this.draftKeys.set([...this.visibleKeys()]);
    this.adaptFilter.set('');
    this.showAdapt.set(true);
  }

  isDraftSelected(key: string): boolean {
    return this.draftKeys().includes(key);
  }
  toggleDraft(key: string, checked: boolean) {
    const next = [...this.draftKeys()];
    const i = next.indexOf(key);
    if (checked && i < 0) next.push(key);
    if (!checked && i >= 0) next.splice(i, 1);
    this.draftKeys.set(next);
  }
  selectGroup(group: string, selected: boolean) {
    const next = [...this.draftKeys()];
    for (const f of this.schema) {
      if (f.group !== group) continue;
      const i = next.indexOf(f.key);
      if (selected && i < 0) next.push(f.key);
      if (!selected && i >= 0 && !f.required) next.splice(i, 1);
    }
    this.draftKeys.set(next);
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
  draftColKeys = signal<string[]>([]);
  colFilter = signal<string>('');

  groupedColumns = computed(() => {
    const q = this.colFilter().trim().toLowerCase();
    return ALL_COLUMNS.filter(c => !q || c.label.toLowerCase().includes(q));
  });

  openColPicker() {
    this.draftColKeys.set([...this.visibleColumnKeys()]);
    this.colFilter.set('');
    this.showColPicker.set(true);
  }

  isDraftCol(key: string): boolean { return this.draftColKeys().includes(key); }
  toggleDraftCol(key: string, checked: boolean) {
    const next = [...this.draftColKeys()];
    const i = next.indexOf(key);
    if (checked && i < 0) next.push(key);
    if (!checked && i >= 0) next.splice(i, 1);
    this.draftColKeys.set(next);
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

  /* reorder helpers */
  moveUp(arr: WritableSignal<string[]>, key: string) {
    const a = [...arr()];
    const i = a.indexOf(key);
    if (i > 0) { [a[i - 1], a[i]] = [a[i], a[i - 1]]; arr.set(a); }
  }
  moveDown(arr: WritableSignal<string[]>, key: string) {
    const a = [...arr()];
    const i = a.indexOf(key);
    if (i >= 0 && i < a.length - 1) { [a[i], a[i + 1]] = [a[i + 1], a[i]]; arr.set(a); }
  }

  // --- Field value helpers ---
  setValue(key: string, val: any) {
    this.values.set({ ...this.values(), [key]: val });
  }
  valueOf(key: string): any { return this.values()[key]; }

  textValue(key: string): TextFilterValue {
    return this.valueOf(key) ?? { text: '', negate: false };
  }
  setTextValue(key: string, text: string, negate: boolean) {
    this.setValue(key, { text, negate } satisfies TextFilterValue);
  }

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
      case 'text': {
        const { text, negate } = v as TextFilterValue;
        return `${f.label}: ${negate ? 'not ' : ''}"${text}"`;
      }
      case 'multiselect': return `${f.label}: ${(v as any[]).join(', ')}`;
      case 'select':      return `${f.label}: ${v}`;
      case 'range':       return `${f.label}: ${v[0]}–${v[1]}`;
      case 'daterange': {
        const fmt = (d: Date) => d ? d.toLocaleDateString() : '…';
        return `${f.label}: ${fmt(v[0])} – ${fmt(v[1])}`;
      }
    }
  }

  exportCsv() {
    downloadCsv('adaptive-search', this.visibleColumns().map(col => ({
      header: col.label,
      value: (r: Job) => col.key === 'currentRouting' ? this.currentRouting(r) : col.field ? String((r as any)[col.field] ?? '') : ''
    })), this.table.sorted());
  }

  /* typed casts for discriminated fields */
  asMulti(f: FilterField): Extract<FilterField, { type: 'multiselect' | 'select' }> {
    return f as any;
  }
  asRange(f: FilterField): Extract<FilterField, { type: 'range' }> {
    return f as any;
  }
}
