/* Advanced Search: Pipe Welding's table (role, keyword search, column filters, Release to Welding,
   History) plus Adapt filters with stacked conditions, a column picker and saved variants that keep
   filters and columns together. Every Job, Fabrication and step field can be a filter or a column. */
import { Component, ElementRef, computed, effect, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideSave, LucideX, LucideTrash2, LucideSlidersHorizontal, LucideListFilter, LucideSearch, LucidePlus,
  LucideFileSpreadsheet, LucideArrowUpRight, LucideCheck, LucideColumns3, LucideHistory, LucideStar
} from '@lucide/angular';

import { TableState, inArray, FilterPredicate } from '../../shared/table-state';
import { TablePagerComponent } from '../../shared/table-pager.component';
import { SortHeaderComponent } from '../../shared/sort-header.component';
import { MultiselectDropdownComponent } from '../../shared/multiselect-dropdown.component';
import { DateRangeComponent } from '../../shared/date-range.component';
import { TooltipDirective } from '../../shared/tooltip.directive';
import { OrderedPickListComponent } from '../../shared/ordered-pick-list.component';
import { BannerPillComponent } from '../../shared/banner-pill.component';
import { SyncStatusComponent } from '../sync-status/sync-status.component';
import { downloadCsv } from '../../data/export-csv';
import { bannerFor } from '../../data/banner';

import { JOBS } from '../../data/jobs';
import {
  SearchField, SearchRow, Condition, FilterValues, FilterVariant, SearchLayout, Op,
  OPS_BY_KIND, STANDARD_VARIANT, opLabel, isExclude, needsNoValue, newCondition, activeConditions,
  searchFields, buildRow, isExtraKey, applyFilters, chipLabel, standardLayout,
  loadVariants, saveVariants, loadSearchState, loadTabSearchState, saveSearchState,
  loadDefaultVariant, saveDefaultVariant
} from '../../data/filter-schema';
import { allStepAnswerFields } from '../../data/step-conditions';
import { WorkflowStore } from '../services/workflow-store.service';
import { SignoffService } from '../services/signoff.service';
import { activeStage, ROLES, type Role } from '../../data/workflow';
import { AppDatePipe, formatDate } from '../../shared/date-format';

const PAGE_SIZES = [10, 25, 50, 100];

@Component({
  selector: 'app-adaptive-search',
  standalone: true,
  imports: [AppDatePipe, OrderedPickListComponent, BannerPillComponent, SyncStatusComponent,
    CommonModule, FormsModule,
    TablePagerComponent, SortHeaderComponent, MultiselectDropdownComponent, DateRangeComponent,
    TooltipDirective,
    LucideSave, LucideX, LucideTrash2, LucideSlidersHorizontal, LucideListFilter, LucideSearch, LucidePlus,
    LucideFileSpreadsheet, LucideArrowUpRight, LucideCheck, LucideColumns3, LucideHistory, LucideStar
  ],
  templateUrl: './adaptive-search.component.html'
})
export class AdaptiveSearchComponent {
  private adaptDlg = viewChild<ElementRef<HTMLDialogElement>>('adaptDlg');

  readonly STANDARD = STANDARD_VARIANT;
  banner = signal(bannerFor('advanced-search'));
  roleOptions = ROLES.map(r => ({ label: r === 'View' ? 'View All' : r, value: r }));

  fields = searchFields();
  private fieldMap = new Map(this.fields.map(f => [f.key, f]));
  private stepFields = new Map(allStepAnswerFields('Welding').map(f => [f.key, f]));
  field = (key: string) => this.fieldMap.get(key);

  /* column header filters: list columns get a multiselect, so they need the in-list predicate */
  table = new TableState<SearchRow>(
    ['xrefid', 'hull', 'drawing', 'joint', 'order', 'sequenceNumber'],
    Object.fromEntries(this.fields.filter(f => f.kind === 'list').map(f => [f.key, inArray as FilterPredicate<SearchRow>]))
  );

  selectedRole = signal<Role>('View');
  filterKeys = signal<string[]>([]);
  values = signal<FilterValues>({});
  columnKeys = signal<string[]>([]);
  /* name of the variant chosen in the droplist; Standard = the built-in Pipe Welding look */
  selectedVariant = signal<string>(STANDARD_VARIANT);

  constructor(private router: Router, private store: WorkflowStore, private signoffService: SignoffService) {
    /* this tab's state (refresh, back from a joint), else the default variant on a new visit,
       else where the last visit left off */
    const def = this.defaultVariant();
    const saved = loadTabSearchState() ?? (def ? null : loadSearchState());
    if (!saved && def) this.pickVariant(def);
    else this.applyLayout(saved ?? standardLayout());
    if (saved) {
      this.selectedVariant.set(saved.variant || STANDARD_VARIANT);
      this.table.pageSize.set(PAGE_SIZES.includes(saved.pageSize) ? saved.pageSize : 10);
      this.table.page.set(saved.page ?? 0);
    }

    effect(() => this.table.setRows(this.filtered()));
    effect(() => saveSearchState({
      ...this.currentLayout(),
      variant: this.selectedVariant(),
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
    if (role === 'View') return this.allRows();
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
      role: this.selectedRole(),
    };
  }

  private applyLayout(l: SearchLayout) {
    const known = (keys: string[]) => keys.filter(k => this.fieldMap.has(k));
    this.filterKeys.set(known(l.filterKeys));
    this.values.set(JSON.parse(JSON.stringify(l.values ?? {})));
    this.columnKeys.set(known(l.columnKeys));
    this.table.columnFilters.set({ ...(l.columnFilters ?? {}) });
    this.table.globalFilter.set(l.globalFilter ?? '');
    this.table.sortField.set(l.sortField ?? null);
    this.table.sortOrder.set(l.sortOrder ?? 1);
    this.selectedRole.set((ROLES as readonly string[]).includes(l.role) ? l.role as Role : 'View');
    this.table.page.set(0);
    this.selectedIds.set(new Set());
  }

  // --- Variants ---
  variants = signal<FilterVariant[]>(loadVariants());
  variantName = signal<string>('');
  savingVariant = signal(false);

  pickVariant(name: string) {
    this.selectedVariant.set(name);
    if (name === STANDARD_VARIANT) { this.applyLayout(standardLayout()); return; }
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

  defaultTip = computed(() => {
    const name = this.selectedVariant();
    if (!this.isDefault(name)) return 'Make this your default: the page opens on it (only for you)';
    return name === STANDARD_VARIANT ? 'Your default: the page opens on this variant'
      : 'Your default: the page opens on this variant. Click to go back to Standard.';
  });

  private setDefault(name: string) {
    const next = name === STANDARD_VARIANT ? '' : name;
    this.defaultVariant.set(next);
    saveDefaultVariant(next);
  }

  deleteVariant(name: string) {
    const merged = this.variants().filter(v => v.name !== name);
    this.variants.set(merged);
    saveVariants(merged);
    if (this.defaultVariant() === name) this.setDefault(STANDARD_VARIANT);
    if (this.selectedVariant() === name) this.selectedVariant.set(STANDARD_VARIANT);
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

  // --- Dragging column headings to reorder ---
  /* only armed when the press starts outside the heading's filter box, so typing/selecting there still works */
  armedCol = signal<string | null>(null);
  dragCol = signal<string | null>(null);
  dropAt = signal<{ key: string; before: boolean } | null>(null);

  armColDrag(e: MouseEvent, key: string) {
    const t = e.target as HTMLElement;
    this.armedCol.set(t.closest('input, select, button, label, app-multiselect-dropdown') ? null : key);
  }

  onColDragStart(e: DragEvent, key: string) {
    this.dragCol.set(key);
    e.dataTransfer?.setData('text/plain', key);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  onColDragOver(e: DragEvent, key: string) {
    const from = this.dragCol();
    if (!from) return;
    e.preventDefault();
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.dropAt.set(key === from ? null : { key, before: e.clientX < box.left + box.width / 2 });
  }

  onColDrop(e: DragEvent) {
    e.preventDefault();
    const from = this.dragCol(), at = this.dropAt();
    if (from && at) {
      const keys = this.columnKeys().filter(k => k !== from);
      const i = keys.indexOf(at.key);
      keys.splice(at.before ? i : i + 1, 0, from);
      this.columnKeys.set(keys);
    }
    this.endColDrag();
  }

  endColDrag() {
    this.dragCol.set(null);
    this.dropAt.set(null);
    this.armedCol.set(null);
  }

  // --- Stacked conditions ---

  /* what the bar shows for a field: its conditions, or one empty one to type into */
  conditionsOf(f: SearchField): Condition[] {
    const c = this.values()[f.key];
    return c?.length ? c : [newCondition(f.kind)];
  }

  private setConditions(key: string, conds: Condition[]) {
    this.values.update(v => ({ ...v, [key]: conds }));
    this.table.page.set(0);
  }

  updateCondition(f: SearchField, i: number, patch: Partial<Condition>) {
    const conds = this.conditionsOf(f).map((c, n) => (n === i ? { ...c, ...patch } : c));
    this.setConditions(f.key, conds);
  }

  setOp(f: SearchField, i: number, op: Op) {
    /* list fields keep their picks between is / is not, and typed text between the text operators */
    this.updateCondition(f, i, { op, ...(op === 'between' ? {} : { to: '' }) });
  }

  addCondition(f: SearchField) {
    this.setConditions(f.key, [...this.conditionsOf(f), newCondition(f.kind)]);
  }

  removeCondition(f: SearchField, i: number) {
    const conds = this.conditionsOf(f).filter((_, n) => n !== i);
    this.setConditions(f.key, conds);
  }

  /* the word shown in front of a stacked condition: includes are OR'd, excludes must all hold */
  joinWord(c: Condition): string { return isExclude(c.op) ? 'and' : 'or'; }

  numStr(v: number | null): string { return v == null ? '' : String(v); }

  clearField(key: string) { this.setConditions(key, []); }

  opsFor(f: SearchField) { return OPS_BY_KIND[f.kind].map(op => ({ op, label: opLabel(op, f.kind) })); }
  needsNoValue = needsNoValue;

  /* between on a date field: app-date-range works in Dates, the condition stores yyyy-mm-dd */
  asDate(s: string): Date | null { return s ? new Date(s + 'T00:00:00') : null; }
  setDateBetween(f: SearchField, i: number, [from, to]: [Date | null, Date | null]) {
    const iso = (d: Date | null) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
    this.updateCondition(f, i, { value: iso(from), to: iso(to) });
  }

  clear() {
    this.values.set({});
    this.table.clearFilters();
    this.selectedRole.set('View');
  }

  onRoleChange(role: Role) {
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

  openDetails(row: SearchRow) { this.router.navigate(['/jobs', row.id]); }
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
    downloadCsv('advanced-search', this.visibleColumns().map(f => ({
      header: f.label,
      value: (r: SearchRow) => f.kind === 'date' ? (r[f.key] ? formatDate(r[f.key]) : '') : String(r[f.key] ?? ''),
    })), this.table.sorted());
  }
}
