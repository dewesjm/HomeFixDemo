/* Weld Engineering Admin - create/edit a Procedure: the fixed header fields, then a tick for each
   section in Admin > Procedure Sections and the fields of the ticked ones. Saving goes through the
   procedure service (procedure-service/procedure-service.ts), which runs every save check. */
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { LucideSave, LucideArrowLeft, LucidePlus, LucideX } from '@lucide/angular';

import { ToastService } from '../../../../shared/toast.service';
import {
  getProcedure, procedureName, PROCEDURE_STATUS_OPTIONS, WELD_PROCESSES, PROCESS_TYPES, type Procedure
} from '../../../../data/procedures';
import { getQualifications } from '../../../../weld-record/reference-data-service/reference-data-service';
import type { QualGroup } from '../../../../weld-record/qualifications-logic/qual-requirements';
import { QualGroupEditorComponent } from '../../../../weld-record/qual-group-editor/qual-group-editor.component';
import {
  procedureSections, sectionsOnProcedure, OVERRIDE_PARTS,
  type ExtraField, type OverrideValue, type RangeValue
} from '../../procedure-sections';
import { withAllFields, fieldChoices } from '../../procedure-field-values';
import { createProcedure, updateProcedure } from '../../procedure-service/procedure-service';
import { formFlex } from '../../procedure-field-width';
import { AppDatePipe } from '../../../../shared/date-format';

const EMPTY_FORM: Procedure = {
  title: '', status: 'draft',
  wtn: '', weldProcess: '',
  gwp: '', revision: '', effectiveDate: '',
  processType: '', application: '',
  rules: [], conditions: [],
  extraFields: {},
  sectionIds: [],
  revisionHistory: [],
  createdBy: 'User', createdAt: '', updatedAt: ''
};

@Component({
  selector: 'app-procedure-form',
  standalone: true,
  imports: [AppDatePipe, CommonModule, FormsModule, RouterLink, LucideSave, LucideArrowLeft, LucidePlus, LucideX, QualGroupEditorComponent],
  templateUrl: './procedure-form.component.html'
})
export class ProcedureFormComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  isEdit = signal(false);
  form: Procedure = { ...EMPTY_FORM };
  /* the GWP and WTN the edited procedure had when the form opened; both can be changed */
  private original = { gwp: '', wtn: '' };
  /* true when the procedure was Active at load time -- a revision note is then required to save any change */
  wasActive = false;
  revisionNote = '';

  statusOptions = PROCEDURE_STATUS_OPTIONS;
  weldProcesses = WELD_PROCESSES;
  processTypes = PROCESS_TYPES;
  allQuals = getQualifications().data.qualifications;
  sections = procedureSections;
  overrideParts = OVERRIDE_PARTS;
  /* each field's width (Admin > Procedure Sections) */
  flex = formFlex;

  /* pending text for each "add a new list item" input */
  newRule = '';
  newCondition = '';

  ngOnInit() {
    const gwp = this.route.snapshot.paramMap.get('gwp');
    const wtn = this.route.snapshot.paramMap.get('wtn');
    if (gwp && wtn) {
      this.isEdit.set(true);
      const existing = getProcedure(gwp, wtn);
      if (existing) {
        this.original = { gwp, wtn };
        this.form = {
          ...existing, rules: [...existing.rules], conditions: [...existing.conditions],
          revisionHistory: [...existing.revisionHistory], sectionIds: [...existing.sectionIds],
        };
        this.wasActive = existing.status === 'active';
      } else {
        this.router.navigate(['/weld-engineering/admin']);
      }
    } else {
      /* a new procedure starts with every section ticked */
      this.form.sectionIds = this.sections().map(s => s.id);
    }
    this.form.extraFields = withAllFields(this.sections(), this.form.extraFields);
  }

  /* the sections ticked for this procedure, with their numbers */
  sectionsOn() {
    return sectionsOnProcedure(this.form.sectionIds, this.sections());
  }

  /* unticking hides the section; its values stay in extraFields */
  toggleSection(id: string) {
    this.form.sectionIds = this.form.sectionIds.includes(id)
      ? this.form.sectionIds.filter(s => s !== id)
      : [...this.form.sectionIds, id];
  }

  /* typed views of one field's value, for binding its inputs */
  range(key: string): RangeValue { return this.form.extraFields[key] as RangeValue; }
  override(key: string): OverrideValue { return this.form.extraFields[key] as OverrideValue; }
  quals(key: string): QualGroup { return this.form.extraFields[key] as QualGroup; }
  picked(key: string): string[] { return this.form.extraFields[key] as string[]; }

  /* a list, multi or table field's choices; a picked inactive admin-table row stays listed */
  choices(f: ExtraField) {
    const v = this.form.extraFields[f.key];
    return fieldChoices(f, Array.isArray(v) ? v : typeof v === 'string' ? [v] : []);
  }

  togglePick(key: string, value: string) {
    const current = this.picked(key);
    this.form.extraFields[key] = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
  }

  addListItem(field: 'rules' | 'conditions', value: string) {
    const v = value.trim();
    if (!v) return;
    this.form[field] = [...this.form[field], v];
    if (field === 'rules') this.newRule = '';
    if (field === 'conditions') this.newCondition = '';
  }

  removeListItem(field: 'rules' | 'conditions', index: number) {
    this.form[field] = this.form[field].filter((_, i) => i !== index);
  }

  save() {
    const { createdAt, updatedAt, createdBy, revisionHistory, ...changes } = this.form;
    const result = this.isEdit()
      ? updateProcedure(this.original, changes, this.revisionNote, 'User')
      : createProcedure(changes, 'User');
    if (!result.ok) {
      this.toast.add({ severity: 'warn', summary: result.title, detail: result.error });
      return;
    }
    this.toast.add(this.isEdit()
      ? { severity: 'success', summary: 'Updated', detail: `${procedureName(this.form)} updated` }
      : { severity: 'success', summary: 'Created', detail: `${procedureName(this.form)} created` });
    this.router.navigate(['/weld-engineering/admin']);
  }

  cancel() {
    this.router.navigate(['/weld-engineering/admin']);
  }
}
