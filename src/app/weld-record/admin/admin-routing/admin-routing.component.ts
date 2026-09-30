// Admin → Routing: manage per-trade workflow routing with sequence ordering,
// field configuration (readings + sign-off), reject routing + reject rules, and step conditions (Included when).
// Persists to localStorage via workflow.ts CRUD functions.
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucidePencil, LucideCheck, LucideX,
  LucideTrash2, LucideArrowUp, LucideArrowDown, LucideSettings, LucideFilter, LucidePlus, LucideGitBranch, LucideGripVertical
} from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { TooltipDirective } from '../../../shared/tooltip.directive';
import { TableState } from '../../../shared/table-state';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../data/export-csv';
import { Job } from '../../../data/jobs';
import {
  StageField, SignoffField, defaultSignoffFields,
  addStageTemplate, updateStageTemplate, deleteStageTemplate, reorderStageTemplates,
  allStageIds, getTemplates, getTradeOptions, ROLES, type Role
} from '../../../data/workflow';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import {
  ConditionClause, ConditionRule, RejectRule, StepConditionField, STEP_CONDITION_FIELDS, DEFAULT_STEP_CONDITIONS,
  conditionField, describeConditions, stageConditionFields
} from '../../../data/step-conditions';

interface RoutingRow {
  id: string;
  routing: string;
  trade: Job['trade'];
  sequence: number;
  rejectToStage: string;
  role: Role;
  includedWhen: string;   /* describeConditions() of the step's rules */
  rejectRules: string[];  /* one line per reject rule, "<conditions> -> <target>" */
  fabricationEditable: boolean;
}

/* lightweight row model for field config */
interface FieldRow {
  uid: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'radio';
  required: boolean;
  placeholder: string;
  unit: string;
  optionsText: string;   // "Label:value, Label:value"
}

function toFieldRow(f: StageField | SignoffField, idx: number): FieldRow {
  return {
    uid: `${idx}`,
    key: f.key,
    label: f.label,
    type: f.type,
    required: 'required' in f ? (f.required ?? false) : false,
    placeholder: f.placeholder ?? ('placeholder' in f ? f.placeholder ?? '' : ''),
    unit: 'unit' in f ? (f as any).unit ?? '' : '',
    optionsText: f.options?.map(o => `${o.label}:${o.value}`).join(', ') ?? '',
  };
}

function fieldRowToStageField(r: FieldRow): StageField {
  return {
    key: r.key, label: r.label, type: r.type, placeholder: r.placeholder || undefined,
    unit: r.unit || undefined,
    options: r.type === 'select' ? parseOptions(r.optionsText) : undefined,
  };
}

function fieldRowToSignoffField(r: FieldRow): SignoffField {
  return {
    key: r.key, label: r.label, type: r.type, required: r.required,
    placeholder: r.placeholder || undefined,
    options: r.type === 'select' ? parseOptions(r.optionsText) : undefined,
  };
}

function parseOptions(text: string): { label: string; value: string }[] | undefined {
  if (!text.trim()) return undefined;
  return text.split(',').map(pair => {
    const [label, value] = pair.trim().split(':');
    return { label: (label ?? pair).trim(), value: (value ?? label ?? pair).trim() };
  });
}

@Component({
  selector: 'app-admin-routing',
  standalone: true,
  imports: [TableToolbarComponent,
    CommonModule, FormsModule, SortHeaderComponent, TooltipDirective,
    LucidePencil, LucideCheck, LucideX,
    LucideTrash2, LucideArrowUp, LucideArrowDown, LucideSettings, LucideFilter, LucidePlus, LucideGitBranch, LucideGripVertical
  ],
  templateUrl: './admin-routing.component.html',
  styles: [`
    tr[draggable="true"] { cursor: grab; }
    tr.drop-above td { box-shadow: inset 0 2px 0 currentColor; }
    tr.drop-below td { box-shadow: inset 0 -2px 0 currentColor; }
  `]
})
export class AdminRoutingComponent {
  tradeOptions = computed(() => getTradeOptions());
  roleOptions = computed(() => {
    const used = new Set<string>();
    for (const templates of Object.values(getTemplates())) {
      for (const t of templates) {
        if (t.role) used.add(t.role);
      }
    }
    // always include all base roles plus any pipe-delimited combos
    for (const r of ROLES) used.add(r);
    return [...used].sort();
  });
  stageOptions = signal(allStageIds());

  rows = signal<RoutingRow[]>(this.buildInitialRows());
  table = new TableState<RoutingRow>(['sequence', 'routing', 'includedWhen']);
  visibleRows = computed(() => this.table.sorted());

  private messages = inject(ToastService);
  private clonedRows: Record<string, RoutingRow> = {};
  private seq = 0;

  editingId = signal<string | null>(null);
  newRowId = signal<string | null>(null);  // highlights the newly added row

  // ── Field config dialog ──
  /* turned off 2026-09-30 (user: "disable the other for now"); most Welding steps use hand-built
     layouts on the weld record, so edits here don't reliably show up there */
  readonly showFieldConfig = false;
  showFieldDlg = signal(false);
  fieldDlgTrade = signal<Job['trade']>('Welding');
  fieldDlgStageId = signal('');
  fieldDlgStageLabel = signal('');
  readingFields = signal<FieldRow[]>([]);
  signoffFields = signal<FieldRow[]>([]);
  newReadingKey = signal('');
  newReadingLabel = signal('');
  newSignoffKey = signal('');
  newSignoffLabel = signal('');

  // ── Included when dialog ──
  readonly conditionFields = STEP_CONDITION_FIELDS;
  condRow = signal<RoutingRow | null>(null);
  condRules = signal<ConditionRule[]>([]);

  constructor() {
    /* shown in Order unless another heading is clicked, so a drag or arrow move shows right away */
    this.table.sortField.set('sequence');
    effect(() => this.table.setRows(this.rows()));
  }

  private buildInitialRows(): RoutingRow[] {
    const rows: RoutingRow[] = [];
    for (const [trade, templates] of Object.entries(getTemplates())) {
      templates.forEach((t, i) => {
        rows.push({
          id: `${trade}:${t.id}`,
          routing: t.label,
          trade: trade as Job['trade'],
          sequence: i + 1,
          rejectToStage: t.rejectToStage ?? '',
          role: (t.role as Role) || 'View',
          includedWhen: describeConditions(t.includeWhen),
          rejectRules: [],
          fabricationEditable: !!t.fabricationEditable,
        });
      });
    }
    return rows.map(r => ({ ...r, rejectRules: this.rejectRuleLines(r) }));
  }

  /* ── Row CRUD ── */

  addRow() {
    const trade = this.tradeOptions()[0]?.value ?? 'Welding';
    const newId = `new-${++this.seq}`;
    const fullId = `${trade}:${newId}`;
    // negative sequence keeps it at the top until saved
    const row: RoutingRow = { id: fullId, routing: '', trade, sequence: -1, rejectToStage: '', role: 'View', includedWhen: describeConditions([]), rejectRules: [], fabricationEditable: false };
    this.table.clearFilters();
    this.rows.update(r => [...r, row]);
    this.editingId.set(fullId);
    this.newRowId.set(fullId);
    setTimeout(() => this.newRowId.set(null), 2000);
  }

  deleteRow(row: RoutingRow) {
    const trade = row.trade;
    const stageId = row.id.split(':')[1];
    deleteStageTemplate(trade, stageId);
    this.rows.update(r => r.filter(x => x.id !== row.id));
    this.resequence(trade);
    this.refreshStageOptions();
    this.messages.add({ severity: 'info', summary: 'Routing deleted', life: 3000 });
  }

  startEdit(row: RoutingRow) {
    this.clonedRows[row.id] = { ...row };
    this.editingId.set(row.id);
  }

  saveEdit(row: RoutingRow) {
    const parts = row.id.split(':');
    const stageId = parts[1];
    const isNew = stageId.startsWith('new-');

    if (isNew) {
      const newId = `custom-${Date.now()}`;
      addStageTemplate(row.trade, {
        id: newId, label: row.routing, required: true, role: row.role,
        fields: [], signoffFields: defaultSignoffFields(), rejectToStage: row.rejectToStage,
        fabricationEditable: row.fabricationEditable,
      });
      const newFullId = `${row.trade}:${newId}`;
      /* saved at the end, same as addStageTemplate() */
      this.rows.update(r => r.map(x => x.id === row.id ? { ...x, id: newFullId, sequence: Number.MAX_SAFE_INTEGER } : x));
      this.resequence(row.trade);
    } else {
      updateStageTemplate(row.trade, stageId, {
        label: row.routing,
        rejectToStage: row.rejectToStage,
        role: row.role,
        fabricationEditable: row.fabricationEditable,
      });
    }

    delete this.clonedRows[row.id];
    this.editingId.set(null);
    this.refreshStageOptions();
    this.messages.add({ severity: 'success', summary: 'Routing saved', detail: row.routing, life: 3000 });
  }

  cancelEdit(row: RoutingRow) {
    const original = this.clonedRows[row.id];
    if (original) {
      this.rows.update(r => r.map(x => (x.id === row.id ? original : x)));
      delete this.clonedRows[row.id];
    }
    this.editingId.set(null);
  }

  updateField(row: RoutingRow, field: 'routing' | 'role', value: string) {
    this.rows.update(r => r.map(x => x.id === row.id ? { ...x, [field]: value } : x));
  }

  updateFabricationEditable(row: RoutingRow, value: boolean) {
    this.rows.update(r => r.map(x => x.id === row.id ? { ...x, fabricationEditable: value } : x));
  }

  updateRejectTo(row: RoutingRow, value: string) {
    this.rows.update(r => r.map(x => x.id === row.id ? { ...x, rejectToStage: value } : x));
  }

  /* ── Reorder ── */

  moveUp(row: RoutingRow) {
    const tradeRows = this.rows().filter(r => r.trade === row.trade).sort((a, b) => a.sequence - b.sequence);
    const idx = tradeRows.findIndex(r => r.id === row.id);
    if (idx <= 0) return;
    const above = tradeRows[idx - 1];
    this.rows.update(rows => rows.map(r => {
      if (r.id === row.id) return { ...r, sequence: above.sequence };
      if (r.id === above.id) return { ...r, sequence: row.sequence };
      return r;
    }));
    this.saveOrder(row.trade);
  }

  moveDown(row: RoutingRow) {
    const tradeRows = this.rows().filter(r => r.trade === row.trade).sort((a, b) => a.sequence - b.sequence);
    const idx = tradeRows.findIndex(r => r.id === row.id);
    if (idx < 0 || idx >= tradeRows.length - 1) return;
    const below = tradeRows[idx + 1];
    this.rows.update(rows => rows.map(r => {
      if (r.id === row.id) return { ...r, sequence: below.sequence };
      if (r.id === below.id) return { ...r, sequence: row.sequence };
      return r;
    }));
    this.saveOrder(row.trade);
  }

  /* the trade's steps as shown in Order are the order joints get them in (unsaved new rows left out) */
  private saveOrder(trade: Job['trade']) {
    const ids = this.rows().filter(r => r.trade === trade && !r.id.includes(':new-'))
      .sort((a, b) => a.sequence - b.sequence).map(r => r.id.split(':')[1]);
    reorderStageTemplates(trade, ids);
    this.refreshStageOptions();
  }

  /* ── Drag to reorder (native HTML drag and drop; the arrows cover touch and keyboard) ── */
  dragId = signal('');
  overId = signal('');

  dropSide(row: RoutingRow): '' | 'above' | 'below' {
    const from = this.rows().find(r => r.id === this.dragId());
    if (!from || from.id === row.id || this.overId() !== row.id || from.trade !== row.trade) return '';
    return from.sequence < row.sequence ? 'below' : 'above';
  }

  onDragStart(e: DragEvent, row: RoutingRow) {
    this.dragId.set(row.id);
    e.dataTransfer?.setData('text/plain', row.id);   /* Firefox won't start a drag without data */
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  onDragOver(e: DragEvent, row: RoutingRow) {
    const from = this.rows().find(r => r.id === this.dragId());
    if (!from || from.trade !== row.trade) return;
    e.preventDefault();
    this.overId.set(row.id);
  }

  /* dragging up lands above the drop row, dragging down lands below it (so the last spot is reachable) */
  onDrop(e: DragEvent, target: RoutingRow) {
    e.preventDefault();
    const from = this.rows().find(r => r.id === this.dragId());
    if (from && from.id !== target.id && from.trade === target.trade) {
      const order = this.rows().filter(r => r.trade === target.trade).sort((a, b) => a.sequence - b.sequence).map(r => r.id);
      const movingDown = order.indexOf(from.id) < order.indexOf(target.id);
      const rest = order.filter(id => id !== from.id);
      rest.splice(rest.indexOf(target.id) + (movingDown ? 1 : 0), 0, from.id);
      this.rows.update(rows => rows.map(r => r.trade === target.trade ? { ...r, sequence: rest.indexOf(r.id) + 1 } : r));
      this.saveOrder(target.trade);
    }
    this.clearDrag();
  }

  clearDrag() {
    this.dragId.set('');
    this.overId.set('');
  }

  isFirstInTrade(row: RoutingRow): boolean {
    const tradeRows = this.rows().filter(r => r.trade === row.trade).sort((a, b) => a.sequence - b.sequence);
    return tradeRows[0]?.id === row.id;
  }
  isLastInTrade(row: RoutingRow): boolean {
    const tradeRows = this.rows().filter(r => r.trade === row.trade).sort((a, b) => a.sequence - b.sequence);
    return tradeRows[tradeRows.length - 1]?.id === row.id;
  }

  getRejectLabel(rejectToStage: string): string {
    if (!rejectToStage) return '-';
    if (rejectToStage === 'repair') return 'Repair';
    const match = this.stageOptions().find(s => s.id === rejectToStage);
    return match?.label ?? rejectToStage;
  }

  private resequence(trade: Job['trade']) {
    const sorted = this.rows().filter(r => r.trade === trade).sort((a, b) => a.sequence - b.sequence);
    this.rows.update(rows => rows.map(r => {
      if (r.trade !== trade) return r;
      const idx = sorted.findIndex(s => s.id === r.id);
      return { ...r, sequence: idx + 1 };
    }));
  }

  private refreshStageOptions() {
    // force recomputation — signal won't change if underlying data has same ids,
    // but the allStageIds() call will re-read from localStorage
    this.stageOptions.set(allStageIds());
  }

  /* ── Field config dialog ── */

  openFieldConfig(row: RoutingRow) {
    const trade = row.trade;
    const stageId = row.id.split(':')[1];
    const templates = getTemplates();
    const stage = templates[trade]?.find(t => t.id === stageId);

    this.fieldDlgTrade.set(trade);
    this.fieldDlgStageId.set(stageId);
    this.fieldDlgStageLabel.set(row.routing);
    this.readingFields.set((stage?.fields ?? []).map(toFieldRow));
    this.signoffFields.set((stage?.signoffFields ?? defaultSignoffFields()).map(toFieldRow));
    this.newReadingKey.set('');
    this.newReadingLabel.set('');
    this.newSignoffKey.set('');
    this.newSignoffLabel.set('');
    this.showFieldDlg.set(true);
  }

  /* reading fields */
  addReadingField() {
    const key = this.newReadingKey().trim();
    const label = this.newReadingLabel().trim() || key;
    if (!key) return;
    this.readingFields.update(f => [...f, { uid: `${Date.now()}`, key, label, type: 'text', required: false, placeholder: '', unit: '', optionsText: '' }]);
    this.newReadingKey.set('');
    this.newReadingLabel.set('');
  }
  removeReadingField(uid: string) {
    this.readingFields.update(f => f.filter(x => x.uid !== uid));
  }
  updateReadingField(uid: string, patch: Partial<FieldRow>) {
    this.readingFields.update(f => f.map(x => x.uid === uid ? { ...x, ...patch } : x));
  }

  /* signoff fields */
  addSignoffField() {
    const key = this.newSignoffKey().trim();
    const label = this.newSignoffLabel().trim() || key;
    if (!key) return;
    this.signoffFields.update(f => [...f, { uid: `${Date.now()}`, key, label, type: 'text', required: false, placeholder: '', unit: '', optionsText: '' }]);
    this.newSignoffKey.set('');
    this.newSignoffLabel.set('');
  }
  removeSignoffField(uid: string) {
    this.signoffFields.update(f => f.filter(x => x.uid !== uid));
  }
  updateSignoffField(uid: string, patch: Partial<FieldRow>) {
    this.signoffFields.update(f => f.map(x => x.uid === uid ? { ...x, ...patch } : x));
  }

  saveFieldConfig() {
    const trade = this.fieldDlgTrade();
    const stageId = this.fieldDlgStageId();
    updateStageTemplate(trade, stageId, {
      fields: this.readingFields().map(fieldRowToStageField),
      signoffFields: this.signoffFields().map(fieldRowToSignoffField),
    });
    this.showFieldDlg.set(false);
    this.messages.add({ severity: 'success', summary: 'Fields saved', life: 3000 });
  }

  /* ── Included when (step conditions) dialog ── */

  openConditions(row: RoutingRow) {
    const stage = getTemplates()[row.trade]?.find(t => t.id === row.id.split(':')[1]);
    this.condRules.set((stage?.includeWhen ?? []).map(rule => rule.map(c => ({ ...c, values: [...c.values] }))));
    this.condRow.set(row);
  }

  valuesFor(field: string): string[] {
    return conditionField(field)?.values ?? [];
  }

  /* the built-in rule for this step, if it has one */
  hasDefaultConditions(row: RoutingRow): boolean {
    return !!DEFAULT_STEP_CONDITIONS[row.id.split(':')[1]];
  }

  restoreDefaultConditions() {
    const row = this.condRow();
    if (!row) return;
    this.condRules.set((DEFAULT_STEP_CONDITIONS[row.id.split(':')[1]] ?? []).map(rule => rule.map(c => ({ ...c, values: [...c.values] }))));
  }

  addRule() {
    this.condRules.update(r => [...r, [this.newClause()]]);
  }
  removeRule(ri: number) {
    this.condRules.update(r => r.filter((_, i) => i !== ri));
  }
  addClause(ri: number) {
    this.condRules.update(r => r.map((rule, i) => i === ri ? [...rule, this.newClause()] : rule));
  }
  removeClause(ri: number, ci: number) {
    /* a rule left with no conditions would always match, so it goes too */
    this.condRules.update(r => r.map((rule, i) => i === ri ? rule.filter((_, j) => j !== ci) : rule).filter(rule => rule.length));
  }
  setClause(ri: number, ci: number, patch: Partial<ConditionClause>) {
    this.condRules.update(r => r.map((rule, i) => i !== ri ? rule : rule.map((c, j) => {
      if (j !== ci) return c;
      /* a new field, or switching to or from contains, starts with no values */
      return this.clearsValues(c, patch) ? { ...c, ...patch, values: [] } : { ...c, ...patch };
    })));
  }
  toggleValue(ri: number, ci: number, value: string) {
    const c = this.condRules()[ri][ci];
    this.setClause(ri, ci, { values: c.values.includes(value) ? c.values.filter(v => v !== value) : [...c.values, value] });
  }

  private clearsValues(c: ConditionClause, patch: Partial<ConditionClause>): boolean {
    if (patch.field && patch.field !== c.field) return true;
    return !!patch.op && (patch.op === 'contains') !== (c.op === 'contains');
  }

  /* a picked value, or typed text for contains */
  clauseValid(c: ConditionClause): boolean {
    return c.op === 'contains' ? !!c.values[0]?.trim() : c.values.length > 0;
  }

  conditionsValid = computed(() => this.condRules().every(rule => rule.every(c => this.clauseValid(c))));

  saveConditions() {
    const row = this.condRow();
    if (!row) return;
    const rules = this.condRules();
    updateStageTemplate(row.trade, row.id.split(':')[1], { includeWhen: rules });
    this.rows.update(r => r.map(x => x.id === row.id ? { ...x, includedWhen: describeConditions(rules) } : x));
    this.condRow.set(null);
    this.messages.add({ severity: 'success', summary: 'Conditions saved', detail: row.routing, life: 3000 });
  }

  /* ── Reject rules dialog ── */
  rejRow = signal<RoutingRow | null>(null);
  rejRules = signal<RejectRule[]>([]);
  rejFields = signal<StepConditionField[]>([]);

  private templateFor(row: RoutingRow) {
    return getTemplates()[row.trade]?.find(t => t.id === row.id.split(':')[1]);
  }

  /* this step's own answers first, then Joint Details */
  private rejectFieldsFor(row: RoutingRow): StepConditionField[] {
    const t = this.templateFor(row);
    return [...(t ? stageConditionFields(t) : []), ...STEP_CONDITION_FIELDS];
  }

  private rejectRuleLines(row: RoutingRow): string[] {
    const fields = this.rejectFieldsFor(row);
    return (this.templateFor(row)?.rejectRules ?? [])
      .map(r => `${describeConditions([r.when], fields)} → ${this.getRejectLabel(r.to)}`);
  }

  /* steps a rule can send an UNSAT to: this trade's steps, plus Repair on NDT steps */
  rejectTargets(row: RoutingRow): { id: string; label: string }[] {
    const own = (getTemplates()[row.trade] ?? []).filter(t => t.id !== row.id.split(':')[1]).map(t => ({ id: t.id, label: t.label }));
    return row.id.includes('-ndt-') ? [{ id: 'repair', label: 'Repair (adds a Repair step)' }, ...own] : own;
  }

  openRejectRules(row: RoutingRow) {
    this.rejFields.set(this.rejectFieldsFor(row));
    this.rejRules.set((this.templateFor(row)?.rejectRules ?? []).map(r => ({ to: r.to, when: r.when.map(c => ({ ...c, values: [...c.values] })) })));
    this.rejRow.set(row);
  }

  rejOptions(field: string): { value: string; label: string }[] {
    const f = this.rejFields().find(x => x.key === field);
    return (f?.values ?? []).map(v => ({ value: v, label: f?.valueLabel?.(v) ?? v }));
  }

  addRejectRule() {
    const row = this.rejRow();
    const to = row?.rejectToStage || this.rejectTargets(row!)[0]?.id || '';
    this.rejRules.update(r => [...r, { when: [{ field: this.rejFields()[0]?.key ?? '', op: 'is', values: [] }], to }]);
  }
  removeRejectRule(ri: number) {
    this.rejRules.update(r => r.filter((_, i) => i !== ri));
  }
  moveRejectRule(ri: number, delta: number) {
    this.rejRules.update(r => {
      const out = [...r];
      const j = ri + delta;
      if (j < 0 || j >= out.length) return r;
      [out[ri], out[j]] = [out[j], out[ri]];
      return out;
    });
  }
  setRejectTo(ri: number, to: string) {
    this.rejRules.update(r => r.map((x, i) => i === ri ? { ...x, to } : x));
  }
  addRejectClause(ri: number) {
    this.rejRules.update(r => r.map((x, i) => i === ri ? { ...x, when: [...x.when, { field: this.rejFields()[0]?.key ?? '', op: 'is' as const, values: [] }] } : x));
  }
  removeRejectClause(ri: number, ci: number) {
    /* a rule left with no conditions would never match, so it goes too */
    this.rejRules.update(r => r.map((x, i) => i === ri ? { ...x, when: x.when.filter((_, j) => j !== ci) } : x).filter(x => x.when.length));
  }
  setRejectClause(ri: number, ci: number, patch: Partial<ConditionClause>) {
    this.rejRules.update(r => r.map((x, i) => i !== ri ? x : { ...x, when: x.when.map((c, j) => {
      if (j !== ci) return c;
      return this.clearsValues(c, patch) ? { ...c, ...patch, values: [] } : { ...c, ...patch };
    }) }));
  }
  toggleRejectValue(ri: number, ci: number, value: string) {
    const c = this.rejRules()[ri].when[ci];
    this.setRejectClause(ri, ci, { values: c.values.includes(value) ? c.values.filter(v => v !== value) : [...c.values, value] });
  }

  rejectRulesValid = computed(() => this.rejRules().every(r => !!r.to && r.when.every(c => this.clauseValid(c))));

  saveRejectRules() {
    const row = this.rejRow();
    if (!row) return;
    updateStageTemplate(row.trade, row.id.split(':')[1], { rejectRules: this.rejRules() });
    this.rows.update(r => r.map(x => x.id === row.id ? { ...x, rejectRules: this.rejectRuleLines(row) } : x));
    this.rejRow.set(null);
    this.messages.add({ severity: 'success', summary: 'Reject rules saved', detail: row.routing, life: 3000 });
  }

  private newClause(): ConditionClause {
    return { field: STEP_CONDITION_FIELDS[0].key, op: 'is', values: [] };
  }

  /* ── CSV export ── */

  exportCsv() {
    downloadCsv('routing', [
      { header: 'Order', value: (r: RoutingRow) => r.sequence },
      { header: 'Routing', value: (r: RoutingRow) => r.routing },
      { header: 'Included when', value: (r: RoutingRow) => r.includedWhen },
      { header: 'Reject routes to', value: (r: RoutingRow) => r.rejectToStage || 'None' },
      { header: 'Reject rules', value: (r: RoutingRow) => r.rejectRules.join('; ') },
      { header: 'Fabrication editable', value: (r: RoutingRow) => r.fabricationEditable ? 'Yes' : 'No' }
    ], this.visibleRows());
  }
}
