/* Admin → Signoff Type Definition: table of per-step field configurations.
   Each row is a routing step, or Repair / Excavation NDT (one row shared by every round); editing
   picks any field from the catalog and sets when it shows, when it's filled from another step and
   locked, when it's greyed out and whether it's required. Add's step list is the steps in
   Admin > Signoff Type Availability; picking one that already has a definition edits it.
   Stored in welding:step-field-config:v2 (step-field-config.ts). */
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2,
  LucideChevronDown, LucideChevronRight,
} from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../data/export-csv';
import {
  DEFAULT_STEP_FIELD_ACTIVATIONS, StepFieldActivation, FieldActivation,
  FIELD_CATALOG,
  getStepFieldConfig, setStepFieldConfig, resetStepFieldConfig,
  getTemplates, defaultShowIf, showIfToStore, defaultDisabledIf, disabledIfToStore, requiredToStore, isAlwaysReadOnly,
  showRuleText, disabledRuleText, effectiveRequired, hasBuiltInShowRule, hasFixedRules,
  defaultFill, effectiveFill, fillToStore, fillRuleText, getActivationForStep, lookupCatalogField,
  getSignoffTypeRows, isRoutingLockedField, REPAIR_TYPE_ROW, EXCAVATION_TYPE_ROW,
} from '../../../data/workflow';
import type { ConditionClause, FieldCondition, FieldFill } from '../../../data/workflow';

interface DefRow {
  uid: string;
  stepId: string;
  stepLabel: string;
  fieldLabels: string;          // flat text used for table search
  fieldActivations: FieldActivation[];
}

type ClauseSrc = 'field' | 'jointDetail' | 'stepId';
/* which of a field's conditions the editor is changing */
type CondKind = 'show' | 'disabled' | 'fill';

interface WorkClause {
  source: ClauseSrc;
  key: string;   /* field key or joint detail key; ignored for stepId */
  equals: string;  /* value for field/jointDetail; regex for stepId (mapped to 'matches') */
}

interface EditState {
  uid: string | null;   /* null = new row */
  stepId: string;
  stepLabel: string;
  fieldActivations: FieldActivation[];
  condKey: string | null;      /* field key whose condition editor is open */
  condKind: CondKind;
  condClauses: WorkClause[];   /* working copy of the open field's condition */
  fillStepId: string;          /* the open fill rule's source step and field ('' = never filled) */
  fillFieldKey: string;
}

let seq = 0;

const copyCondition = (c?: FieldCondition): FieldCondition | undefined => c ? { all: c.all.map(x => ({ ...x })) } : undefined;
const copyFill = (f: FieldFill | null | undefined) => f ? { ...f, when: copyCondition(f.when)! } : f;
const copyActivation = (f: FieldActivation): FieldActivation =>
  ({ ...f, showIf: copyCondition(f.showIf), disabledIf: copyCondition(f.disabledIf), fill: copyFill(f.fill) });

@Component({
  selector: 'app-admin-signoff-type-definition',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableToolbarComponent, SortHeaderComponent,
    LucidePlus, LucidePencil, LucideCheck, LucideX, LucideTrash2,
    LucideChevronDown, LucideChevronRight,
  ],
  templateUrl: './admin-signoff-type-definition.component.html',
})
export class AdminSignoffTypeDefinitionComponent {
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  /* the catalog fields offered for the step being edited: a field its own form draws (drawnByStepForm)
     only on the steps that have it by default */
  fieldChoices = computed(() => {
    const stepId = this.editing()?.stepId ?? '';
    const defaults = DEFAULT_STEP_FIELD_ACTIVATIONS.find(d => d.stepId === stepId)?.fields ?? [];
    return FIELD_CATALOG
      .filter(f => !f.drawnByStepForm || defaults.some(d => d.key === f.key))
      .map(f => ({ key: f.key, label: f.label }));
  });

  private labelMap = this.buildLabelMap();

  rows = signal<DefRow[]>([]);
  editing = signal<EditState | null>(null);
  table = new TableState<DefRow>(['stepLabel', 'fieldLabels']);

  constructor() {
    this.rows.set(this.buildRows());
    effect(() => this.table.setRows(this.rows()));
  }

  /* ── Table rows ── */

  private buildLabelMap(): Map<string, string> {
    const m = new Map<string, string>();
    const templates = getTemplates();
    for (const group of Object.values(templates)) {
      for (const s of group as { id: string; label: string; displayName?: string }[]) {
        m.set(s.id, s.displayName || s.label);
      }
    }
    m.set(REPAIR_TYPE_ROW, 'Repair');
    m.set(EXCAVATION_TYPE_ROW, 'Excavation NDT');
    return m;
  }

  private stepLabel(stepId: string): string {
    return this.labelMap.get(stepId) ?? stepId;
  }

  private buildRows(): DefRow[] {
    /* show every step that has a default activation, merged with any stored overrides */
    const stored = getStepFieldConfig();

    /* all default steps */
    const rows: DefRow[] = DEFAULT_STEP_FIELD_ACTIVATIONS.map(def => {
      const act = stored.find(a => a.stepId === def.stepId) ?? def;
      return this.toRow(def.stepId, act.fields);
    });

    /* any custom stored steps not in the defaults */
    for (const act of stored) {
      if (!DEFAULT_STEP_FIELD_ACTIVATIONS.some(d => d.stepId === act.stepId)) {
        rows.push(this.toRow(act.stepId, act.fields));
      }
    }

    return rows;
  }

  private toRow(stepId: string, fields: FieldActivation[]): DefRow {
    return {
      uid: `sfd-${++seq}`,
      stepId,
      stepLabel: this.stepLabel(stepId),
      fieldLabels: fields.map(f => FIELD_CATALOG.find(c => c.key === f.key)?.label ?? f.key).join(', '),
      fieldActivations: fields.map(f => ({ ...f })),
    };
  }

  /* the steps in Admin > Signoff Type Availability; ones that already have a definition say so */
  addableSteps = computed(() => {
    const used = new Set(this.rows().map(r => r.stepId));
    return getSignoffTypeRows().map(r => ({
      stepId: r.stepId,
      stepLabel: this.stepLabel(r.stepId) + (used.has(r.stepId) ? ' (has a definition)' : ''),
    }));
  });

  /* ── Dialog: open / save / cancel ── */

  addRow() {
    this.table.clearFilters();
    this.editing.set({
      uid: null, stepId: '', stepLabel: '', fieldActivations: [], condKey: null, condKind: 'show', condClauses: [],
      fillStepId: '', fillFieldKey: '',
    });
  }

  openEdit(row: DefRow) {
    this.editing.set({
      uid: row.uid,
      stepId: row.stepId,
      stepLabel: row.stepLabel,
      fieldActivations: row.fieldActivations.map(copyActivation),
      condKey: null,
      condKind: 'show',
      condClauses: [],
      fillStepId: '',
      fillFieldKey: '',
    });
  }

  saveEdit() {
    const e = this.editing();
    if (!e) return;
    if (!e.stepId) {
      this.toast.add({ severity: 'warn', summary: 'Pick a step', life: 3000 });
      return;
    }

    /* commit any open condition editor first */
    if (e.condKey) this.applyCondClauses(e);

    const updated = this.toRow(e.stepId, e.fieldActivations);

    if (e.uid) {
      this.rows.update(r => r.map(x => x.uid === e.uid ? { ...updated, uid: e.uid } : x));
    } else {
      this.rows.update(r => [...r, updated]);
    }

    this.persist();
    this.editing.set(null);
    this.toast.add({ severity: 'success', summary: 'Saved', detail: e.stepLabel, life: 3000 });
  }

  cancelEdit() {
    this.editing.set(null);
  }

  /* a step that already has a definition opens it for editing instead of starting blank */
  setEditStep(stepId: string) {
    const existing = this.rows().find(r => r.stepId === stepId);
    if (existing) { this.openEdit(existing); return; }
    this.editing.update(e => e ? { ...e, stepId, stepLabel: this.stepLabel(stepId), fieldActivations: [] } : null);
  }

  /* ── Delete / Reset ── */

  deleteRow(row: DefRow) {
    if (DEFAULT_STEP_FIELD_ACTIVATIONS.some(d => d.stepId === row.stepId)) {
      this.confirm.confirmDelete(`${row.stepLabel} (resets to defaults)`, () => {
        this.rows.update(r => r.map(x => x.uid === row.uid ? this.toRowFromDefaults(row.stepId, x.uid) : x));
        this.persist();
        this.toast.add({ severity: 'info', summary: 'Reset to defaults', detail: row.stepLabel, life: 3000 });
      });
    } else {
      this.confirm.confirmDelete(row.stepLabel, () => {
        this.rows.update(r => r.filter(x => x.uid !== row.uid));
        this.persist();
        this.toast.add({ severity: 'info', summary: 'Deleted', detail: row.stepLabel, life: 3000 });
      });
    }
  }

  private toRowFromDefaults(stepId: string, uid: string): DefRow {
    const def = DEFAULT_STEP_FIELD_ACTIVATIONS.find(d => d.stepId === stepId);
    const row = this.toRow(stepId, def?.fields ?? []);
    return { ...row, uid };
  }

  resetAll() {
    this.confirm.confirmDelete('all custom definitions', () => {
      resetStepFieldConfig();
      this.rows.set(this.buildRows());
      this.toast.add({ severity: 'info', summary: 'Reset to defaults', life: 3000 });
    });
  }

  /* ── Field toggles ── */

  hasField(key: string): boolean {
    return !!this.editing()?.fieldActivations.some(f => f.key === key);
  }

  /* fields the step's routing reads when it's signed (e.g. Repair Code) can't be removed */
  isLocked(key: string): boolean {
    const e = this.editing();
    return !!e?.stepId && isRoutingLockedField(e.stepId, key) && this.hasField(key);
  }

  toggleField(key: string) {
    if (this.isLocked(key)) return;
    this.editing.update(e => {
      if (!e) return e;
      const acts = e.fieldActivations;
      const idx = acts.findIndex(f => f.key === key);
      const next = idx >= 0 ? acts.filter(f => f.key !== key) : [...acts, { key }];
      /* close condition editor if the field was just removed */
      const condKey = (idx >= 0 && e.condKey === key) ? null : e.condKey;
      return { ...e, fieldActivations: next, condKey };
    });
  }

  /* ── Condition editor ── */

  private activation(key: string): FieldActivation {
    return this.editing()?.fieldActivations.find(a => a.key === key) ?? { key };
  }

  condLabel(key: string): string {
    return showRuleText(this.activation(key));
  }

  disabledLabel(key: string): string {
    return disabledRuleText(this.activation(key));
  }

  isRequired(key: string): boolean {
    return effectiveRequired(this.activation(key));
  }

  isBuiltIn(key: string): boolean {
    return hasBuiltInShowRule(key);
  }

  isReadOnly(key: string): boolean {
    return isAlwaysReadOnly(key);
  }

  isFixed(key: string): boolean {
    return hasFixedRules(key);
  }

  /* a fill rule needs a field the person could otherwise type into, drawn by the shared step form */
  canFill(key: string): boolean {
    return !hasFixedRules(key) && !isAlwaysReadOnly(key) && !lookupCatalogField(key)?.drawnByStepForm;
  }

  fillLabel(key: string): string {
    return fillRuleText(this.activation(key), id => this.stepLabel(id)) || 'Never filled from another step';
  }

  /* steps a fill can copy from: every other step with a definition */
  fillSteps = computed(() => {
    const own = this.editing()?.stepId;
    return this.rows().filter(r => r.stepId !== own).map(r => ({ stepId: r.stepId, stepLabel: r.stepLabel }));
  });

  /* the chosen source step's fields */
  fillSourceFields = computed(() => {
    const stepId = this.editing()?.fillStepId;
    if (!stepId) return [];
    const acts = this.rows().find(r => r.stepId === stepId)?.fieldActivations ?? getActivationForStep(stepId).fields;
    return acts.map(a => ({ key: a.key, label: lookupCatalogField(a.key)?.label ?? a.key }));
  });

  /* picking another step clears the field picked from the old one */
  setFillSource(partial: { fillStepId?: string; fillFieldKey?: string }) {
    this.editing.update(e => e ? { ...e, ...(partial.fillStepId !== undefined ? { fillFieldKey: '' } : {}), ...partial } : e);
  }

  setRequired(key: string, required: boolean) {
    this.editing.update(e => {
      if (!e) return e;
      const set = (acts: FieldActivation[]) => acts.map(a => {
        if (a.key !== key) return a;
        const { required: _old, ...rest } = a;
        const stored = requiredToStore(key, required);
        return stored === undefined ? rest : { ...rest, required: stored };
      });
      return { ...e, fieldActivations: set(e.fieldActivations) };
    });
  }

  isCondOpen(key: string, kind: CondKind = 'show'): boolean {
    const e = this.editing();
    return !!e && e.condKey === key && e.condKind === kind;
  }

  isAnyCondOpen(key: string): boolean {
    return this.editing()?.condKey === key;
  }

  toggleCondEditor(key: string, kind: CondKind = 'show') {
    this.editing.update(e => {
      if (!e) return e;
      if (e.condKey === key && e.condKind === kind) {
        /* closing: apply the current clauses first */
        this.applyCondClauses(e);
        return { ...e, condKey: null };
      }
      /* opening: save pending clauses for previously open field, then load new */
      if (e.condKey) this.applyCondClauses(e);
      const act = e.fieldActivations.find(a => a.key === key);
      const fill = act ? effectiveFill(act) : defaultFill(key);
      const current = kind === 'show' ? (act?.showIf ?? defaultShowIf(key))
        : kind === 'disabled' ? (act?.disabledIf ?? defaultDisabledIf(key)) : fill?.when;
      const clauses = current?.all.map(c => this.clauseToWork(c)) ?? [];
      return { ...e, condKey: key, condKind: kind, condClauses: clauses, fillStepId: fill?.stepId ?? '', fillFieldKey: fill?.fieldKey ?? '' };
    });
  }

  /* "one of" values (anyOf) are edited as a comma-separated list, e.g. "mt, pt" */
  private clauseToWork(c: ConditionClause): WorkClause {
    if (c.source === 'stepId') return { source: 'stepId', key: '', equals: c.matches };
    if (c.source === 'field' || c.source === 'jointDetail') return { source: c.source, key: c.key, equals: c.anyOf?.join(', ') ?? c.equals ?? '' };
    return { source: 'field', key: '', equals: '' };
  }

  private workToClause(w: WorkClause): ConditionClause {
    if (w.source === 'stepId') return { source: 'stepId', matches: w.equals };
    const values = w.equals.split(',').map(v => v.trim()).filter(Boolean);
    return values.length > 1 ? { source: w.source, key: w.key, anyOf: values } : { source: w.source, key: w.key, equals: w.equals };
  }

  private applyCondClauses(e: EditState) {
    if (!e.condKey) return;
    const clauses = e.condClauses.filter(c => c.source === 'stepId' ? !!c.equals : !!c.key).map(c => this.workToClause(c));
    if (e.condKind === 'fill') { this.applyFill(e, clauses); return; }
    const prop = e.condKind === 'show' ? 'showIf' : 'disabledIf';
    const condition = e.condKind === 'show' ? showIfToStore(e.condKey, clauses) : disabledIfToStore(e.condKey, clauses);

    const update = (acts: FieldActivation[]): FieldActivation[] =>
      acts.map(a => {
        if (a.key !== e.condKey) return a;
        const { [prop]: _old, ...rest } = a;
        return condition ? { ...rest, [prop]: condition } : rest;
      });

    e.fieldActivations = update(e.fieldActivations);
  }

  /* no source step or field = never filled */
  private applyFill(e: EditState, clauses: ConditionClause[]) {
    const fill = e.fillStepId && e.fillFieldKey ? { stepId: e.fillStepId, fieldKey: e.fillFieldKey, when: { all: clauses } } : undefined;
    const stored = fillToStore(e.condKey!, fill);
    e.fieldActivations = e.fieldActivations.map(a => {
      if (a.key !== e.condKey) return a;
      const { fill: _old, ...rest } = a;
      return stored === undefined ? rest : { ...rest, fill: stored };
    });
  }

  addClause() {
    this.editing.update(e => e ? { ...e, condClauses: [...e.condClauses, { source: 'field', key: '', equals: '' }] } : e);
  }

  removeClause(i: number) {
    this.editing.update(e => e ? { ...e, condClauses: e.condClauses.filter((_, idx) => idx !== i) } : e);
  }

  updateClause(i: number, partial: Partial<WorkClause>) {
    this.editing.update(e => {
      if (!e) return e;
      const clauses = e.condClauses.map((c, idx) => idx === i ? { ...c, ...partial } : c);
      return { ...e, condClauses: clauses };
    });
  }

  /* ── Persist + Export ── */

  private persist() {
    const config: StepFieldActivation[] = this.rows()
      .map(r => ({ stepId: r.stepId, fields: r.fieldActivations }));
    setStepFieldConfig(config);
  }

  exportCsv() {
    downloadCsv('signoff-type-definition', [
      { header: 'Step', value: (r: DefRow) => r.stepLabel },
      { header: 'Fields', value: (r: DefRow) => r.fieldLabels },
    ], this.table.sorted());
  }
}
