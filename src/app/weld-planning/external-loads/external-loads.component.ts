/* Weld Planning > External Loads: sample data showing how the vendor file load is planned to work.
   The process map picks which stage's table shows below it. Nothing here runs a real load. */
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EXTERNAL_LOADS } from '../../data/external-loads/loads';
import { LookupQuery, isBlankQuery } from '../../data/external-loads/lookup';
import { FlatRow, convertedRows, errorRows, processedRows, runRows, weldJointRows } from '../../data/external-loads/table-rows';
import { AppDateTimePipe } from '../../shared/date-format';
import { ProcessMapComponent, LoadView } from './process-map.component';
import { StageTableComponent } from './stage-table.component';
import { RawLinesComponent } from './raw-lines.component';
import { RecordLookupComponent } from './record-lookup.component';
import { CONVERTED_COLUMNS, ERROR_COLUMNS, PROCESSED_COLUMNS, RUN_COLUMNS, WELD_JOINT_COLUMNS } from './external-loads-columns';

const VIEW_INTROS: Record<LoadView, string> = {
  runs: 'Every load of the vendor file. Only the live and previous loads keep their Raw, Converted and Processed tables.',
  raw: 'Each line of the file exactly as it was received.',
  converted: 'Each line cut into fields by the file layout, with dates and numbers converted. A value that won\'t convert is flagged here, not dropped.',
  processed: 'Every converted line with what the rules decided. Lines that didn\'t make it show why.',
  weldJoints: 'The joints from this file in the weld joint table after this load\'s merge. Joints from other sources share the table and aren\'t changed by this load.',
  errors: 'Problems found by the live and previous loads, and loads that failed a file check.',
  lookup: 'Follow one joint through every stage of the live and previous loads.',
};

@Component({
  selector: 'app-external-loads',
  standalone: true,
  imports: [FormsModule, AppDateTimePipe, ProcessMapComponent, StageTableComponent, RawLinesComponent, RecordLookupComponent],
  template: `
    <div class="page-header flex-wrap items-center gap-3">
      <h2 class="section-title">External Loads</h2>
      <span class="spacer"></span>
      <label class="row">
        <span class="field-label">Showing load</span>
        <select class="select select-sm" [ngModel]="loadId()" (ngModelChange)="loadId.set(+$event)">
          @for (l of kept; track l.run.id) { <option [value]="l.run.id">{{ l.run.id }} ({{ l.run.status }})</option> }
        </select>
      </label>
      <span>Data as of <span class="font-semibold">{{ load().run.finishedAt | appDateTime }}</span></span>
    </div>
    <p class="section-sub">Sample data showing how the vendor file load is planned to work. Nothing on this page runs a real load.</p>

    <app-process-map [load]="load()" [view]="view()" [errorCount]="data.errors.length" (viewChange)="view.set($event)" />

    <p class="section-sub mt-4">{{ intros[view()] }}</p>
    @switch (view()) {
      @case ('runs') {
        <app-stage-table [rows]="runs" [columns]="runColumns" searchPlaceholder="Search loads…" csvName="load-runs" />
      }
      @case ('raw') { <app-raw-lines [lines]="load().raw" /> }
      @case ('converted') {
        <app-stage-table [rows]="converted()" [columns]="convertedColumns" searchPlaceholder="Search converted lines…"
                         [csvName]="'converted-' + loadId()" [lookup]="true" (lookupRow)="lookUp($event)" />
      }
      @case ('processed') {
        <app-stage-table [rows]="processed()" [columns]="processedColumns" searchPlaceholder="Search processed lines…"
                         [csvName]="'processed-' + loadId()" [lookup]="true" (lookupRow)="lookUp($event)" />
      }
      @case ('weldJoints') {
        <app-stage-table [rows]="weldJoints()" [columns]="weldJointColumns" searchPlaceholder="Search weld joints…"
                         [csvName]="'weld-joints-' + loadId()" [lookup]="true" (lookupRow)="lookUp($event)" />
      }
      @case ('errors') {
        <app-stage-table [rows]="errors" [columns]="errorColumns" searchPlaceholder="Search the error log…"
                         csvName="error-log" [lookup]="true" (lookupRow)="lookUp($event)" />
      }
      @case ('lookup') {
        <app-record-lookup [loads]="kept" [errors]="data.errors" [initialQuery]="lookupQuery()" />
      }
    }
  `,
})
export class ExternalLoadsComponent {
  readonly data = EXTERNAL_LOADS;
  readonly kept = [EXTERNAL_LOADS.live, EXTERNAL_LOADS.previous];
  readonly intros = VIEW_INTROS;
  readonly runColumns = RUN_COLUMNS;
  readonly convertedColumns = CONVERTED_COLUMNS;
  readonly processedColumns = PROCESSED_COLUMNS;
  readonly weldJointColumns = WELD_JOINT_COLUMNS;
  readonly errorColumns = ERROR_COLUMNS;
  readonly runs = runRows(EXTERNAL_LOADS.runs);
  readonly errors = errorRows(EXTERNAL_LOADS.errors);

  view = signal<LoadView>('runs');
  loadId = signal(EXTERNAL_LOADS.live.run.id);
  lookupQuery = signal<LookupQuery | null>(null);

  load = computed(() => this.kept.find(l => l.run.id === this.loadId()) ?? this.kept[0]);
  converted = computed(() => convertedRows(this.load()));
  processed = computed(() => processedRows(this.load()));
  weldJoints = computed(() => weldJointRows(this.load()));

  lookUp(row: FlatRow) {
    const v = (k: string) => String(row[k] ?? '');
    /* hull + drawing + joint identifies the joint even when XREFID is blank */
    const query = { xrefid: '', hull: v('hull'), drawing: v('drawing'), joint: v('joint') };
    if (isBlankQuery(query)) return;
    this.lookupQuery.set(query);
    this.view.set('lookup');
  }
}
