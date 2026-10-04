/* Look up a joint by XREFID and/or hull, drawing, joint, and see it at every stage of each kept load,
   with its error log entries. */
import { Component, computed, effect, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideSearch, LucideX } from '@lucide/angular';

import { ErrorLogEntry, LoadData } from '../../data/external-loads/loads';
import { LookupQuery, isBlankQuery, lookupRecords } from '../../data/external-loads/lookup';
import { USED_WIDTH } from '../../data/external-loads/layout';
import { AppDateTimePipe } from '../../shared/date-format';

const BLANK: LookupQuery = { xrefid: '', hull: '', drawing: '', joint: '' };

const OUTCOME_BADGE: Record<string, string> = { 'Included': 'badge-success', 'Excluded': 'badge-warning', 'Not converted': 'badge-error' };
const ACTION_BADGE: Record<string, string> = {
  'Added': 'badge-success', 'Updated': 'badge-info', 'Unchanged': 'badge-ghost', 'Removed': 'badge-error', 'Kept': 'badge-warning',
};

@Component({
  selector: 'app-record-lookup',
  standalone: true,
  imports: [FormsModule, AppDateTimePipe, LucideSearch, LucideX],
  template: `
    <form class="facet-row items-end" (ngSubmit)="search()">
      @for (f of fields; track f.key) {
        <label class="field-col" style="min-width: 8rem">
          <span class="field-label">{{ f.label }}</span>
          <input class="input input-sm input-bordered" [name]="f.key" [(ngModel)]="draft[f.key]" />
        </label>
      }
      <button type="submit" class="btn btn-sm btn-primary"><svg lucideSearch class="size-4"></svg> Look Up</button>
      <button type="button" class="btn btn-sm btn-outline" (click)="clear()"><svg lucideX class="size-4"></svg> Clear</button>
      <span>Use XREFID, or any of Hull, Drawing and Joint. Every field you fill in must match.</span>
    </form>

    @if (!isBlankQuery(query())) {
      @for (r of results(); track r.key) {
        <div class="panel">
          <div class="panel-title">
            <span class="mono">{{ r.xrefid }}</span> {{ r.hull }} · <span class="mono">{{ r.drawing }}</span> · {{ r.joint }}
          </div>
          <div style="overflow-x: auto">
            <table class="table table-sm">
              <thead>
                <tr><th>Load</th><th class="min-w-64">Raw Line</th><th>Converted</th><th>Processed</th><th>Weld Joints</th></tr>
              </thead>
              <tbody>
                @for (t of r.traces; track t.load.run.id) {
                  <tr>
                    <td class="whitespace-nowrap">{{ t.load.run.id }} ({{ t.load.run.status }})</td>
                    <td>
                      @if (t.raw) {
                        <div>Line {{ t.raw.lineNo }}</div>
                        <div class="mono whitespace-pre" style="max-width: 28rem; overflow-x: auto">{{ t.raw.text.slice(0, usedWidth) }}</div>
                      } @else { Not in this file }
                    </td>
                    <td>
                      @if (t.converted) {
                        @if (t.converted.errors.length) {
                          @for (e of t.converted.errors; track $index) { <div class="text-error">{{ e.message }}</div> }
                        } @else { Converted }
                      }
                    </td>
                    <td>
                      @if (t.processed; as p) {
                        <span class="badge badge-sm whitespace-nowrap" [class]="outcomeBadge[p.outcome]">{{ p.outcome }}</span>
                        @if (p.reason) { <div class="font-semibold">{{ p.reason }}</div><div>{{ p.detail }}</div> }
                      }
                    </td>
                    <td>
                      @if (t.weldJoint; as j) {
                        <span class="badge badge-sm" [class]="actionBadge[j.action]">{{ j.action }}</span>
                        <div>{{ j.detail }}</div>
                        @if (j.hasWeldRecordData) { <div>Has weld record data</div> }
                      } @else { Not in Weld Joints }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (r.errors.length) {
            <div class="font-semibold mt-3">Error Log</div>
            <ul class="list-disc pl-5">
              @for (e of r.errors; track $index) {
                <li>{{ e.at | appDateTime }}, load {{ e.loadId }}, {{ e.stage }}: {{ e.type }}. {{ e.message }}</li>
              }
            </ul>
          }
        </div>
      } @empty {
        <div class="empty">No joint in the kept loads matches.</div>
      }
    }
  `,
})
export class RecordLookupComponent {
  loads = input.required<LoadData[]>();
  errors = input.required<ErrorLogEntry[]>();
  /* set from a table row's look-up button */
  initialQuery = input<LookupQuery | null>(null);

  readonly fields: { key: keyof LookupQuery; label: string }[] = [
    { key: 'xrefid', label: 'XREFID' }, { key: 'hull', label: 'Hull' }, { key: 'drawing', label: 'Drawing' }, { key: 'joint', label: 'Joint' },
  ];
  readonly usedWidth = USED_WIDTH;
  readonly outcomeBadge = OUTCOME_BADGE;
  readonly actionBadge = ACTION_BADGE;
  readonly isBlankQuery = isBlankQuery;

  draft: LookupQuery = { ...BLANK };
  query = signal<LookupQuery>({ ...BLANK });
  results = computed(() => lookupRecords(this.query(), this.loads(), this.errors()));

  constructor() {
    effect(() => {
      const q = this.initialQuery();
      if (q) {
        this.draft = { ...q };
        this.query.set({ ...q });
      }
    });
  }

  search() { this.query.set({ ...this.draft }); }

  clear() {
    this.draft = { ...BLANK };
    this.query.set({ ...BLANK });
  }
}
