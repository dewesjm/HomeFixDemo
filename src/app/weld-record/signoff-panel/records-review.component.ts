/* The O63 / O04 Records Review step: verify the joint's record fields, with the joint's Signoff History alongside */
import { Component, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideChevronRight, LucideChevronDown } from '@lucide/angular';
import { WorkflowStage } from '../../data/workflow';
import { AppDateTimePipe } from '../../shared/date-format';
import { SignoffContext } from './signoff-context';

@Component({
  selector: 'app-records-review',
  standalone: true,
  imports: [AppDateTimePipe, FormsModule, LucideChevronRight, LucideChevronDown],
  host: { class: 'block' },
  templateUrl: './records-review.component.html'
})
export class RecordsReviewComponent {
  ctx = input.required<SignoffContext>();
  stage = input.required<WorkflowStage>();

  /* Signoff History rows: collapsed by default, same expand-per-row and Expand/Collapse all pattern
     as the History screen, indexed by position in signoffRecords */
  expandedRecords = signal<ReadonlySet<number>>(new Set());
  toggleRecord(i: number) {
    this.expandedRecords.update(s => {
      const next = new Set(s);
      if (!next.delete(i)) next.add(i);
      return next;
    });
  }
  allRecordsExpanded(records: { fields: unknown[] }[]): boolean {
    const keys = records.map((r, i) => r.fields.length ? i : -1).filter(i => i >= 0);
    return keys.length > 0 && keys.every(i => this.expandedRecords().has(i));
  }
  toggleAllRecords(records: { fields: unknown[] }[]) {
    const keys = records.map((r, i) => r.fields.length ? i : -1).filter(i => i >= 0);
    this.expandedRecords.set(this.allRecordsExpanded(records) ? new Set() : new Set(keys));
  }
}
