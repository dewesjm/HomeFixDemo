/* The planned load process as a row of stages. Each stage shows its counts for the selected load
   and opens that stage's table when clicked. */
import { Component, computed, input, output } from '@angular/core';
import { LucideArrowRight, LucideTriangleAlert, LucideSearch } from '@lucide/angular';

import { LoadData } from '../../data/external-loads/loads';
import { LINE_WIDTH } from '../../data/external-loads/layout';
import { MAX_CONVERSION_ERROR_RATE } from '../../data/external-loads/file-checks';

export type LoadView = 'runs' | 'raw' | 'converted' | 'processed' | 'weldJoints' | 'errors' | 'lookup';

interface MapStage {
  view: LoadView;
  title: string;
  lines: string[];
}

const count = <T>(rows: T[], test: (r: T) => boolean) => rows.filter(test).length;

@Component({
  selector: 'app-process-map',
  standalone: true,
  imports: [LucideArrowRight, LucideTriangleAlert, LucideSearch],
  styles: [`
    .map { display: flex; flex-wrap: wrap; align-items: stretch; gap: 0.5rem; }
    .stage-wrap { display: flex; align-items: center; gap: 0.5rem; flex: 1 1 11rem; }
    .stage {
      flex: 1; height: 100%; text-align: left; padding: 0.75rem; cursor: pointer;
      background: var(--app-surface); border: 1px solid var(--app-border); border-radius: 8px;
    }
    .stage:hover { border-color: var(--color-primary); }
    .stage.active { border-color: var(--color-primary); box-shadow: 0 0 0 1px var(--color-primary); }
    .stage-title { font-weight: 600; margin-bottom: 0.25rem; }
    .notes { margin: 0.75rem 0 0; padding-left: 1.25rem; list-style: disc; line-height: 1.6; }
  `],
  template: `
    <div class="panel">
      <div class="panel-title">Process Map</div>
      <div class="map">
        @for (s of stages(); track s.view; let last = $last) {
          <div class="stage-wrap">
            <button type="button" class="stage" [class.active]="view() === s.view" (click)="viewChange.emit(s.view)">
              <div class="stage-title">{{ s.title }}</div>
              @for (line of s.lines; track line) { <div>{{ line }}</div> }
            </button>
            @if (!last) { <svg lucideArrowRight class="size-5 shrink-0"></svg> }
          </div>
        }
      </div>

      <div class="row mt-3">
        <button type="button" class="btn btn-sm" [class.btn-active]="view() === 'errors'" (click)="viewChange.emit('errors')">
          <svg lucideTriangleAlert class="size-4"></svg> Error Log ({{ errorCount() }})
        </button>
        <button type="button" class="btn btn-sm" [class.btn-active]="view() === 'lookup'" (click)="viewChange.emit('lookup')">
          <svg lucideSearch class="size-4"></svg> Look Up a Joint
        </button>
      </div>

      <ul class="notes">
        <li>Raw, Converted and Processed are rebuilt from the full file on every load, then swapped in all at once. The latest and previous loads are kept.</li>
        <li>If a file check fails, the load doesn't go live: the previous data stays, and the page shows when that data is from.</li>
        <li>Weld Joints is one table for every joint. The merge changes only the joints that came from this file, in one step, and never removes a joint that has weld record data.</li>
      </ul>
    </div>
  `,
})
export class ProcessMapComponent {
  load = input.required<LoadData>();
  view = input.required<LoadView>();
  errorCount = input(0);
  viewChange = output<LoadView>();

  stages = computed<MapStage[]>(() => {
    const l = this.load();
    const p = l.processed;
    const j = l.weldJoints;
    return [
      { view: 'runs', title: 'Vendor File', lines: [
        'Full file, every 15 minutes',
        `Load ${l.run.id}: ${l.run.linesReceived} lines`,
        `Checks: complete file, conversion errors under ${MAX_CONVERSION_ERROR_RATE * 100}%`,
      ] },
      { view: 'raw', title: 'Raw', lines: [
        `${l.raw.length} lines, stored as received`,
        `${LINE_WIDTH} characters per line`,
      ] },
      { view: 'converted', title: 'Converted', lines: [
        'Cut into fields by the file layout',
        `${count(l.converted, r => r.errors.length > 0)} lines with conversion errors`,
      ] },
      { view: 'processed', title: 'Processed', lines: [
        `${count(p, r => r.outcome === 'Included')} included`,
        `${count(p, r => r.reason === 'Vendor Joint')} Vendor Joint`,
        `${count(p, r => r.reason === 'Excluded by status')} Excluded by status`,
        `${count(p, r => r.outcome === 'Not converted')} not converted`,
      ] },
      { view: 'weldJoints', title: 'Weld Joints', lines: [
        `${count(j, r => r.action === 'Added')} added, ${count(j, r => r.action === 'Updated')} updated`,
        `${count(j, r => r.action === 'Removed')} removed, ${count(j, r => r.action === 'Kept')} kept`,
        `${count(j, r => r.action === 'Unchanged')} unchanged`,
      ] },
    ];
  });
}
