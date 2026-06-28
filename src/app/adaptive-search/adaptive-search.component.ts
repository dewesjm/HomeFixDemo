import { Component, computed, signal, inject } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, switchMap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { SliderModule } from 'primeng/slider';
import { DatePickerModule } from 'primeng/datepicker';
import { RatingModule } from 'primeng/rating';
import { TagModule } from 'primeng/tag';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';

import { Job } from '../data/jobs';
import { JobsApiService, JobFilterParams } from '../services/jobs-api.service';
import {
  FILTER_SCHEMA, FilterField, FilterValues, FilterVariant,
  defaultValuesFor, getField, isEmpty,
  loadVariants, saveVariants
} from '../data/filter-schema';
import { WorkflowService } from '../services/workflow.service';
import { currentStepLabel } from '../data/workflow';

// Converts the component's FilterValues shape into query params the API understands.
// Ranges become two separate params; arrays become comma-separated strings.
function toApiParams(values: FilterValues): JobFilterParams {
  const p: JobFilterParams = {};

  if (values['title']) p.title = values['title'];

  const trade = values['trade'] as string[];
  if (trade?.length) p.trade = trade.join(',');

  const tech = values['technician'] as string[];
  if (tech?.length) p.technician = tech.join(',');

  const tags = values['tags'] as string[];
  if (tags?.length) p.tags = tags.join(',');

  const cost = values['estimatedCost'] as [number, number];
  if (cost?.[0] > 0)    p.costMin = String(cost[0]);
  if (cost?.[1] < 2000) p.costMax = String(cost[1]);

  const hours = values['estimatedHours'] as [number, number];
  if (hours?.[0] > 0)  p.hoursMin = String(hours[0]);
  if (hours?.[1] < 40) p.hoursMax = String(hours[1]);

  const score = values['inspectionScore'] as number;
  if (score > 0) p.minScore = String(score);

  const dates = values['scheduledFor'] as [Date | null, Date | null];
  if (dates?.[0]) p.scheduledFrom = (dates[0] as Date).toISOString();
  if (dates?.[1]) p.scheduledTo   = (dates[1] as Date).toISOString();

  return p;
}

const DEFAULT_KEYS = ['title', 'trade', 'estimatedCost'];

@Component({
  selector: 'app-adaptive-search',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, DialogModule, CheckboxModule, TooltipModule,
    InputTextModule, MultiSelectModule, SelectModule,
    SliderModule, DatePickerModule, RatingModule,
    TagModule, ChipModule
  ],
  templateUrl: './adaptive-search.component.html'
})
export class AdaptiveSearchComponent {
  private jobsApi = inject(JobsApiService);

  constructor(private router: Router, private wfService: WorkflowService) {}

  schema = FILTER_SCHEMA;
  groups = [...new Set(FILTER_SCHEMA.map(f => f.group))];

  exportColumns = [
    { field: 'jobNumber',       header: 'Job #' },
    { field: 'title',           header: 'Job' },
    { field: 'trade',           header: 'Trade' },
    { field: 'technician',      header: 'Technician' },
    { field: 'estimatedCost',   header: 'Est. cost' },
    { field: 'inspectionScore', header: 'Score' },
    { field: 'tags',            header: 'Tags' }
  ];

  exportCell = (cell: { data: any; field: string }): string => {
    switch (cell.field) {
      case 'estimatedCost': return Number(cell.data).toFixed(2);
      case 'tags':          return (cell.data as string[]).join('; ');
      default:              return cell.data == null ? '' : String(cell.data);
    }
  };

  currentStep(job: Job): string {
    return currentStepLabel(this.wfService.workflowFor(job)().stages);
  }

  openDetails(job: Job) {
    this.router.navigate(['/jobs', job.id]);
  }

  // --- Filter state ---
  visibleKeys = signal<string[]>([...DEFAULT_KEYS]);
  values      = signal<FilterValues>(defaultValuesFor(DEFAULT_KEYS));

  visibleFields = computed<FilterField[]>(() =>
    this.visibleKeys()
      .map(k => getField(k))
      .filter((f): f is FilterField => !!f)
  );

  // When values changes, wait 300ms then send to the API.
  // switchMap cancels any in-flight request before issuing the new one.
  private _result = toSignal(
    toObservable(this.values).pipe(
      debounceTime(300),
      switchMap(v => this.jobsApi.getJobs({ ...toApiParams(v), pageSize: '500' }))
    )
  );

  filtered  = computed(() => this._result()?.items ?? []);
  totalJobs = computed(() => this._result()?.total ?? 0);
  loading   = computed(() => this._result() === undefined);

  activeChips = computed(() => {
    const chips: { label: string; clear: () => void }[] = [];
    for (const f of this.visibleFields()) {
      const v = this.values()[f.key];
      if (isEmpty(f, v)) continue;
      chips.push({
        label: this.chipLabelFor(f, v),
        clear: () => this.clearOne(f.key)
      });
    }
    return chips;
  });

  // --- Adapt Filters dialog ---
  showAdapt   = signal(false);
  draftKeys   = signal<Set<string>>(new Set());
  adaptFilter = signal<string>('');

  groupedSchema = computed(() => {
    const q = this.adaptFilter().trim().toLowerCase();
    const out: { group: string; items: FilterField[] }[] = [];
    for (const g of this.groups) {
      const items = this.schema.filter(f =>
        f.group === g && (!q || f.label.toLowerCase().includes(q))
      );
      if (items.length) out.push({ group: g, items });
    }
    return out;
  });

  openAdapt() {
    this.draftKeys.set(new Set(this.visibleKeys()));
    this.adaptFilter.set('');
    this.showAdapt.set(true);
  }

  isDraftSelected(key: string): boolean { return this.draftKeys().has(key); }

  toggleDraft(key: string, checked: boolean) {
    const next = new Set(this.draftKeys());
    if (checked) next.add(key); else next.delete(key);
    this.draftKeys.set(next);
  }

  selectGroup(group: string, selected: boolean) {
    const next = new Set(this.draftKeys());
    for (const f of this.schema) {
      if (f.group !== group) continue;
      if (selected) next.add(f.key);
      else if (!f.required) next.delete(f.key);
    }
    this.draftKeys.set(next);
  }

  selectAll(selected: boolean) {
    const next = new Set<string>();
    for (const f of this.schema) {
      if (selected || f.required) next.add(f.key);
    }
    this.draftKeys.set(next);
  }

  applyAdapt() {
    const requiredKeys = this.schema.filter(f => f.required).map(f => f.key);
    const draft = this.draftKeys();
    const finalKeys = this.schema
      .map(f => f.key)
      .filter(k => draft.has(k) || requiredKeys.includes(k));

    const prev = this.values();
    const next = defaultValuesFor(finalKeys);
    for (const k of finalKeys) if (k in prev) next[k] = prev[k];

    this.visibleKeys.set(finalKeys);
    this.values.set(next);
    this.showAdapt.set(false);
  }

  // --- Variants (presets) ---
  variants    = signal<FilterVariant[]>(loadVariants());
  variantName = signal<string>('');

  applyVariant(v: FilterVariant) {
    const next = defaultValuesFor(v.visibleKeys);
    for (const k of v.visibleKeys) if (k in v.values) next[k] = v.values[k];
    this.visibleKeys.set([...v.visibleKeys]);
    this.values.set(next);
  }

  saveCurrentVariant() {
    const name = this.variantName().trim();
    if (!name) return;
    const next: FilterVariant = {
      name,
      visibleKeys: [...this.visibleKeys()],
      values: JSON.parse(JSON.stringify(this.values()))
    };
    const others = this.variants().filter(v => v.name !== name);
    const merged = [...others, next];
    this.variants.set(merged);
    saveVariants(merged);
    this.variantName.set('');
  }

  deleteVariant(name: string) {
    const merged = this.variants().filter(v => v.name !== name);
    this.variants.set(merged);
    saveVariants(merged);
  }

  // --- Field value helpers ---
  setValue(key: string, val: any) { this.values.set({ ...this.values(), [key]: val }); }
  valueOf(key: string): any       { return this.values()[key]; }

  clearOne(key: string) {
    const f = getField(key);
    if (!f) return;
    this.values.set({ ...this.values(), ...defaultValuesFor([key]) });
  }

  resetAll() { this.values.set(defaultValuesFor(this.visibleKeys())); }

  chipLabelFor(f: FilterField, v: any): string {
    switch (f.type) {
      case 'text':        return `${f.label}: "${v}"`;
      case 'multiselect':
      case 'tags':        return `${f.label}: ${(v as any[]).join(', ')}`;
      case 'select':      return `${f.label}: ${v}`;
      case 'range':       return `${f.label}: ${v[0]}–${v[1]}`;
      case 'rating':      return `${f.label}: ≥ ${v}`;
      case 'daterange': {
        const fmt = (d: Date) => d ? d.toLocaleDateString() : '…';
        return `${f.label}: ${fmt(v[0])} – ${fmt(v[1])}`;
      }
    }
  }

  asMulti(f: FilterField): Extract<FilterField, { type: 'multiselect' | 'tags' | 'select' }> { return f as any; }
  asRange(f: FilterField): Extract<FilterField, { type: 'range' }>                            { return f as any; }
}
