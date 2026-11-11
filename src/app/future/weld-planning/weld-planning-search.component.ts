/* Weld Planning's Advanced Search, laid out like Pipe Welding: stacked-condition filter bar (shared
   condition bar), keyword search, column header filters, a column picker with draggable headings,
   and saved views that keep filters and columns together. */
import { Component, ElementRef, computed, effect, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  LucideSave, LucideX, LucideTrash2, LucideListFilter, LucideSearch,
  LucideFileSpreadsheet, LucideArrowUpRight, LucideCheck, LucideColumns3, LucideArrowLeft, LucideChevronDown, LucideChevronUp
} from '@lucide/angular';

import { TableState } from '../../shared/table-state';
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

import { weldJoints } from '../../data/weld-planning';
import {
  SEARCH_FIELDS, SearchField, SearchRow, FilterVariant, SearchLayout, STANDARD_VARIANT,
  buildRow, standardLayout, loadVariants, saveVariants, loadSearchState, saveSearchState
} from './weld-planning-filter-schema';

const PAGE_SIZES = [10, 25, 50, 100];

/* a header filter's picks match a joint when any of the cell's values is picked (Filler Metal Type holds several) */
const anyPicked = (cell: unknown, picked: string | string[]) =>
  (Array.isArray(cell) ? cell : [cell]).some(v => (picked as string[]).includes(String(v ?? '')));

@Component({
  selector: 'app-weld-planning-search',
  standalone: true,
  imports: [OrderedPickListComponent, MenuButtonComponent, ConditionBarComponent,
    CommonModule, FormsModule, RouterLink,
    TablePagerComponent, SortHeaderComponent,
    LucideSave, LucideX, LucideTrash2, LucideListFilter, LucideSearch,
    LucideFileSpreadsheet, LucideArrowUpRight, LucideCheck, LucideColumns3, LucideArrowLeft, LucideChevronDown, LucideChevronUp
  ],
  templateUrl: './weld-planning-search.component.html'
})
export class WeldPlanningSearchComponent {
  private adaptDlg = viewChild<ElementRef<HTMLDialogElement>>('adaptDlg');

  readonly STANDARD = STANDARD_VARIANT;
  fields = SEARCH_FIELDS;
  private fieldMap = new Map(this.fields.map(f => [f.key, f]));
  field = (key: string) => this.fieldMap.get(key);

  table = new TableState<SearchRow>(
    ['id', 'hull', 'drawing', 'joint', 'gwp'],
    Object.fromEntries(this.fields.filter(f => f.kind === 'list').map(f => [f.key, anyPicked]))
  );

  filterKeys = signal<string[]>([]);
  values = signal<FilterValues>({});
  columnKeys = signal<string[]>([]);
  selectedVariant = signal<string>(STANDARD_VARIANT);
  /* filter bar folded away (chips still show what's active); remembered, not part of a view */
  filtersHidden = signal(false);
  colDrag = new ColumnDrag(this.columnKeys);

  constructor(private router: Router, private confirm: ConfirmService) {
    const saved = loadSearchState();
    if (saved) {
      this.applyLayout(saved);
      this.selectedVariant.set(saved.variant || STANDARD_VARIANT);
      this.filtersHidden.set(!!saved.filtersHidden);
      this.table.pageSize.set(PAGE_SIZES.includes(saved.pageSize) ? saved.pageSize : 10);
    } else {
      this.applyLayout(standardLayout());
    }

    effect(() => this.table.setRows(this.filtered()));
    effect(() => saveSearchState({
      ...this.currentLayout(),
      variant: this.selectedVariant(),
      filtersHidden: this.filtersHidden(),
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

  private allRows = computed<SearchRow[]>(() => weldJoints().map(buildRow));
  filtered = computed<SearchRow[]>(() => applyFilters(this.allRows(), this.fields, this.values()));
  totalJoints = computed(() => weldJoints().length);

  /* choices for a list field: the values joints actually have */
  private optionCache = computed(() => {
    const rows = this.allRows();
    const out = new Map<string, { label: string; value: string }[]>();
    for (const f of this.fields) {
      if (f.kind !== 'list') continue;
      const vals = rows.flatMap(r => { const v = (r as Record<string, unknown>)[f.key]; return Array.isArray(v) ? v : [v]; });
      out.set(f.key, [...new Set(vals.map(v => String(v ?? '')).filter(Boolean))].sort().map(v => ({ label: v, value: v })));
    }
    return out;
  });
  optionsFor(key: string) { return this.optionCache().get(key) ?? []; }
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

  deleteVariant(name: string) {
    this.confirm.confirm({
      header: 'Delete View',
      message: `Delete the view "${name}"?`,
      acceptLabel: 'Delete',
      accept: () => {
        const merged = this.variants().filter(v => v.name !== name);
        this.variants.set(merged);
        saveVariants(merged);
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

  openDetails(row: SearchRow) { this.router.navigate(['/weld-planning', row.id]); }

  /* column header filter kind: list = multiselect, text = box; dates sort only */
  headerFilter(f: SearchField): 'text' | 'select' | 'none' {
    return f.kind === 'list' ? 'select' : f.kind === 'text' ? 'text' : 'none';
  }

  cellText(row: SearchRow, f: SearchField): string {
    const v = (row as Record<string, any>)[f.key];
    if (f.kind === 'date') return v ? formatDate(v) : '';
    if (Array.isArray(v)) return v.length ? v.join(', ') : '-';
    /* a missing XREFID stays blank, as on every list */
    return v == null || v === '' ? (f.key === 'id' ? '' : '-') : String(v);
  }

  exportCsv() {
    downloadCsv('weld-planning-advanced-search', this.visibleColumns().map(f => ({
      header: f.label,
      value: (r: SearchRow) => { const t = this.cellText(r, f); return t === '-' ? '' : t; },
    })), this.table.sorted());
  }
}
