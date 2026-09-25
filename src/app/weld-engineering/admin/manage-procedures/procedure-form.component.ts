/* Weld Engineering Admin - create/edit a Procedure. */
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { LucideSave, LucideArrowLeft, LucidePlus, LucideX } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import { getWeldPositions } from '../../../data/workflow';
import {
  addProcedure, updateProcedure, getProcedure, procedures, PROCEDURE_STATUS_OPTIONS, WELD_PROCESSES,
  PROCESS_TYPES, BASE_METAL_1_TYPES, BASE_METAL_2_TYPES, FILLER_METAL_TYPES, FILLER_METAL_TYPE_OPTIONS,
  FILLER_METAL_SIZE_OPTIONS, JOINT_TYPES, BACKING_OPTIONS, WELD_PROGRESSIONS, CURRENT_TYPES,
  type Procedure
} from '../../../data/procedures';
import { QUALIFICATIONS } from '../../../data/qualifications';

const EMPTY_FORM: Procedure = {
  id: '', title: '', status: 'draft',
  wtn: '', weldProcess: '',
  gwp: '', wpsRev: '', effectiveDate: '',
  processType: '', application: '',
  baseMetal1Type: '', baseMetal2Type: '', baseMetalThicknessMin: '', baseMetalThicknessMax: '',
  jointType: '', grooveAngle: '', rootOpening: '', backing: '',
  weldPosition: '', weldProgression: '',
  fillerMetalTypes: [], fillerMetalClassification: '', fillerMetalSizes: [],
  phMin: '', phMax: '', ipMin: '', ipMax: '',
  overridePhMin: '', overridePhMax: '', overrideIpMin: '', overrideIpMax: '', overrideNote: '',
  currentType: '', powerSource: '',
  shieldingGas: '', gasFlowRate: '', backingGas: '',
  heatInputMin: '', heatInputMax: '',
  amperageRange: '', voltageRange: '', travelSpeedRange: '',
  pwhtTemp: '', pwhtTime: '',
  rules: [], conditions: [], qualificationsRequired: [],
  revisionHistory: [],
  createdBy: 'User', createdAt: '', updatedAt: ''
};

@Component({
  selector: 'app-procedure-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideSave, LucideArrowLeft, LucidePlus, LucideX],
  templateUrl: './procedure-form.component.html'
})
export class ProcedureFormComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  isEdit = signal(false);
  form: Procedure = { ...EMPTY_FORM };
  /* true when the procedure was Active at load time -- a revision note is then required to save any change */
  wasActive = false;
  revisionNote = '';

  statusOptions = PROCEDURE_STATUS_OPTIONS;
  weldProcesses = WELD_PROCESSES;
  processTypes = PROCESS_TYPES;
  baseMetal1Types = BASE_METAL_1_TYPES;
  baseMetal2Types = BASE_METAL_2_TYPES;
  fillerMetalClassificationOptions = FILLER_METAL_TYPES;
  fillerMetalTypeOptions = FILLER_METAL_TYPE_OPTIONS;
  fillerMetalSizeOptions = FILLER_METAL_SIZE_OPTIONS;
  jointTypes = JOINT_TYPES;
  backingOptions = BACKING_OPTIONS;
  weldProgressions = WELD_PROGRESSIONS;
  currentTypes = CURRENT_TYPES;
  weldPositions = getWeldPositions();

  /* pending text for each "add a new list item" input */
  newRule = '';
  newCondition = '';
  newQualification = '';

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      const existing = getProcedure(id);
      if (existing) {
        this.form = {
          ...existing, rules: [...existing.rules], conditions: [...existing.conditions],
          qualificationsRequired: [...existing.qualificationsRequired], revisionHistory: [...existing.revisionHistory],
          fillerMetalTypes: [...existing.fillerMetalTypes], fillerMetalSizes: [...existing.fillerMetalSizes]
        };
        this.wasActive = existing.status === 'active';
      } else {
        this.router.navigate(['/weld-engineering/admin']);
      }
    }
  }

  addListItem(field: 'rules' | 'conditions' | 'qualificationsRequired', value: string) {
    const v = value.trim();
    if (!v) return;
    this.form[field] = [...this.form[field], v];
    if (field === 'rules') this.newRule = '';
    if (field === 'conditions') this.newCondition = '';
    if (field === 'qualificationsRequired') this.newQualification = '';
  }

  /* the WELD4xx quals not already on this WPS (data/qualifications.ts) */
  availableQuals(): string[] {
    return QUALIFICATIONS.filter(q => !this.form.qualificationsRequired.includes(q));
  }

  removeListItem(field: 'rules' | 'conditions' | 'qualificationsRequired', index: number) {
    this.form[field] = this.form[field].filter((_, i) => i !== index);
  }

  /* Filler Metal Type/Size: checkbox lists against the fixed option sets, not free text -- these
     are what Weld Record's Filler Metal Type/Size fields filter to once this WPS is selected. */
  toggleFillerMetalType(value: string) {
    this.form.fillerMetalTypes = this.form.fillerMetalTypes.includes(value)
      ? this.form.fillerMetalTypes.filter(v => v !== value)
      : [...this.form.fillerMetalTypes, value];
  }

  toggleFillerMetalSize(value: string) {
    this.form.fillerMetalSizes = this.form.fillerMetalSizes.includes(value)
      ? this.form.fillerMetalSizes.filter(v => v !== value)
      : [...this.form.fillerMetalSizes, value];
  }

  save() {
    if (!this.form.id.trim()) {
      this.toast.add({ severity: 'warn', summary: 'Required fields', detail: 'Procedure ID is required' });
      return;
    }
    if (!this.form.gwp.trim() || !this.form.wtn.trim()) {
      this.toast.add({ severity: 'warn', summary: 'Required fields', detail: 'GWP and WTN are required' });
      return;
    }
    const gwpWtnClash = procedures().find(p => p.id !== this.form.id && p.gwp === this.form.gwp && p.wtn === this.form.wtn);
    if (gwpWtnClash) {
      this.toast.add({ severity: 'warn', summary: 'Duplicate GWP/WTN', detail: `${gwpWtnClash.id} already covers GWP ${this.form.gwp} / WTN ${this.form.wtn}` });
      return;
    }
    /* base metal is fixed per GWP (it's what filters the GWP droplist in Weld Record by the job's
       Material Type 1/2) -- every WPS sharing a GWP must agree on it */
    const baseMetalMismatch = procedures().find(p =>
      p.id !== this.form.id && p.gwp === this.form.gwp
      && (p.baseMetal1Type !== this.form.baseMetal1Type || p.baseMetal2Type !== this.form.baseMetal2Type)
    );
    if (baseMetalMismatch) {
      this.toast.add({
        severity: 'warn', summary: 'Base metal mismatch',
        detail: `GWP ${this.form.gwp} is already ${baseMetalMismatch.baseMetal1Type} / ${baseMetalMismatch.baseMetal2Type} (see ${baseMetalMismatch.id})`
      });
      return;
    }
    if (this.isEdit() && this.wasActive && !this.revisionNote.trim()) {
      this.toast.add({ severity: 'warn', summary: 'Revision note required', detail: 'This procedure is Active -- describe the change before saving' });
      return;
    }
    if (this.isEdit()) {
      if (this.wasActive) {
        this.form.revisionHistory = [
          ...this.form.revisionHistory,
          { wpsRev: this.form.wpsRev, date: new Date().toISOString().slice(0, 10), note: this.revisionNote.trim(), by: 'User' }
        ];
      }
      const { id, createdAt, updatedAt, ...rest } = this.form;
      updateProcedure(id, rest);
      this.toast.add({ severity: 'success', summary: 'Updated', detail: `${this.form.id} updated` });
    } else {
      if (getProcedure(this.form.id)) {
        this.toast.add({ severity: 'warn', summary: 'Duplicate ID', detail: `${this.form.id} already exists` });
        return;
      }
      const { createdAt, updatedAt, ...rest } = this.form;
      addProcedure(rest);
      this.toast.add({ severity: 'success', summary: 'Created', detail: `${this.form.id} created` });
    }
    this.router.navigate(['/weld-engineering/admin']);
  }

  cancel() {
    this.router.navigate(['/weld-engineering/admin']);
  }
}
