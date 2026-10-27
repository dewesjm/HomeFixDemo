/* Admin → Signoff Type Forms: one definition per Type (Admin > Signoff Types), plus
   Excavation NDT's own (one shared by every round). A row expands to one line per field, its rules
   stacked as Conditions | Behaviors; editing picks any field from the catalog and sets when it shows,
   when it's prepopulated (from a routing step, this step or the WTN), when it's disabled, and when it's
   required (Never / Always / When). The dialog's Layout list sets each field's and heading's line
   number (which also places Inspection Results) and the fields' widths, and a definition with
   verify-grid rows says what they're checked against. Conditions are AND/OR groups
   (field-condition-editor, condition-group-editor; their edits are written back by
   definition-edits.ts); the Layout list is definition-layout-list. Add's list is the Types; picking
   one that already has a definition edits it. Stored by step-field-config.ts. */
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucidePencil, LucideCheck, LucideTrash2,
  LucideChevronDown, LucideChevronRight,
} from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { TableState } from '../../../shared/table-state';
import { TableToolbarComponent } from '../../../shared/table-toolbar.component';
import { SortHeaderComponent } from '../../../shared/sort-header.component';
import { downloadCsv } from '../../../shared/export-csv';
import {
  DEFAULT_TYPE_DEFINITIONS,
  TypeDefinition,
  FieldActivation,
  getStepFieldConfig,
  setStepFieldConfig,
  resetStepFieldConfig,
  getActivationForStep,
  DECISION_KEY,
  definitionFields,
  type VerifyAgainst,
} from '../../signoff-definition/step-field-config';
import { FIELD_CATALOG, catalogFieldTypeLabel, isVerifyRow, lookupCatalogField } from '../../signoff-definition/field-catalog';
import { getTemplates } from '../../routing/stage-templates';
import {
  defaultShowIf,
  defaultDisabledIf,
  isAlwaysReadOnly,
  defaultRequiredIf,
  requiredRuleText,
  requiredMode,
  withRequiredMode,
  withRequiredMessage,
  standardRequiredMessage,
  showRuleText,
  disabledRuleText,
  hasBuiltInShowRule,
  hasFixedRules,
  defaultFill,
  effectiveFill,
  fillRuleText,
} from '../../signoff-definition/field-rules';
import { signoffTypeOptions } from '../../signoff-definition/signoff-types';
import { getRoutingSignoffTypes } from '../../signoff-definition/routing-signoff-types';
import { isDefinitionLockedField } from '../../signoff-definition/stage-rules';
import { drawnByOwnForm } from '../../signoff-definition/signoff-parts';
import { fieldRuleLines } from '../../signoff-definition/field-rule-lines';
import type { FieldRuleLine } from '../../signoff-definition/field-rule-lines';
import type { RequiredMode } from '../../signoff-definition/field-rules';
import { WTN_FILL_FIELDS } from '../../../data/procedures';
import { WorkGroup, conditionToWork } from './condition-work';
import { StepFieldChoice } from './condition-group-editor.component';
import { CondKind, OpenCondition, THIS_STEP, WTN, applyOpenCondition, copyActivation, fillSourceId } from './definition-edits';
import { FieldConditionEditorComponent } from './field-condition-editor.component';
import { DefinitionLayoutListComponent } from './definition-layout-list.component';
import { withNewField } from '../../signoff-definition/definition-layout';

interface DefRow {
  uid: string;
  typeId: string;
  typeLabel: string;
  fieldLabels: string;          // flat text used for table search
  fieldActivations: FieldActivation[];
  fieldRules: { key: string; label: string; typeLabel: string; lines: FieldRuleLine[] }[];
  verifyAgainst?: VerifyAgainst;
}

/* the dialog's working copy of a definition, with the condition editor open on at most one field */
interface EditState extends OpenCondition {
  uid: string | null;   /* null = new row */
  typeId: string;
  typeLabel: string;
  fieldActivations: FieldActivation[];
  verifyAgainst?: VerifyAgainst;
}

let seq = 0;

@Component({
  selector: 'app-admin-signoff-type-definition',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableToolbarComponent, SortHeaderComponent,
    FieldConditionEditorComponent, DefinitionLayoutListComponent,
    LucidePencil, LucideCheck, LucideTrash2, LucideChevronDown, LucideChevronRight,
  ],
  templateUrl: './admin-signoff-type-definition.component.html',
})
export class AdminSignoffTypeDefinitionComponent {
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  /* every catalog field can be on any step */
  fieldChoices = FIELD_CATALOG.map(f => ({ key: f.key, label: f.label, typeLabel: catalogFieldTypeLabel(f) }));
  /* the Fields list's search box: fields whose name contains it, any case */
  fieldSearch = signal('');
  shownFieldChoices = computed(() => {
    const text = this.fieldSearch().trim().toLowerCase();
    return text ? this.fieldChoices.filter(f => f.label.toLowerCase().includes(text)) : this.fieldChoices;
  });

  /* Routing sources for Prepopulated from, and the Types whose forms can be edited. */
  private readonly routingSteps = (getTemplates()['Welding'] ?? []).map(s => ({ stepId: s.id, stepLabel: s.label }));
  private readonly types = [
    ...getRoutingSignoffTypes().map(t => ({ typeId: t.value, typeLabel: t.label })),
  ];

  rows = signal<DefRow[]>([]);
  editing = signal<EditState | null>(null);
  table = new TableState<DefRow>(['typeLabel', 'fieldLabels']);

  constructor() {
    this.rows.set(this.buildRows());
    effect(() => this.table.setRows(this.rows()));
  }

  /* ── Table rows ── */

  private stepLabel(stepId: string): string {
    return this.routingSteps.find(s => s.stepId === stepId)?.stepLabel ?? stepId;
  }

  private typeLabel(typeId: string): string {
    return this.types.find(t => t.typeId === typeId)?.typeLabel ?? `${typeId} (not in Signoff Types)`;
  }

  /* every Type with a seeded definition, merged with any stored overrides, then any other stored ones */
  private buildRows(): DefRow[] {
    const stored = getStepFieldConfig();
    const rows: DefRow[] = DEFAULT_TYPE_DEFINITIONS.map(def => {
      const act = stored.find(a => a.typeId === def.typeId) ?? def;
      return this.toRow(def.typeId, act.fields, act.verifyAgainst ?? def.verifyAgainst);
    });
    for (const act of stored) {
      if (!DEFAULT_TYPE_DEFINITIONS.some(d => d.typeId === act.typeId)) rows.push(this.toRow(act.typeId, act.fields, act.verifyAgainst));
    }
    return rows;
  }

  private toRow(typeId: string, fields: FieldActivation[], verifyAgainst?: VerifyAgainst): DefRow {
    const fieldRules = definitionFields(fields).map(f => ({
      key: f.key,
      label: lookupCatalogField(f.key)?.label ?? f.key,
      typeLabel: catalogFieldTypeLabel(lookupCatalogField(f.key) ?? { type: 'text' }),
      lines: fieldRuleLines(f, id => this.stepLabel(id)),
    }));
    return {
      uid: `sfd-${++seq}`,
      typeId,
      typeLabel: this.typeLabel(typeId),
      fieldLabels: fieldRules.map(f => f.label).join(', '),
      fieldActivations: fields.map(f => ({ ...f })),
      fieldRules,
      ...(verifyAgainst && { verifyAgainst }),
    };
  }

  /* rows expanded to their fields' rules, by Type (kept across saves) */
  expanded = signal(new Set<string>());

  toggleExpanded(typeId: string) {
    this.expanded.update(s => {
      const next = new Set(s);
      if (!next.delete(typeId)) next.add(typeId);
      return next;
    });
  }

  /* the Types (and Excavation NDT); ones that already have a definition say so */
  addableTypes = computed(() => {
    const used = new Set(this.rows().map(r => r.typeId));
    return this.types.map(t => ({ typeId: t.typeId, typeLabel: t.typeLabel + (used.has(t.typeId) ? ' (has a definition)' : '') }));
  });

  /* ── Dialog: open / save / cancel ── */

  addRow() {
    this.table.clearFilters();
    this.fieldSearch.set('');
    this.editing.set({
      uid: null, typeId: '', typeLabel: '', fieldActivations: [], condKey: null, condKind: 'show', condGroup: conditionToWork(undefined),
      fillStepId: '', fillFieldKey: '',
    });
  }

  openEdit(row: DefRow) {
    this.fieldSearch.set('');
    this.editing.set({
      uid: row.uid,
      typeId: row.typeId,
      typeLabel: row.typeLabel,
      fieldActivations: row.fieldActivations.map(copyActivation),
      verifyAgainst: row.verifyAgainst,
      condKey: null,
      condKind: 'show',
      condGroup: conditionToWork(undefined),
      fillStepId: '',
      fillFieldKey: '',
    });
  }

  saveEdit() {
    const e = this.editing();
    if (!e) return;
    if (!e.typeId) {
      this.toast.add({ severity: 'warn', summary: 'Pick a type', life: 3000 });
      return;
    }

    /* commit any open condition editor first */
    const fieldActivations = applyOpenCondition(e.fieldActivations, e);

    const updated = this.toRow(e.typeId, fieldActivations, this.hasVerifyRows(e) ? e.verifyAgainst ?? 'record' : undefined);

    if (e.uid) {
      this.rows.update(r => r.map(x => x.uid === e.uid ? { ...updated, uid: e.uid } : x));
    } else {
      this.rows.update(r => [...r, updated]);
    }

    this.persist();
    this.editing.set(null);
    this.toast.add({ severity: 'success', summary: 'Saved', detail: e.typeLabel, life: 3000 });
  }

  cancelEdit() {
    this.editing.set(null);
  }

  /* a Type that already has a definition opens it for editing instead of starting blank */
  setEditType(typeId: string) {
    const existing = this.rows().find(r => r.typeId === typeId);
    if (existing) { this.openEdit(existing); return; }
    this.editing.update(e => e ? { ...e, typeId, typeLabel: this.typeLabel(typeId), fieldActivations: [] } : null);
  }

  /* ── Delete / Reset ── */

  deleteRow(row: DefRow) {
    if (DEFAULT_TYPE_DEFINITIONS.some(d => d.typeId === row.typeId)) {
      this.confirm.confirmDelete(`${row.typeLabel} (resets to defaults)`, () => {
        this.rows.update(r => r.map(x => x.uid === row.uid ? this.toRowFromDefaults(row.typeId, x.uid) : x));
        this.persist();
        this.toast.add({ severity: 'info', summary: 'Reset to defaults', detail: row.typeLabel, life: 3000 });
      });
    } else {
      this.confirm.confirmDelete(row.typeLabel, () => {
        this.rows.update(r => r.filter(x => x.uid !== row.uid));
        this.persist();
        this.toast.add({ severity: 'info', summary: 'Deleted', detail: row.typeLabel, life: 3000 });
      });
    }
  }

  private toRowFromDefaults(typeId: string, uid: string): DefRow {
    const def = DEFAULT_TYPE_DEFINITIONS.find(d => d.typeId === typeId);
    const row = this.toRow(typeId, def?.fields ?? [], def?.verifyAgainst);
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
    return !!e?.typeId && isDefinitionLockedField(e.typeId, key) && this.hasField(key);
  }

  /* what taking a routing-read field off this step does (e.g. Release to welding), or that routing
     ignores it on this step */


  toggleField(key: string) {
    if (this.isLocked(key)) return;
    this.editing.update(e => {
      if (!e) return e;
      const acts = e.fieldActivations;
      const idx = acts.findIndex(f => f.key === key);
      const next = idx >= 0 ? acts.filter(f => f.key !== key) : withNewField(acts, key);
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

  /* While its condition editor is open the droplist stays on When, even before a clause is added */
  requiredModeOf(key: string): RequiredMode {
    return this.isCondOpen(key, 'required') ? 'when' : requiredMode(this.activation(key));
  }

  requiredMessageOf(key: string): string {
    return this.activation(key).requiredMessage ?? '';
  }

  /* the standard wording, shown in the empty Error message box */
  requiredMessagePlaceholder(key: string): string {
    const label = lookupCatalogField(key)?.label ?? key;
    return key.startsWith('affectedMicVerified') ? 'Please verify MIC for <item>' : standardRequiredMessage(key, label);
  }

  /* Degree of RT Performed's minimum (rt-degree-minimum.ts); '' = none */
  minimumOf(key: string): string {
    return this.activation(key).minimum ?? '';
  }

  setMinimum(key: string, minimum: string) {
    this.editing.update(e => e && { ...e, fieldActivations: e.fieldActivations.map(a => {
      if (a.key !== key) return a;
      const { minimum: _old, ...rest } = a;
      return minimum === 'jointRtDegree' ? { ...rest, minimum } : rest;
    }) });
  }

  setRequiredMessage(key: string, message: string) {
    this.editing.update(e => e && { ...e, fieldActivations: e.fieldActivations.map(a => a.key === key ? withRequiredMessage(a, message) : a) });
  }

  requiredLabel(key: string): string {
    return requiredRuleText(this.activation(key));
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

  /* a Prepopulated from rule needs a field the person could otherwise type into, drawn as an ordinary field of the step */
  canFill(key: string): boolean {
    return !hasFixedRules(key) && !isAlwaysReadOnly(key) && !drawnByOwnForm(this.editing()?.typeId ?? '', key);
  }

  fillLabel(key: string): string {
    return fillRuleText(this.activation(key), id => this.stepLabel(id));
  }

  /* what a field can be prepopulated from: this step, the WTN, and the routing steps */
  fillSteps = computed(() => [
    { stepId: THIS_STEP, stepLabel: 'This signoff' },
    { stepId: WTN, stepLabel: 'The WTN' },
    ...this.routingSteps,
  ]);

  /* the chosen source's fields: the WTN's WPS values, this step's other fields, or the fields of
     every Type that step offers */
  fillSourceFields = computed(() => {
    const e = this.editing();
    const sourceId = e?.fillStepId;
    if (!e || !sourceId) return [];
    if (sourceId === WTN) return WTN_FILL_FIELDS.map(f => ({ key: f.key, label: f.label }));
    const acts = sourceId === THIS_STEP ? e.fieldActivations.filter(a => a.key !== e.condKey)
      : (signoffTypeOptions(sourceId) ?? []).flatMap(o => this.rows().find(r => r.typeId === o.value)?.fieldActivations ?? getActivationForStep(o.value).fields);
    const keys = [...new Set(definitionFields(acts).map(a => a.key))];
    return keys.map(key => ({ key, label: lookupCatalogField(key)?.label ?? key }));
  });

  /* picking another step clears the field picked from the old one */
  setFillSource(partial: { fillStepId?: string; fillFieldKey?: string }) {
    this.editing.update(e => e ? { ...e, ...(partial.fillStepId !== undefined ? { fillFieldKey: '' } : {}), ...partial } : e);
  }

  /* When opens the condition editor; Never and Always close it without applying its clauses */
  setRequiredMode(key: string, mode: RequiredMode) {
    this.editing.update(e => {
      if (!e) return e;
      const editingRequired = e.condKey === key && e.condKind === 'required';
      if (mode === 'when' && editingRequired) return e;
      /* opening: apply the clauses of the editor that was open first */
      const current = mode === 'when' ? applyOpenCondition(e.fieldActivations, e) : e.fieldActivations;
      const fieldActivations = current.map(a => a.key === key ? withRequiredMode(a, mode) : a);
      if (mode !== 'when') return { ...e, fieldActivations, condKey: editingRequired ? null : e.condKey };
      const act = fieldActivations.find(a => a.key === key);
      const cond = act?.requiredIf ?? defaultRequiredIf(key);
      return { ...e, fieldActivations, condKey: key, condKind: 'required', condGroup: conditionToWork(cond) };
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
      /* closing, or opening another: apply the open editor's clauses first */
      const fieldActivations = applyOpenCondition(e.fieldActivations, e);
      if (e.condKey === key && e.condKind === kind) return { ...e, fieldActivations, condKey: null };
      const act = fieldActivations.find(a => a.key === key);
      const fill = act ? effectiveFill(act) : defaultFill(key);
      const current = kind === 'show' ? (act?.showIf ?? defaultShowIf(key))
        : kind === 'disabled' ? (act?.disabledIf ?? defaultDisabledIf(key))
        : kind === 'required' ? (act?.requiredIf ?? defaultRequiredIf(key)) : fill?.when;
      return { ...e, fieldActivations, condKey: key, condKind: kind, condGroup: conditionToWork(current), fillStepId: fillSourceId(fill), fillFieldKey: fill?.fieldKey ?? '' };
    });
  }

  setCondGroup(group: WorkGroup) {
    this.editing.update(e => e ? { ...e, condGroup: group } : e);
  }

  /* what a condition's "This step field" can test: Inspection Results (stored on the step itself),
     then the definition's own fields other than the one being edited; fields drawn their own way
     aren't in the step's values, so they're left out. Type is offered only on Excavation NDT, whose one
     definition serves every inspection kind. */
  condStepFields = computed((): StepFieldChoice[] => {
    const e = this.editing();
    if (!e) return [];
    const own = definitionFields(e.fieldActivations)
      .filter(a => a.key !== e.condKey && !drawnByOwnForm(e.typeId, a.key))
      .flatMap(a => {
        const cat = lookupCatalogField(a.key);
        if (!cat) return [];
        const values = cat.type === 'checkbox' ? [{ value: 'yes', label: 'Checked' }] : (cat.options ?? []).map(o => ({ value: o.value, label: o.label }));
        return [{ key: a.key, label: cat.label, values }];
      });
    const result = e.fieldActivations.some(a => a.key === DECISION_KEY)
      ? [{ key: 'result', label: 'Inspection Results (SAT/UNSAT)', values: [{ value: 'sat', label: 'SAT' }, { value: 'unsat', label: 'UNSAT' }] }] : [];
    return [...result, ...own];
  });

  /* ── Verify grid ── */

  hasVerifyRows(e: EditState): boolean {
    return e.fieldActivations.some(a => isVerifyRow(a.key));
  }

  setVerifyAgainst(value: VerifyAgainst) {
    this.editing.update(e => e ? { ...e, verifyAgainst: value } : e);
  }

  /* ── Edit window sections ── */

  /* Layout and Fields each collapse from their heading; both start open */
  layoutOpen = signal(true);
  fieldsOpen = signal(true);

  toggleSection(label: string) {
    const open = label === 'Layout' ? this.layoutOpen : this.fieldsOpen;
    open.set(!open());
  }

  /* ── Layout ── */

  setLayout(fieldActivations: FieldActivation[]) {
    this.editing.update(e => e ? { ...e, fieldActivations } : e);
  }

  /* ── Persist + Export ── */

  private persist() {
    const config: TypeDefinition[] = this.rows()
      .map(r => ({ typeId: r.typeId, fields: r.fieldActivations, ...(r.verifyAgainst && { verifyAgainst: r.verifyAgainst }) }));
    setStepFieldConfig(config);
  }

  exportCsv() {
    downloadCsv('signoff-type-definition', [
      { header: 'Type', value: (r: DefRow) => r.typeLabel },
      { header: 'Fields', value: (r: DefRow) => r.fieldLabels },
    ], this.table.sorted());
  }
}
