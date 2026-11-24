/* Structural Welding: Pipe Welding's search over the structural joints. Stacked-condition filter bar
   (shared condition bar), keyword search, column header filters, a column picker with draggable headings,
   saved views (with a default per browser) and Export. No role, routing, Release, Details or History yet. */
import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideSave, LucideX, LucideTrash2, LucideListFilter, LucideSearch,
  LucideFileSpreadsheet, LucideCheck, LucideColumns3, LucideStar, LucideChevronDown, LucideChevronUp,
  LucideHistory, LucideArrowUpRight
} from '@lucide/angular';

import { TableState, inArray } from '../../shared/table-state';
import { TablePagerComponent } from '../../shared/table-pager.component';
import { SortHeaderComponent } from '../../shared/sort-header.component';
import { OrderedPickListComponent } from '../../shared/ordered-pick-list.component';
import { MenuButtonComponent } from '../../shared/menu-button.component';
import { ConditionBarComponent } from '../../shared/condition-bar/condition-bar.component';
import { ColumnDrag } from '../../shared/column-drag';
import { ConfirmService } from '../../shared/confirm.service';
import { downloadCsv } from '../../shared/export-csv';
import { formatDate } from '../../shared/date-format';
import { FilterValues, activeConditions, applyFilters, chipLabel } from '../../shared/filter-engine';
import { ViewerService } from '../access-logic/viewer.service';

import { STRUCTURAL_JOINTS } from '../../data/structural-joints';
import {
  SEARCH_FIELDS, SearchField, SearchRow, FilterVariant, SearchLayout, STANDARD_VARIANT,
  buildRow, standardLayout, loadVariants, saveVariants, loadSearchState, loadTabSearchState, saveSearchState,
  loadDefaultVariant, saveDefaultVariant
} from './rules/structural-search-schema';

const PAGE_SIZES = [10, 25, 50, 100];

@Component({
  selector: 'app-structural-welding-page',
  standalone: true,
  imports: [OrderedPickListComponent, MenuButtonComponent, ConditionBarComponent,
    CommonModule, FormsModule,
    TablePagerComponent, SortHeaderComponent,
    LucideSave, LucideX, LucideTrash2, LucideListFilter, LucideSearch,
    LucideFileSpreadsheet, LucideCheck, LucideColumns3, LucideStar, LucideChevronDown, LucideChevronUp,
    LucideHistory, LucideArrowUpRight
  ],
  templateUrl: './structural-welding-page.component.html'
})
export class StructuralWeldingPageComponent {
  private adaptDlg = viewChild<ElementRef<HTMLDialogElement>>('adaptDlg');

  /* History and Details show for the same roles as on Pipe Welding; they open nothing yet */
  readonly viewer = inject(ViewerService);
  readonly STANDARD = STANDARD_VARIANT;
  fields = SEARCH_FIELDS;
  private fieldMap = new Map(this.fields.map(f => [f.key, f]));
  field = (key: string) => this.fieldMap.get(key);

  /* column header filters: list columns get a multiselect, so they need the in-list predicate */
  table = new TableState<SearchRow>(
    ['xrefid', 'hull', 'drawing', 'joint', 'order', 'sequenceNumber'],
    Object.fromEntries(this.fields.filter(f => f.kind === 'list').map(f => [f.key, inArray]))
  );

  filterKeys = signal<string[]>([]);
  values = signal<FilterValues>({});
  columnKeys = signal<string[]>([]);
  selectedVariant = signal<string>(STANDARD_VARIANT);
  /* filter bar folded away (chips still show what's active); remembered, not part of a view */
  filtersHidden = signal(false);
  colDrag = new ColumnDrag(this.columnKeys);

  constructor(private confirm: ConfirmService) {
    /* this tab's state (refresh, coming back), else a new visit: the default view, filter bar hidden;
       page size carries over */
    const saved = loadTabSearchState();
    if (saved) {
      this.applyLayout(saved);
      this.selectedVariant.set(saved.variant || STANDARD_VARIANT);
    } else this.pickVariant(this.defaultVariant() || STANDARD_VARIANT);
    const last = saved ?? loadSearchState();
    this.filtersHidden.set(saved ? !!saved.filtersHidden : true);
    if (last) this.table.pageSize.set(PAGE_SIZES.includes(last.pageSize) ? last.pageSize : 10);
    if (saved) this.table.page.set(saved.page ?? 0);

    effect(() => this.table.setRows(this.filtered()));
    effect(() => saveSearchState({
      ...this.currentLayout(),
      variant: this.selectedVariant(),
      filtersHidden: this.filtersHidden(),
      page: this.table.page(),
      pageSize: this.table.pageSize(),
    }));
    effect(() => {
      const open = this.showAdapt();
      const el = this.adaptDlg()?.nativeElement;
      if (!el) return;
      if (open && !el.open) el.showModal();
      if (!open && el.open) el.close();
    });
  }

  // --- Rows ---

  private allRows = STRUCTURAL_JOINTS.map(buildRow);
  filtered = computed<SearchRow[]>(() => applyFilters(this.allRows, this.fields, this.values()));
  totalJoints = STRUCTURAL_JOINTS.length;

  /* choices for a list field: the values joints actually have */
  private optionCache = new Map(this.fields.filter(f => f.kind === 'list').map(f => [f.key,
    [...new Set(this.allRows.map(r => String(r[f.key] ?? '')).filter(Boolean))].sort().map(v => ({ label: v, value: v }))]));
  optionsFor(key: string) { return this.optionCache.get(key) ?? []; }
  optionsFn = (key: string) => this.optionsFor(key);

  filterFields = computed<SearchField[]>(() =>
    this.filterKeys().map(k => this.field(k)).filter((f): f is SearchField => !!f));
  visibleColumns = computed<SearchField[]>(() =>
    this.columnKeys().map(k => this.field(k)).filter((f): f is SearchField => !!f));

  activeChips = computed(() => this.filterFields()
    .filter(f => activeConditions(f, this.values()[f.key]).length)
    .map(f => ({ key: f.key, label: chipLabel(f, this.values()[f.key]) })));

  // --- Layout (what a view saves) ---

  currentLayout(): SearchLayout {
    return {
      filterKeys: this.filterKeys(),
      values: this.values(),
      columnKeys: this.columnKeys(),
      columnFilters: this.table.columnFilters(),
      globalFilter: this.table.globalFilter(),
      sortField: this.table.sortField(),
      sortOrder: this.table.sortOrder(),
    };
  }

  private applyLayout(l: SearchLayout) {
    const known = (keys: string[]) => (keys ?? []).filter(k => this.fieldMap.has(k));
    this.filterKeys.set(known(l.filterKeys));
    this.values.set(JSON.parse(JSON.stringify(l.values ?? {})));
    this.columnKeys.set(known(l.columnKeys));
    this.table.columnFilters.set({ ...(l.columnFilters ?? {}) });
    this.table.globalFilter.set(l.globalFilter ?? '');
    this.table.sortField.set(l.sortField ?? null);
    this.table.sortOrder.set(l.sortOrder ?? 1);
    this.table.page.set(0);
  }

  // --- Views ---
  variants = signal<FilterVariant[]>(loadVariants());
  variantName = signal<string>('');
  savingVariant = signal(false);

  pickVariant(name: string) {
    this.selectedVariant.set(name);
    if (name === STANDARD_VARIANT) { this.applyLayout(standardLayout()); return; }
    const v = this.variants().find(x => x.name === name);
    if (v) this.applyLayout(v);
  }

  /* prefill with the chosen view's name, so saving again updates it */
  startSaveVariant() {
    this.variantName.set(this.selectedVariant() === STANDARD_VARIANT ? '' : this.selectedVariant());
    this.savingVariant.set(true);
  }

  canSaveVariant = computed(() => {
    const n = this.variantName().trim();
    return !!n && n.toLowerCase() !== STANDARD_VARIANT.toLowerCase();
  });

  saveCurrentVariant() {
    if (!this.canSaveVariant()) return;
    const name = this.variantName().trim();
    const next: FilterVariant = { name, ...JSON.parse(JSON.stringify(this.currentLayout())) };
    const merged = [...this.variants().filter(v => v.name !== name), next];
    this.variants.set(merged);
    saveVariants(merged);
    this.selectedVariant.set(name);
    this.savingVariant.set(false);
  }

  /* this browser's default: what a new visit opens on. '' = none (Standard is the built-in default) */
  defaultVariant = signal<string>((() => {
    const name = loadDefaultVariant();
    return name && loadVariants().some(v => v.name === name) ? name : '';
  })());

  isDefault = (name: string) => name === STANDARD_VARIANT ? !this.defaultVariant() : this.defaultVariant() === name;

  toggleDefault() {
    const name = this.selectedVariant();
    this.setDefault(this.isDefault(name) ? STANDARD_VARIANT : name);
  }

  /* the View menu's default item; nothing to offer when Standard is already the default */
  defaultMenuLabel = computed(() => {
    const name = this.selectedVariant();
    if (!this.isDefault(name)) return 'Make this my default';
    return name === STANDARD_VARIANT ? '' : 'Stop using as my default';
  });

  private setDefault(name: string) {
    const next = name === STANDARD_VARIANT ? '' : name;
    this.defaultVariant.set(next);
    saveDefaultVariant(next);
  }

  deleteVariant(name: string) {
    this.confirm.confirm({
      header: 'Delete View',
      message: `Delete the view "${name}"?`,
      acceptLabel: 'Delete',
      accept: () => {
        const merged = this.variants().filter(v => v.name !== name);
        this.variants.set(merged);
        saveVariants(merged);
        if (this.defaultVariant() === name) this.setDefault(STANDARD_VARIANT);
        if (this.selectedVariant() === name) this.selectedVariant.set(STANDARD_VARIANT);
      },
    });
  }

  // --- Customize filters dialog ---
  showAdapt = signal(false);
  draftKeys = signal<string[]>([]);
  adaptFilter = signal<string>('');

  openAdapt() {
    this.draftKeys.set([...this.filterKeys()]);
    this.adaptFilter.set('');
    this.showAdapt.set(true);
  }

  applyAdapt() {
    const keys = this.draftKeys();
    this.filterKeys.set(keys);
    /* show the bar, or the fields just added would be out of sight */
    if (keys.length) this.filtersHidden.set(false);
    /* a field taken out of the bar stops filtering */
    this.values.set(Object.fromEntries(Object.entries(this.values()).filter(([k]) => keys.includes(k))));
    this.showAdapt.set(false);
  }

  /* the x beside a field in the bar: same as unticking it in Add field */
  removeFilterField(key: string) {
    this.filterKeys.update(keys => keys.filter(k => k !== key));
    this.values.update(v => Object.fromEntries(Object.entries(v).filter(([k]) => k !== key)));
  }

  // --- Column picker ---
  showColPicker = signal(false);
  draftColKeys = signal<string[]>([]);
  colFilter = signal<string>('');

  openColPicker() {
    this.draftColKeys.set([...this.columnKeys()]);
    this.colFilter.set('');
    this.showColPicker.set(true);
  }

  applyColPicker() {
    const keys = this.draftColKeys();
    this.columnKeys.set(keys);
    /* a hidden column's header filter and sort would keep acting with nothing on screen to show it */
    this.table.columnFilters.update(f => Object.fromEntries(Object.entries(f).filter(([k]) => keys.includes(k))));
    if (this.table.sortField() && !keys.includes(this.table.sortField()!)) this.table.sortField.set(null);
    this.showColPicker.set(false);
  }

  // --- Filter bar values ---

  setValues(v: FilterValues) {
    this.values.set(v);
    this.table.page.set(0);
  }

  clearField(key: string) { this.setValues({ ...this.values(), [key]: [] }); }

  /* anything narrowing the rows: filter bar, heading filters or keyword search */
  isFiltering = computed(() =>
    this.activeChips().length > 0
    || Object.values(this.table.columnFilters()).some(v => Array.isArray(v) ? v.length : !!v)
    || !!this.table.globalFilter());

  clear() {
    this.values.set({});
    this.table.clearFilters();
  }

  /* column header filter kind: list = multiselect, text = box; numbers and dates sort only */
  headerFilter(f: SearchField): 'text' | 'select' | 'none' {
    return f.kind === 'list' ? 'select' : f.kind === 'text' ? 'text' : 'none';
  }

  cellText(row: SearchRow, f: SearchField): string {
    const v = row[f.key];
    if (f.kind === 'date') return v ? formatDate(v) : '';
    /* a missing XREFID stays blank, as on every list */
    return v == null || v === '' ? (f.key === 'xrefid' ? '' : '-') : String(v);
  }

  exportCsv() {
    downloadCsv('structural-welding', this.visibleColumns().map(f => ({
      header: f.label,
      value: (r: SearchRow) => { const t = this.cellText(r, f); return t === '-' ? '' : t; },
    })), this.table.sorted());
  }
}
