/* Admin → Signoff Type Definition: table of per-step field configurations.
   Each row is a routing step, or Repair / Excavation NDT (one row shared by every round); editing
   picks any field from the catalog and sets when it shows, when it's greyed out and whether it's required. Add's step list is the steps in
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
  FIELD_CATALOG, SIGNOFF_FIELD_CATALOG,
  getStepFieldConfig, setStepFieldConfig, resetStepFieldConfig,
  getTemplates, FieldSection, defaultShowIf, showIfToStore, defaultDisabledIf, disabledIfToStore, requiredToStore, isAlwaysReadOnly,
  showRuleText, disabledRuleText, effectiveRequired, hasBuiltInShowRule,
  getSignoffTypeRows, isRoutingLockedField, REPAIR_TYPE_ROW, EXCAVATION_TYPE_ROW,
} from '../../../data/workflow';
import type { ConditionClause, FieldCondition } from '../../../data/workflow';

interface DefRow {
  uid: string;
  stepId: string;
  stepLabel: string;
  fieldLabels: string;          // flat text used for table search
  signoffFieldLabels: string;
  fieldActivations: FieldActivation[];
  signoffFieldActivations: FieldActivation[];
}

type ClauseSrc = 'field' | 'jointDetail' | 'stepId';
/* which of a field's conditions the editor is changing */
type CondKind = 'show' | 'disabled';

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
  signoffFieldActivations: FieldActivation[];
  condKey: string | null;      /* field key whose condition editor is open */
  condSection: FieldSection;
  condKind: CondKind;
  condClauses: WorkClause[];   /* working copy of the open field's condition */
}

let seq = 0;

const copyCondition = (c?: FieldCondition): FieldCondition | undefined => c ? { all: c.all.map(x => ({ ...x })) } : undefined;
const copyActivation = (f: FieldActivation): FieldActivation =>
  ({ ...f, showIf: copyCondition(f.showIf), disabledIf: copyCondition(f.disabledIf) });

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

  readonly allFields = FIELD_CATALOG.map(f => ({ key: f.key, label: f.label }));
  readonly allSignoffFields = SIGNOFF_FIELD_CATALOG.map(f => ({ key: f.key, label: f.label }));

  private labelMap = this.buildLabelMap();

  rows = signal<DefRow[]>([]);
  editing = signal<EditState | null>(null);
  table = new TableState<DefRow>(['stepLabel', 'fieldLabels', 'signoffFieldLabels']);

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
    const storedIds = new Set(stored.map(a => a.stepId));

    /* all default steps */
    const rows: DefRow[] = DEFAULT_STEP_FIELD_ACTIVATIONS.map(def => {
      const act = stored.find(a => a.stepId === def.stepId) ?? def;
      return this.toRow(def.stepId, act.fields, act.signoffFields);
    });

    /* any custom stored steps not in the defaults */
    for (const act of stored) {
      if (!DEFAULT_STEP_FIELD_ACTIVATIONS.some(d => d.stepId === act.stepId)) {
        rows.push(this.toRow(act.stepId, act.fields, act.signoffFields));
      }
    }

    return rows;
  }

  private toRow(stepId: string, fields: FieldActivation[], signoffFields: FieldActivation[]): DefRow {
    return {
      uid: `sfd-${++seq}`,
      stepId,
      stepLabel: this.stepLabel(stepId),
      fieldLabels: fields.map(f => FIELD_CATALOG.find(c => c.key === f.key)?.label ?? f.key).join(', '),
      signoffFieldLabels: signoffFields.map(f => SIGNOFF_FIELD_CATALOG.find(c => c.key === f.key)?.label ?? f.key).join(', '),
      fieldActivations: fields.map(f => ({ ...f })),
      signoffFieldActivations: signoffFields.map(f => ({ ...f })),
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
    this.editing.set({ uid: null, stepId: '', stepLabel: '', fieldActivations: [], signoffFieldActivations: [], condKey: null, condSection: 'f', condKind: 'show', condClauses: [] });
  }

  openEdit(row: DefRow) {
    this.editing.set({
      uid: row.uid,
      stepId: row.stepId,
      stepLabel: row.stepLabel,
      fieldActivations: row.fieldActivations.map(copyActivation),
      signoffFieldActivations: row.signoffFieldActivations.map(copyActivation),
      condKey: null,
      condSection: 'f',
      condKind: 'show',
      condClauses: [],
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

    const updated = this.toRow(e.stepId, e.fieldActivations, e.signoffFieldActivations);

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
    this.editing.update(e => e ? { ...e, stepId, stepLabel: this.stepLabel(stepId), fieldActivations: [], signoffFieldActivations: [] } : null);
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
    const row = this.toRow(stepId, def?.fields ?? [], def?.signoffFields ?? []);
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

  hasSignoffField(key: string): boolean {
    return !!this.editing()?.signoffFieldActivations.some(f => f.key === key);
  }

  /* fields the step's routing reads when it's signed (e.g. Repair Code) can't be removed */
  isLocked(key: string): boolean {
    const e = this.editing();
    return !!e?.stepId && isRoutingLockedField(e.stepId, key) && (this.hasField(key) || this.hasSignoffField(key));
  }

  toggleField(key: string) {
    if (this.isLocked(key)) return;
    this.editing.update(e => {
      if (!e) return e;
      const acts = e.fieldActivations;
      const idx = acts.findIndex(f => f.key === key);
      const next = idx >= 0 ? acts.filter(f => f.key !== key) : [...acts, { key }];
      /* close condition editor if the field was just removed */
      const condKey = (idx >= 0 && e.condKey === key && e.condSection === 'f') ? null : e.condKey;
      return { ...e, fieldActivations: next, condKey };
    });
  }

  toggleSignoffField(key: string) {
    if (this.isLocked(key)) return;
    this.editing.update(e => {
      if (!e) return e;
      const acts = e.signoffFieldActivations;
      const idx = acts.findIndex(f => f.key === key);
      const next = idx >= 0 ? acts.filter(f => f.key !== key) : [...acts, { key }];
      const condKey = (idx >= 0 && e.condKey === key && e.condSection === 'sf') ? null : e.condKey;
      return { ...e, signoffFieldActivations: next, condKey };
    });
  }

  /* ── Condition editor ── */

  private activation(key: string, section: FieldSection): FieldActivation {
    const acts = section === 'f' ? this.editing()?.fieldActivations : this.editing()?.signoffFieldActivations;
    return acts?.find(a => a.key === key) ?? { key };
  }

  condLabel(key: string, section: FieldSection): string {
    return showRuleText(this.activation(key, section), section);
  }

  disabledLabel(key: string, section: FieldSection): string {
    return disabledRuleText(this.activation(key, section), section);
  }

  isRequired(key: string, section: FieldSection): boolean {
    return effectiveRequired(this.activation(key, section), section);
  }

  isBuiltIn(key: string, section: FieldSection): boolean {
    return hasBuiltInShowRule(key, section);
  }

  isReadOnly(key: string): boolean {
    return isAlwaysReadOnly(key);
  }

  setRequired(key: string, section: FieldSection, required: boolean) {
    this.editing.update(e => {
      if (!e) return e;
      const set = (acts: FieldActivation[]) => acts.map(a => {
        if (a.key !== key) return a;
        const { required: _old, ...rest } = a;
        const stored = requiredToStore(key, section, required);
        return stored === undefined ? rest : { ...rest, required: stored };
      });
      return section === 'f' ? { ...e, fieldActivations: set(e.fieldActivations) } : { ...e, signoffFieldActivations: set(e.signoffFieldActivations) };
    });
  }

  isCondOpen(key: string, section: FieldSection, kind: CondKind = 'show'): boolean {
    const e = this.editing();
    return !!e && e.condKey === key && e.condSection === section && e.condKind === kind;
  }

  isAnyCondOpen(key: string, section: FieldSection): boolean {
    const e = this.editing();
    return !!e && e.condKey === key && e.condSection === section;
  }

  toggleCondEditor(key: string, section: FieldSection, kind: CondKind = 'show') {
    this.editing.update(e => {
      if (!e) return e;
      if (e.condKey === key && e.condSection === section && e.condKind === kind) {
        /* closing: apply the current clauses first */
        this.applyCondClauses(e);
        return { ...e, condKey: null };
      }
      /* opening: save pending clauses for previously open field, then load new */
      if (e.condKey) this.applyCondClauses(e);
      const acts = section === 'f' ? e.fieldActivations : e.signoffFieldActivations;
      const act = acts.find(a => a.key === key);
      const current = kind === 'show' ? (act?.showIf ?? defaultShowIf(key, section)) : (act?.disabledIf ?? defaultDisabledIf(key));
      const clauses = current?.all.map(c => this.clauseToWork(c)) ?? [];
      return { ...e, condKey: key, condSection: section, condKind: kind, condClauses: clauses };
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
    const prop = e.condKind === 'show' ? 'showIf' : 'disabledIf';
    const condition = e.condKind === 'show' ? showIfToStore(e.condKey, e.condSection, clauses) : disabledIfToStore(e.condKey, clauses);

    const update = (acts: FieldActivation[]): FieldActivation[] =>
      acts.map(a => {
        if (a.key !== e.condKey) return a;
        const { [prop]: _old, ...rest } = a;
        return condition ? { ...rest, [prop]: condition } : rest;
      });

    if (e.condSection === 'f') e.fieldActivations = update(e.fieldActivations);
    else e.signoffFieldActivations = update(e.signoffFieldActivations);
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
      .map(r => ({ stepId: r.stepId, fields: r.fieldActivations, signoffFields: r.signoffFieldActivations }));
    setStepFieldConfig(config);
  }

  exportCsv() {
    downloadCsv('signoff-type-definition', [
      { header: 'Step', value: (r: DefRow) => r.stepLabel },
      { header: 'Fields', value: (r: DefRow) => r.fieldLabels },
      { header: 'Sign-off Fields', value: (r: DefRow) => r.signoffFieldLabels },
    ], this.table.sorted());
  }
}
