import { insertionRelativeTargets } from '../../routing/insertion-target-options';
import { thenRuleSummary } from './then-rule-summary';
import { insertionTriggers, InsertionTrigger } from './insertion-triggers';
import { insertionTarget, insertionDefinitionId } from '../../routing/instance-identity';
import { insertionConfigurationErrors } from '../../routing/insertion-validation';
// Admin → Routing Settings: manage per-trade workflow routing with sequence ordering,
// field configuration (readings + sign-off), reject routing + reject rules, and step conditions (Included when).
// Persists to localStorage via the weld-record/routing/stage-templates.ts edit functions.
import { isDraftRouting, nextRoutingNumber, pinDraftRoutings } from './routing-row-order';
import { PersonaRulesComponent, personaRuleSummary } from './persona-rules.component';
import { addedRoutingSetup, routingNameError } from '../../routing/added-routing-configuration';
import { StageTemplate } from '../../model/workflow-types';
import { isAddedTemplateId } from '../../routing/stage-templates';
import { RULE_TARGETS, availableRuleTargets } from '../../routing/rule-targets';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucidePencil, LucideCheck, LucideX,
  LucideTrash2, LucideArrowUp, LucideArrowDown, LucideFilter, LucidePlus, LucideGitBranch, LucideGripVertical
} from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { TooltipDirective } from '../../../shared/tooltip.directive';
import { TableState } from '../../../shared/table-state';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../shared/export-csv';
import { Job } from '../../../data/jobs';
import {
  addStageTemplate,
  updateStageTemplate,
  deleteStageTemplate,
  reorderStageTemplates,
  allStageIds,
  getTemplates,
} from '../../routing/stage-templates';
import { ROLES, type Role } from '../../model/workflow-types';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import {
  ConditionClause, ConditionRule, RejectRule, StepConditionField, STEP_CONDITION_FIELDS, DEFAULT_STEP_CONDITIONS,
  describeConditions, stageConditionFields, stepAnswerFieldsBefore
} from '../../routing/step-conditions';
import {
  conditionFieldGroups, conditionValueOptions, clauseTyped, clauseValid, patchClause, newConditionClause
} from './condition-editing';

interface RoutingRow {
  id: string;
  routing: string;        /* the name rules use (Included when, reject rules) */
  displayName: string;    /* shown on the joint and the routing bar; blank = routing */
  trade: Job['trade'];
  sequence: number;
  added?: boolean;
  status?: StageTemplate['status'];
  rejectToStage: string;
  role: Role;
  includedWhen: string;   /* describeConditions() of the step's rules */
  thenRules: string[];
  rejectRules: string[];  /* one line per reject rule, "<conditions> -> <target>" */
  fabricationEditable: boolean;
}

@Component({
  selector: 'app-admin-routing',
  standalone: true,
  imports: [PersonaRulesComponent, TableToolbarComponent,
    CommonModule, FormsModule, SortHeaderComponent, TooltipDirective,
    LucidePencil, LucideCheck, LucideX,
    LucideTrash2, LucideArrowUp, LucideArrowDown, LucideFilter, LucidePlus, LucideGitBranch, LucideGripVertical
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
  stageOptions = signal(this.targetOptions());

  rows = signal<RoutingRow[]>(this.buildInitialRows());
  table = new TableState<RoutingRow>(['sequence', 'routing', 'displayName', 'includedWhen']);
  visibleRows = computed(() => this.table.sorted());

  private messages = inject(ToastService);
  private confirm = inject(ConfirmService);
  private clonedRows: Record<string, RoutingRow> = {};
  private seq = 0;

  personaRow = signal<RoutingRow | null>(null);
  insertionTriggers(row: RoutingRow) { return insertionTriggers(getTemplates()[row.trade] ?? [], row.id.split(':')[1]); }
  editInsertionTrigger(row: RoutingRow, trigger: InsertionTrigger) {
    const source = this.rows().find(r => r.trade === row.trade && r.id.split(':')[1] === trigger.sourceId);
    if (!source) return;
    if (trigger.mode === 'then') this.openThenRules(source);
    else this.openRejectRules(source);
  }
  personaTemplate(row: RoutingRow): StageTemplate | undefined { return this.templateFor(row); }
  personaSummary(row: RoutingRow): string { const template = this.templateFor(row); return template ? personaRuleSummary(template) : row.role; }
  personaSaved() {
    this.rows.update(rows => rows.map(row => {
      const role = this.templateFor(row)?.role as Role | undefined;
      if (!role) return row;
      const original = this.clonedRows[row.id];
      if (original) this.clonedRows[row.id] = { ...original, role };
      return { ...row, role };
    }));
  }
  editingId = signal<string | null>(null);
  newRowId = signal<string | null>(null);  // highlights the newly added row

  // ── Included when dialog ──
  condFields = signal<StepConditionField[]>([]);
  condRow = signal<RoutingRow | null>(null);
  condRules = signal<ConditionRule[]>([]);

  constructor() {
    /* shown in Order unless another heading is clicked, so a drag or arrow move shows right away */
    this.table.sortField.set('sequence');
    effect(() => this.table.setRows(this.rows()));
  }

  isAdded(row: RoutingRow): boolean { return row.added ?? isAddedTemplateId(row.id.split(':')[1]); }
  sectionRows(added: boolean) { return pinDraftRoutings(this.visibleRows().filter(r => this.isAdded(r) === added)); }
  private targetOptions() {
    return [...allStageIds().filter(s => !isAddedTemplateId(s.id)), ...RULE_TARGETS,
      ...Object.values(getTemplates()).flatMap(list => list.filter(t => t.classification === 'added' && t.lifecycle === 'ordinary' && t.status === 'active').map(t => ({ id: insertionTarget(t.id), label: `Insert ${t.label}` })))];
  }

  private buildInitialRows(): RoutingRow[] {
    const rows: RoutingRow[] = [];
    for (const [trade, templates] of Object.entries(getTemplates())) {
      let sequence = 0;
      templates.forEach(t => {
        rows.push({
          id: `${trade}:${t.id}`,
          added: t.classification === 'added', status: t.status ?? 'active',
          routing: t.label,
          displayName: t.displayName ?? '',
          trade: trade as Job['trade'],
          sequence: isAddedTemplateId(t.id) ? 0 : ++sequence,
          rejectToStage: t.rejectToStage ?? '',
          role: (t.role as Role) || 'View',
          includedWhen: describeConditions(t.includeWhen),
          rejectRules: [], thenRules: [],
          fabricationEditable: !!t.fabricationEditable,
        });
      });
    }
    return rows.map(r => ({ ...r, rejectRules: this.rejectRuleLines(r), thenRules: this.thenRuleLines(r) }));
  }

  /* ── Row CRUD ── */

  setupSummary(row: RoutingRow): string {
    const t = this.templateFor(row);
    return t ? addedRoutingSetup(t).summary : 'Save this draft, then configure its Types and forms.';
  }

  canConfigureApplicability(row: RoutingRow): boolean {
    return this.canChangeStatus(row) || this.templateFor(row)?.lifecycle === 'excavation';
  }

  canChangeStatus(row: RoutingRow): boolean {
    return this.isAdded(row) && this.templateFor(row)?.lifecycle === 'ordinary';
  }

  toggleStatus(row: RoutingRow) {
    const t = this.templateFor(row);
    if (!t || !this.canChangeStatus(row)) return;
    const next = t.status === 'active' ? 'inactive' : 'active';
    const setup = addedRoutingSetup(t);
    if (next === 'active' && setup.errors.length) {
      this.messages.add({ severity: 'warn', summary: 'Complete routing setup', detail: setup.errors.join(' '), life: 6000 });
      return;
    }
    updateStageTemplate(row.trade, t.id, { status: next });
    this.rows.set(this.buildInitialRows());
    this.refreshStageOptions();
  }

  addRow(added = false) {
    if (this.editingId()) return;
    const trade = 'Welding';
    const newId = `new-${++this.seq}`;
    const fullId = `${trade}:${newId}`;
    const sequence = nextRoutingNumber(this.rows().filter(row => row.trade === trade && !this.isAdded(row)));
    const row: RoutingRow = { added, status: added ? 'draft' : 'active', id: fullId, routing: '', displayName: '', trade, sequence, rejectToStage: '', role: 'View', includedWhen: describeConditions([]), rejectRules: [], thenRules: [], fabricationEditable: false };
    this.table.clearFilters();
    this.rows.update(r => [...r, row]);
    this.editingId.set(fullId);
    this.newRowId.set(fullId);
    setTimeout(() => this.newRowId.set(null), 2000);
  }

  deleteRow(row: RoutingRow) {
    if (this.isAdded(row)) return;
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
    const error = routingNameError(row.routing, row.id.split(':')[1], getTemplates()[row.trade]);
    if (error) { this.messages.add({ severity: 'warn', summary: error, life: 4000 }); return; }
    row = { ...row, routing: row.routing.trim() };
    const parts = row.id.split(':');
    const stageId = parts[1];
    const isNew = stageId.startsWith('new-');
    const current = this.templateFor(row);
    if (current?.classification === 'added' && current.lifecycle === 'ordinary' && current.status === 'active') {
      const setup = addedRoutingSetup({ ...current, label: row.routing, role: row.role });
      if (setup.errors.length) {
        this.messages.add({ severity: 'warn', summary: 'Complete routing setup', detail: setup.errors.join(' '), life: 6000 });
        return;
      }
    }

    const insertionErrors = insertionConfigurationErrors(getTemplates()[row.trade].map(t => t.id === stageId ? { ...t, rejectToStage: row.rejectToStage } : t));
    if (insertionErrors.length) {
      this.messages.add({ severity: 'warn', summary: 'Invalid routing destination', detail: insertionErrors.join(' '), life: 6000 });
      return;
    }

    if (isNew) {
      const newId = `custom-${crypto.randomUUID()}`;
      addStageTemplate(row.trade, {
        classification: this.isAdded(row) ? 'added' : 'numbered', lifecycle: 'ordinary', status: row.status,
        id: newId, label: row.routing, displayName: row.displayName.trim() || undefined, required: true, role: row.role,
        rejectToStage: row.rejectToStage,
        fabricationEditable: row.fabricationEditable,
      });
      const newFullId = `${row.trade}:${newId}`;
      /* Saving ends draft pinning; its sequence remains in the numbered list. */
      this.rows.update(r => r.map(x => x.id === row.id ? { ...x, id: newFullId } : x));
      this.resequence(row.trade);
      this.saveOrder(row.trade);
    } else {
      updateStageTemplate(row.trade, stageId, {
        label: row.routing,
        displayName: row.displayName.trim() || undefined,
        rejectToStage: row.rejectToStage,
        role: row.role,
        fabricationEditable: row.fabricationEditable,
      });
    }

    this.rows.set(this.buildInitialRows());
    delete this.clonedRows[row.id];
    this.editingId.set(null);
    this.refreshStageOptions();
    this.messages.add({ severity: 'success', summary: 'Routing saved', detail: row.routing, life: 3000 });
  }

  cancelEdit(row: RoutingRow) {
    if (isDraftRouting(row)) {
      this.rows.update(rows => rows.filter(item => item.id !== row.id));
      this.resequence(row.trade);
    }
    const original = this.clonedRows[row.id];
    if (original) {
      this.rows.update(r => r.map(x => (x.id === row.id ? original : x)));
      delete this.clonedRows[row.id];
    }
    this.editingId.set(null);
  }

  updateField(row: RoutingRow, field: 'routing' | 'displayName' | 'role', value: string) {
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
    const tradeRows = this.rows().filter(r => r.trade === row.trade && !this.isAdded(r)).sort((a, b) => a.sequence - b.sequence);
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
    const tradeRows = this.rows().filter(r => r.trade === row.trade && !this.isAdded(r)).sort((a, b) => a.sequence - b.sequence);
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
      const order = this.rows().filter(r => r.trade === target.trade && !this.isAdded(r)).sort((a, b) => a.sequence - b.sequence).map(r => r.id);
      const movingDown = order.indexOf(from.id) < order.indexOf(target.id);
      const rest = order.filter(id => id !== from.id);
      rest.splice(rest.indexOf(target.id) + (movingDown ? 1 : 0), 0, from.id);
      this.rows.update(rows => rows.map(r => r.trade === target.trade && !this.isAdded(r) ? { ...r, sequence: rest.indexOf(r.id) + 1 } : r));
      this.saveOrder(target.trade);
    }
    this.clearDrag();
  }

  clearDrag() {
    this.dragId.set('');
    this.overId.set('');
  }

  isFirstInTrade(row: RoutingRow): boolean {
    const tradeRows = this.rows().filter(r => r.trade === row.trade && !this.isAdded(r)).sort((a, b) => a.sequence - b.sequence);
    return tradeRows[0]?.id === row.id;
  }
  isLastInTrade(row: RoutingRow): boolean {
    const tradeRows = this.rows().filter(r => r.trade === row.trade && !this.isAdded(r)).sort((a, b) => a.sequence - b.sequence);
    return tradeRows[tradeRows.length - 1]?.id === row.id;
  }

  getRejectLabel(rejectToStage: string): string {
    if (!rejectToStage) return 'Continue in order';
    if (rejectToStage === 'insertion-source') return 'Insertion source routing';
    if (rejectToStage === 'continue') return 'Continue after inserted work';
    const definition = insertionDefinitionId(rejectToStage);
    if (definition) {
      const t = Object.values(getTemplates()).flat().find(t => t.id === definition);
      return `Insert ${t?.label ?? definition}${t && t.status !== 'active' ? ` (${t.status})` : ''}`;
    }
    const special = RULE_TARGETS.find(t => t.id === rejectToStage);
    if (special) return special.label;
    const match = this.stageOptions().find(s => s.id === rejectToStage);
    return match?.label ?? rejectToStage;
  }

  private resequence(trade: Job['trade']) {
    const sorted = this.rows().filter(r => r.trade === trade && !this.isAdded(r)).sort((a, b) => a.sequence - b.sequence);
    this.rows.update(rows => rows.map(r => {
      if (r.trade !== trade || this.isAdded(r)) return r;
      const idx = sorted.findIndex(s => s.id === r.id);
      return { ...r, sequence: idx + 1 };
    }));
  }

  private refreshStageOptions() {
    // force recomputation — signal won't change if underlying data has same ids,
    // but the allStageIds() call will re-read from localStorage
    this.stageOptions.set(this.targetOptions());
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
  ruleMode = signal<'reject' | 'then'>('reject');
  rejRow = signal<RoutingRow | null>(null);
  rejRules = signal<RejectRule[]>([]);
  rejDefaultTarget = signal('');
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

  /* Ordinary definitions can continue their captured path or request another insertion. */
  rejectTargets(row: RoutingRow): { id: string; label: string }[] {
    return [...(getTemplates()[row.trade] ?? []).filter(t => !isAddedTemplateId(t.id)).map(t => ({ id: t.id, label: t.label })), ...availableRuleTargets(row.id.split(':')[1]),
      ...(this.templateFor(row)?.lifecycle === 'ordinary' && this.isAdded(row)
        ? insertionRelativeTargets(row.id.split(':')[1], getTemplates()[row.trade] ?? []) : []),
      ...(getTemplates()[row.trade] ?? []).filter(t => t.classification === 'added' && t.lifecycle === 'ordinary' && t.status === 'active').map(t => ({ id: insertionTarget(t.id), label: `Insert ${t.label}` }))];
  }

  openRejectRules(row: RoutingRow) {
    this.ruleMode.set('reject');
    this.rejDefaultTarget.set(row.rejectToStage);
    this.rejFields.set(this.rejectFieldsFor(row));
    this.rejRules.set((this.templateFor(row)?.rejectRules ?? []).map(r => ({ to: r.to, when: r.when.map(c => ({ ...c, values: [...c.values] })) })));
    this.rejRow.set(row);
  }

  private thenRuleLines(row: RoutingRow): string[] {
    return (this.templateFor(row)?.thenRules ?? [])
      .map(r => thenRuleSummary(r, this.rejectFieldsFor(row), this.getRejectLabel(r.to)));
  }

  openThenRules(row: RoutingRow) {
    this.ruleMode.set('then');
    this.rejFields.set(this.rejectFieldsFor(row));
    this.rejRules.set((this.templateFor(row)?.thenRules ?? []).map(r => ({ to: r.to, when: r.when.map(c => ({ ...c, values: [...c.values] })) })));
    this.rejRow.set(row);
  }

  addRejectRule() {
    const row = this.rejRow();
    const to = (this.ruleMode() === 'then' ? row?.id.split(':')[1] : row?.rejectToStage) || this.rejectTargets(row!)[0]?.id || '';
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
    /* A rule without conditions is the table's unconditional fallback. */
    this.rejRules.update(r => r.map((x, i) => i === ri ? { ...x, when: x.when.filter((_, j) => j !== ci) } : x));
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

  ruleConfigurationError(): string {
    const row = this.rejRow();
    if (!row) return '';
    const patch = this.ruleMode() === 'then' ? { thenRules: this.rejRules() } : { rejectRules: this.rejRules(), rejectToStage: this.rejDefaultTarget() };
    return insertionConfigurationErrors((getTemplates()[row.trade] ?? []).map(t => t.id === row.id.split(':')[1] ? { ...t, ...patch } : t)).join(' ');
  }

  rejectRulesValid = computed(() => !this.ruleConfigurationError() && this.rejRules().every(r => !!r.to && r.when.every(c => this.clauseValid(this.rejFields(), c))));

  saveRejectRules() {
    const row = this.rejRow();
    if (!row || !this.rejectRulesValid()) return;
    if (this.ruleMode() === 'then') {
      updateStageTemplate(row.trade, row.id.split(':')[1], { thenRules: this.rejRules() });
      this.rows.update(r => r.map(x => x.id === row.id ? { ...x, thenRules: this.thenRuleLines(row) } : x));
      this.rejRow.set(null);
      this.messages.add({ severity: 'success', summary: 'Then go to rules saved', detail: row.routing, life: 3000 });
      return;
    }
    updateStageTemplate(row.trade, row.id.split(':')[1], { rejectRules: this.rejRules(), rejectRulesEdited: true, rejectToStage: this.rejDefaultTarget() });
    this.rows.update(r => r.map(x => x.id === row.id ? { ...x, rejectToStage: this.rejDefaultTarget(), rejectRules: this.rejectRuleLines(row) } : x));
    this.rejRow.set(null);
    this.messages.add({ severity: 'success', summary: 'Reject rules saved', detail: row.routing, life: 3000 });
  }

  /* ── CSV export ── */

  exportCsv() {
    downloadCsv('routing', [
      { header: 'Order', value: (r: RoutingRow) => this.isAdded(r) ? 'Inserted' : r.sequence },
      { header: 'Status', value: (r: RoutingRow) => r.status ?? 'active' },
      { header: 'Type and form setup', value: (r: RoutingRow) => this.setupSummary(r) },
      { header: 'Routing', value: (r: RoutingRow) => r.routing },
      { header: 'Display Name', value: (r: RoutingRow) => r.displayName || r.routing },
      { header: 'Included when', value: (r: RoutingRow) => this.isAdded(r) ? [...this.insertionTriggers(r).map(t => t.label), ...(this.canConfigureApplicability(r) ? [`Applies when: ${r.includedWhen}`] : [])].join('; ') : r.includedWhen },
      { header: 'Reject routes to', value: (r: RoutingRow) => this.getRejectLabel(r.rejectToStage) },
      { header: 'If … Then go to', value: (r: RoutingRow) => r.thenRules.join('; ') },
      { header: 'Reject rules', value: (r: RoutingRow) => r.rejectRules.join('; ') },
      { header: 'Fabrication editable', value: (r: RoutingRow) => r.fabricationEditable ? 'Yes' : 'No' },
      { header: 'Persona', value: (r: RoutingRow) => this.personaSummary(r) }
    ], this.visibleRows());
  }
}
