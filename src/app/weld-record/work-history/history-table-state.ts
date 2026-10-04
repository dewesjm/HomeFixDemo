/* What a History table's parent owns: the rows, search, sort, filters and paging (TableState),
   plus which rows are expanded, so the parent's Expand all button and the table share it */
import { computed, signal } from '@angular/core';
import { TableState, inArray } from '../../shared/table-state';
import { formatDateTime } from '../../shared/date-format';
import { HistoryRow } from '../../data/workflow';

export class HistoryTableState extends TableState<HistoryRow> {
  constructor() {
    super(
      ['jobId', 'hull', 'drawing', 'joint', 'order', 'who', 'whoTitle', 'action', 'from', 'to', 'routing', 'inputsText'],
      {
        /* match the formatted date shown in the column, not the raw ISO timestamp */
        when: (rowValue: string, val: string) =>
          formatDateTime(rowValue).toLowerCase().includes(String(val).toLowerCase()),
        routing: inArray,
      }
    );
  }

  expanded = signal<ReadonlySet<string>>(new Set());
  /* nested "Fabrication at this sign-off" toggle, independent of the row's own expand state */
  fabExpanded = signal<ReadonlySet<string>>(new Set());

  /* every entry matching the current filters that has fields to show, across all pages */
  expandableKeys = computed(() => this.sorted().filter(r => r.inputs?.length).map(r => r.key));
  allExpanded = computed(() => {
    const keys = this.expandableKeys();
    return keys.length > 0 && keys.every(k => this.expanded().has(k));
  });

  toggleAll() {
    this.expanded.set(this.allExpanded() ? new Set() : new Set(this.expandableKeys()));
  }

  toggle(key: string) {
    this.expanded.update(s => toggled(s, key));
  }

  toggleFab(key: string) {
    this.fabExpanded.update(s => toggled(s, key));
  }
}

function toggled(s: ReadonlySet<string>, key: string): ReadonlySet<string> {
  const next = new Set(s);
  if (!next.delete(key)) next.add(key);
  return next;
}
