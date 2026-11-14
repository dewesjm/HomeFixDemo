/* Pipe Welding (built as Advanced Search, still named that in code): the job table (role, keyword
   search, column filters, Release to Welding, History) plus Adapt filters with stacked conditions, a
   column picker and saved variants that keep filters and columns together. Every Job, Fabrication and
   step field can be a filter or a column. */
import { Component, ElementRef, computed, effect, inject, linkedSignal, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideSave, LucideX, LucideTrash2, LucideListFilter, LucideSearch,
  LucideFileSpreadsheet, LucideArrowUpRight, LucideCheck, LucideColumns3, LucideHistory, LucideStar, LucideChevronDown, LucideChevronUp
} from '@lucide/angular';

import { TableState, inArray } from '../../shared/table-state';
import { TablePagerComponent } from '../../shared/table-pager.component';
import { SortHeaderComponent } from '../../shared/sort-header.component';
import { OrderedPickListComponent } from '../../shared/ordered-pick-list.component';
import { BannerPillComponent } from '../../shared/banner-pill.component';
import { MenuButtonComponent } from '../../shared/menu-button.component';
import { ConfirmService } from '../../shared/confirm.service';
import { downloadCsv } from '../../shared/export-csv';
import { ConditionBarComponent } from '../../shared/condition-bar/condition-bar.component';
import { ColumnDrag } from '../../shared/column-drag';
import { bannerFor } from '../../data/banner';

import { JOBS } from '../../data/jobs';
import {
  SearchField, SearchRow, FilterVariant, SearchLayout, STANDARD_VARIANT,
  searchFields, buildRow, isExtraKey, standardLayout,
  loadVariants, saveVariants, loadSearchState, loadTabSearchState, saveSearchState,
  loadDefaultVariant, saveDefaultVariant
} from './filter-schema';
import {
  FilterValues, activeConditions, applyFilters, chipLabel
} from '../../shared/filter-engine';
import { allStepAnswerFields } from '../catalogs/field-choices';
import { WorkflowStore } from '../services/workflow-store.service';
import { SignoffService } from '../services/signoff.service';
import { activeStage } from '../routing-logic/current-routing';
import { DEFAULT_DEMO_PERSON } from '../../data/demo-people';
import { ViewerService } from '../access-logic/viewer.service';
import { type Role } from '../../data/roles';
import { formatDate } from '../../shared/date-format';
import { jointRoute } from '../joint-page/joint-route';

const PAGE_SIZES = [10, 25, 50, 100];

@Component({
  selector: 'app-pipe-welding-page',
  standalone: true,
  imports: [OrderedPickListComponent, BannerPillComponent, MenuButtonComponent,
    CommonModule, FormsModule,
    TablePagerComponent, SortHeaderComponent, ConditionBarComponent,
    LucideSave, LucideX, LucideTrash2, LucideListFilter, LucideSearch,
    LucideFileSpreadsheet, LucideArrowUpRight, LucideCheck, LucideColumns3, LucideHistory, LucideStar, LucideChevronDown, LucideChevronUp
  ],
  templateUrl: './pipe-welding-page.component.html'
})
export class PipeWeldingPageComponent {
  private adaptDlg = viewChild<ElementRef<HTMLDialogElement>>('adaptDlg');

  readonly STANDARD = STANDARD_VARIANT;
  banner = signal(bannerFor('pipe-welding'));
  private viewer = inject(ViewerService);
  roleOptions = computed(() => this.viewer.roles().map(role => ({
    label: role === 'View' ? 'View All' : role,
    value: role,
  })));
  private defaultRole = this.viewer.defaultRole;

  fields = searchFields();
  private fieldMap = new Map(this.fields.map(f => [f.key, f]));
  private stepFields = new Map(allStepAnswerFields().map(f => [f.key, f]));
  field = (key: string) => this.fieldMap.get(key);

  /* column header filters: list columns get a multiselect, so they need the in-list predicate */
  table = new TableState<SearchRow>(
    ['xrefid', 'hull', 'drawing', 'joint', 'order', 'sequenceNumber'],
    Object.fromEntries(this.fields.filter(f => f.kind === 'list').map(f => [f.key, inArray]))
  );

  selectedRole = linkedSignal<{ person: ReturnType<ViewerService['person']>; roles: Role[] }, Role | null>({
    source: () => ({ person: this.viewer.person(), roles: this.viewer.roles() }),
    computation: ({ person, roles }, previous): Role | null => {
      const prior = previous?.value;
      if (person === previous?.source.person && prior && roles.includes(prior)) return prior;
      return this.defaultRole();
    },
  });
  filterKeys = signal<string[]>([]);
  values = signal<FilterValues>({});
  columnKeys = signal<string[]>([]);
  /* name of the variant chosen in the droplist; Standard = the built-in Pipe Welding look */
  selectedVariant = signal<string>(STANDARD_VARIANT);
  /* filter bar folded away (chips still show what's active); remembered, not part of a variant */
  filtersHidden = signal(false);
  colDrag = new ColumnDrag(this.columnKeys);

  constructor(private router: Router, private store: WorkflowStore, private signoffService: SignoffService,
              private confirm: ConfirmService) {
    /* this tab's state (refresh, back from a joint), else a new visit: the default variant */
    const saved = loadTabSearchState();
    if (saved) {
      const savedViewer = saved.viewerId ?? DEFAULT_DEMO_PERSON.id;
      this.applyLayout(saved, savedViewer === this.viewer.person().id ? saved.role : null);
    } else this.pickVariant(this.defaultVariant() || STANDARD_VARIANT);
    /* a new visit starts with the filter bar hidden; page size carries over */
    const last = saved ?? loadSearchState();
    this.filtersHidden.set(saved ? !!saved.filtersHidden : true);
    if (last) this.table.pageSize.set(PAGE_SIZES.includes(last.pageSize) ? last.pageSize : 10);
    if (saved) {
      this.selectedVariant.set(saved.variant || STANDARD_VARIANT);
      this.table.page.set(saved.page ?? 0);
    }

    effect(() => this.table.setRows(this.filtered()));
    effect(() => {
      this.viewer.person();
      this.selectedIds.set(new Set());
    });
    effect(() => saveSearchState({
      ...this.currentLayout(),
      variant: this.selectedVariant(),
      viewerId: this.viewer.person().id,
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

  /* fabrication / step fields only get worked out when a column, filter or sort uses them */
  private extraKeys = computed(() => [...new Set([
    ...this.columnKeys(), ...this.filterKeys(), this.table.sortField() ?? '',
  ])].filter(k => k && this.fieldMap.has(k) && isExtraKey(k)));

  /* every job as a row, before any filter: also what the list fields' choices come from */
  private allRows = computed<SearchRow[]>(() => {
    const extra = this.extraKeys();
    return JOBS.map(j => buildRow(j, this.store.workflowFor(j)(), extra, this.stepFields));
  });

  /* role droplist: jobs whose current step routes to that role (same as Pipe Welding) */
  private roleRows = computed<SearchRow[]>(() => {
    const role = this.selectedRole();
    if (!role || role === 'View') return this.allRows();
    return this.allRows().filter(r => {
      const current = activeStage(this.store.workflowFor(r)().stages);
      return (current?.role ?? '').split('|').includes(role);
    });
  });

  filtered = computed<SearchRow[]>(() => applyFilters(this.roleRows(), this.fields, this.values()));
  totalJobs = JOBS.length;

  /* choices for a list field: the values it actually has */
  private optionCache = computed(() => {
    const rows = this.allRows();
    const out = new Map<string, { label: string; value: string }[]>();
    for (const f of this.fields) {
      if (f.kind !== 'list' || !(f.key in (rows[0] ?? {}))) continue;
      out.set(f.key, [...new Set(rows.map(r => String(r[f.key] ?? '')).filter(Boolean))].sort()
        .map(v => ({ label: v, value: v })));
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

  // --- Layout (what a variant saves) ---

  currentLayout(): SearchLayout {
    return {
      filterKeys: this.filterKeys(),
      values: this.values(),
      columnKeys: this.columnKeys(),
      columnFilters: this.table.columnFilters(),
      globalFilter: this.table.globalFilter(),
      sortField: this.table.sortField(),
      sortOrder: this.table.sortOrder(),
      role: this.selectedRole() ?? '',
    };
  }

  private applyLayout(l: SearchLayout, role: string | null = l.role) {
    const known = (keys: string[]) => keys.filter(k => this.fieldMap.has(k));
    this.filterKeys.set(known(l.filterKeys));
    this.values.set(JSON.parse(JSON.stringify(l.values ?? {})));
    this.columnKeys.set(known(l.columnKeys));
    this.table.columnFilters.set({ ...(l.columnFilters ?? {}) });
    this.table.globalFilter.set(l.globalFilter ?? '');
    this.table.sortField.set(l.sortField ?? null);
    this.table.sortOrder.set(l.sortOrder ?? 1);
    this.selectedRole.set(this.viewer.roles().find(option => option === role) ?? this.defaultRole());
    this.table.page.set(0);
    this.selectedIds.set(new Set());
  }

  // --- Variants ---
  variants = signal<FilterVariant[]>(loadVariants());
  variantName = signal<string>('');
  savingVariant = signal(false);

  pickVariant(name: string) {
    this.selectedVariant.set(name);
    if (name === STANDARD_VARIANT) { this.applyLayout(standardLayout(), null); return; }
    const v = this.variants().find(x => x.name === name);
    if (v) this.applyLayout(v);
  }

  /* prefill with the chosen variant's name, so saving again updates it */
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

  /* the star: makes the chosen variant the default, or (already the default) goes back to Standard */
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

  // --- Adapt Filters dialog ---
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
    const prev = this.values();
    this.filterKeys.set(keys);
    /* show the bar, or the fields just added would be out of sight */
    if (keys.length) this.filtersHidden.set(false);
    /* a field taken out of the bar stops filtering */
    this.values.set(Object.fromEntries(Object.entries(prev).filter(([k]) => keys.includes(k))));
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

  /* anything narrowing the rows: filter bar, heading filters, keyword search or role */
  isFiltering = computed(() =>
    this.activeChips().length > 0
    || Object.values(this.table.columnFilters()).some(v => Array.isArray(v) ? v.length : !!v)
    || !!this.table.globalFilter()
    || this.selectedRole() !== this.defaultRole());

  clear() {
    this.values.set({});
    this.table.clearFilters();
    this.selectedRole.set(this.defaultRole());
  }

  onRoleChange(role: Role) {
    if (!this.viewer.roles().includes(role)) return;
    this.selectedRole.set(role);
    this.table.columnFilters.update(f => ({ ...f, currentRouting: [] }));
  }

  // --- Row selection + Release to Welding (same as Pipe Welding) ---
  selectedIds = signal<Set<string>>(new Set());

  allSelected(): boolean {
    const page = this.table.paged();
    return page.length > 0 && page.every(r => this.selectedIds().has(r.id));
  }

  toggleSelectAll() {
    const page = this.table.paged();
    const next = new Set(this.selectedIds());
    if (this.allSelected()) page.forEach(r => next.delete(r.id));
    else page.forEach(r => next.add(r.id));
    this.selectedIds.set(next);
  }

  toggleSelect(id: string) {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id); else next.add(id);
    this.selectedIds.set(next);
  }

  canReleaseSelected = computed(() => {
    if (this.selectedRole() !== 'Foreman') return false;
    const ids = this.selectedIds();
    if (ids.size === 0) return false;
    return this.table.paged().filter(r => ids.has(r.id)).every(r => r.currentRouting === 'Fit-Up Release');
  });

  releaseSelected() {
    const ids = this.selectedIds();
    for (const row of this.table.paged()) {
      if (ids.has(row.id)) this.signoffService.releaseFitUp(row);
    }
    this.selectedIds.set(new Set());
  }

  openDetails(row: SearchRow) { this.router.navigate(jointRoute(row)); }
  openHistory(row: SearchRow) { this.router.navigate(['/history'], { queryParams: { job: row.id } }); }

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
    downloadCsv('pipe-welding', this.visibleColumns().map(f => ({
      header: f.label,
      value: (r: SearchRow) => f.kind === 'date' ? (r[f.key] ? formatDate(r[f.key]) : '') : String(r[f.key] ?? ''),
    })), this.table.sorted());
  }
}
