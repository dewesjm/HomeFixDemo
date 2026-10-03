// Admin → Routing: manage per-trade workflow routing with sequence ordering,
// field configuration (readings + sign-off), reject routing + reject rules, and step conditions (Included when).
// Persists to localStorage via the data/workflow/stage-templates.ts edit functions.
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucidePencil, LucideCheck, LucideX,
  LucideTrash2, LucideArrowUp, LucideArrowDown, LucideSettings, LucideFilter, LucidePlus, LucideGitBranch, LucideGripVertical
} from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { TooltipDirective } from '../../../shared/tooltip.directive';
import { TableState } from '../../../shared/table-state';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../data/export-csv';
import { Job } from '../../../data/jobs';
import {
  defaultSignoffFields, addStageTemplate, updateStageTemplate, deleteStageTemplate, reorderStageTemplates,
  allStageIds, getTemplates, ROLES, type Role
} from '../../../data/workflow';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import {
  ConditionClause, ConditionRule, RejectRule, StepConditionField, STEP_CONDITION_FIELDS, DEFAULT_STEP_CONDITIONS,
  describeConditions, stageConditionFields, stepAnswerFieldsBefore, ENGINEERING_HOLD_TARGET
} from '../../../data/step-conditions';
import {
  conditionFieldGroups, conditionValueOptions, clauseTyped, clauseValid, patchClause, newConditionClause
} from '../../../data/condition-editing';
import { RoutingFieldConfigDialogComponent } from './routing-field-config-dialog.component';

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

@Component({
  selector: 'app-admin-routing',
  standalone: true,
  imports: [TableToolbarComponent, RoutingFieldConfigDialogComponent,
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
  private confirm = inject(ConfirmService);
  private clonedRows: Record<string, RoutingRow> = {};
  private seq = 0;

  editingId = signal<string | null>(null);
  newRowId = signal<string | null>(null);  // highlights the newly added row

  // ── Field config dialog ──
  /* SWITCHED OFF: most Welding steps use hand-built layouts on the weld record, so field edits here
     don't reliably show up there. This could be turned back on one day, so the code is kept working
     rather than removed, to avoid a rewrite. */
  readonly showFieldConfig = false;
  fieldDlgRow = signal<RoutingRow | null>(null);

  // ── Included when dialog ──
  condFields = signal<StepConditionField[]>([]);
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
    const trade = 'Welding';
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
    this.confirm.confirm({
      header: 'Delete Routing',
      message: `Delete ${row.routing}?`,
      acceptLabel: 'Delete',
      accept: () => {
        const trade = row.trade;
        const stageId = row.id.split(':')[1];
        deleteStageTemplate(trade, stageId);
        this.rows.update(r => r.filter(x => x.id !== row.id));
        this.resequence(trade);
        this.refreshStageOptions();
        this.messages.add({ severity: 'info', summary: 'Routing deleted', life: 3000 });
      }
    });
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
    if (rejectToStage === ENGINEERING_HOLD_TARGET) return 'Engineering Hold';
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
    this.fieldDlgRow.set(row);
  }

  /* ── Included when (step conditions) dialog ── */

  openConditions(row: RoutingRow) {
    const stage = getTemplates()[row.trade]?.find(t => t.id === row.id.split(':')[1]);
    this.condFields.set([...STEP_CONDITION_FIELDS, ...stepAnswerFieldsBefore(row.trade, row.id.split(':')[1])]);
    this.condRules.set((stage?.includeWhen ?? []).map(rule => rule.map(c => ({ ...c, values: [...c.values] }))));
    this.condRow.set(row);
  }

  /* ── shared by both rule dialogs ── */

  readonly groupsOf = conditionFieldGroups;
  readonly optionsOf = conditionValueOptions;
  readonly typed = clauseTyped;
  readonly clauseValid = clauseValid;

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
    this.condRules.update(r => [...r, [newConditionClause()]]);
  }
  removeRule(ri: number) {
    this.condRules.update(r => r.filter((_, i) => i !== ri));
  }
  addClause(ri: number) {
    this.condRules.update(r => r.map((rule, i) => i === ri ? [...rule, newConditionClause()] : rule));
  }
  removeClause(ri: number, ci: number) {
    /* a rule left with no conditions would always match, so it goes too */
    this.condRules.update(r => r.map((rule, i) => i === ri ? rule.filter((_, j) => j !== ci) : rule).filter(rule => rule.length));
  }
  setClause(ri: number, ci: number, patch: Partial<ConditionClause>) {
    this.condRules.update(r => r.map((rule, i) => i !== ri ? rule : rule.map((c, j) => {
      return j === ci ? patchClause(this.condFields(), c, patch) : c;
    })));
  }
  toggleValue(ri: number, ci: number, value: string) {
    const c = this.condRules()[ri][ci];
    this.setClause(ri, ci, { values: c.values.includes(value) ? c.values.filter(v => v !== value) : [...c.values, value] });
  }

  conditionsValid = computed(() => this.condRules().every(rule => rule.every(c => this.clauseValid(this.condFields(), c))));

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

  /* this step's own answers, Joint Details, then earlier steps' answers */
  private rejectFieldsFor(row: RoutingRow): StepConditionField[] {
    const t = this.templateFor(row);
    return [...(t ? stageConditionFields(t) : []), ...STEP_CONDITION_FIELDS, ...stepAnswerFieldsBefore(row.trade, row.id.split(':')[1])];
  }

  private rejectRuleLines(row: RoutingRow): string[] {
    const fields = this.rejectFieldsFor(row);
    return (this.templateFor(row)?.rejectRules ?? [])
      .map(r => `${describeConditions([r.when], fields)} → ${this.getRejectLabel(r.to)}`);
  }

  /* where a rule can send an UNSAT: Engineering Hold, Repair on NDT steps, or this trade's steps */
  rejectTargets(row: RoutingRow): { id: string; label: string }[] {
    const own = (getTemplates()[row.trade] ?? []).filter(t => t.id !== row.id.split(':')[1]).map(t => ({ id: t.id, label: t.label }));
    const hold = { id: ENGINEERING_HOLD_TARGET, label: 'Engineering Hold (adds an Engineering Hold step)' };
    return row.id.includes('-ndt-') ? [hold, { id: 'repair', label: 'Repair (adds a Repair step)' }, ...own] : [hold, ...own];
  }

  openRejectRules(row: RoutingRow) {
    this.rejFields.set(this.rejectFieldsFor(row));
    this.rejRules.set((this.templateFor(row)?.rejectRules ?? []).map(r => ({ to: r.to, when: r.when.map(c => ({ ...c, values: [...c.values] })) })));
    this.rejRow.set(row);
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
      return j === ci ? patchClause(this.rejFields(), c, patch) : c;
    }) }));
  }
  toggleRejectValue(ri: number, ci: number, value: string) {
    const c = this.rejRules()[ri].when[ci];
    this.setRejectClause(ri, ci, { values: c.values.includes(value) ? c.values.filter(v => v !== value) : [...c.values, value] });
  }

  rejectRulesValid = computed(() => this.rejRules().every(r => !!r.to && r.when.every(c => this.clauseValid(this.rejFields(), c))));

  saveRejectRules() {
    const row = this.rejRow();
    if (!row) return;
    updateStageTemplate(row.trade, row.id.split(':')[1], { rejectRules: this.rejRules(), rejectRulesEdited: true });
    this.rows.update(r => r.map(x => x.id === row.id ? { ...x, rejectRules: this.rejectRuleLines(row) } : x));
    this.rejRow.set(null);
    this.messages.add({ severity: 'success', summary: 'Reject rules saved', detail: row.routing, life: 3000 });
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
