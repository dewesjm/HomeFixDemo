/* Client-side sort/paginate/filter helper shared by every table screen — replaces
   PrimeNG p-table's built-in state + FilterService. Each screen owns one instance,
   feeds it rows via setRows(), and reads paged()/total()/etc in its template. */
import { computed, signal } from '@angular/core';

export type SortOrder = 1 | -1;
export type FilterPredicate<T> = (rowValue: any, filterValue: any, row: T) => boolean;

export class TableState<T> {
  private allRows = signal<T[]>([]);
  page = signal(0);
  pageSize = signal(10);
  sortField = signal<string | null>(null);
  sortOrder = signal<SortOrder>(1);
  globalFilter = signal('');
  columnFilters = signal<Record<string, any>>({});

  constructor(
    private globalFilterFields: (keyof T & string)[] = [],
    private filterPredicates: Record<string, FilterPredicate<T>> = {}
  ) {}

  setRows(rows: T[]) {
    this.allRows.set(rows);
    if (this.page() > 0 && this.page() * this.pageSize() >= rows.length) this.page.set(0);
  }

  toggleSort(field: string) {
    if (this.sortField() === field) this.sortOrder.update(o => (o === 1 ? -1 : 1));
    else {
      this.sortField.set(field);
      this.sortOrder.set(1);
    }
  }

  setColumnFilter(field: string, value: any) {
    this.columnFilters.update(f => ({ ...f, [field]: value }));
    this.page.set(0);
  }

  setGlobalFilter(value: string) {
    this.globalFilter.set(value);
    this.page.set(0);
  }

  clearFilters() {
    this.columnFilters.set({});
    this.globalFilter.set('');
    this.page.set(0);
  }

  private matchesGlobal = (row: T): boolean => {
    const q = this.globalFilter().trim().toLowerCase();
    if (!q) return true;
    return this.globalFilterFields.some(f => {
      const v = (row as any)[f];
      if (Array.isArray(v)) return v.join(' ').toLowerCase().includes(q);
      return String(v ?? '').toLowerCase().includes(q);
    });
  };

  private matchesColumnFilters = (row: T): boolean => {
    const filters = this.columnFilters();
    return Object.entries(filters).every(([field, val]) => {
      if (val == null || val === '' || (Array.isArray(val) && val.length === 0)) return true;
      const predicate = this.filterPredicates[field];
      const rowValue = (row as any)[field];
      if (predicate) return predicate(rowValue, val, row);
      return String(rowValue ?? '').toLowerCase().includes(String(val).toLowerCase());
    });
  };

  filtered = computed(() => this.allRows().filter(r => this.matchesGlobal(r) && this.matchesColumnFilters(r)));

  sorted = computed(() => {
    const field = this.sortField();
    const rows = this.filtered();
    if (!field) return rows;
    const order = this.sortOrder();
    return [...rows].sort((a, b) => {
      const av = (a as any)[field];
      const bv = (b as any)[field];
      if (av == null && bv == null) return 0;
      if (av == null) return -1 * order;
      if (bv == null) return 1 * order;
      if (av < bv) return -1 * order;
      if (av > bv) return 1 * order;
      return 0;
    });
  });

  total = computed(() => this.sorted().length);
  pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  paged = computed(() => {
    const size = this.pageSize();
    const start = this.page() * size;
    return this.sorted().slice(start, start + size);
  });
  rangeStart = computed(() => (this.total() === 0 ? 0 : this.page() * this.pageSize() + 1));
  rangeEnd = computed(() => Math.min(this.total(), (this.page() + 1) * this.pageSize()));

  goToPage(p: number) {
    if (p >= 0 && p < this.pageCount()) this.page.set(p);
  }
  setPageSize(n: number) {
    this.pageSize.set(n);
    this.page.set(0);
  }
}

// --- reusable column filter predicates ---
export const inArray: FilterPredicate<any> = (rowValue, filterValue: any[]) => filterValue.includes(rowValue);

export const arrayAny: FilterPredicate<any> = (rowValue: string[] | undefined, filterValue: string[]) => {
  if (!rowValue || rowValue.length === 0) return false;
  return filterValue.some(f => rowValue.includes(f));
};

export const numberBetween: FilterPredicate<any> = (rowValue: number, [min, max]: [number | null, number | null]) => {
  if (min != null && rowValue < min) return false;
  if (max != null && rowValue > max) return false;
  return true;
};

export const dateBetween: FilterPredicate<any> = (rowValue: string, [from, to]: [Date | null, Date | null]) => {
  const t = new Date(rowValue).getTime();
  if (from && t < from.getTime()) return false;
  if (to && t > to.getTime() + 86_400_000 - 1) return false; // inclusive of the "to" day
  return true;
};
