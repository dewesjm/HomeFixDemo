/* Weld Engineering Admin - create/edit a Procedure. */
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { LucideSave, LucideArrowLeft, LucidePlus, LucideX } from '@lucide/angular';

import { ToastService } from '../../../shared/toast.service';
import {
  addProcedure, updateProcedure, getProcedure, PROCEDURE_STATUS_OPTIONS, WTN_POOL, WELD_PROCESSES,
  type Procedure
} from '../../../data/procedures';

const EMPTY_FORM: Procedure = {
  id: '', title: '', status: 'draft',
  wtns: [], weldProcess: '',
  phMin: '', phMax: '', ipMin: '', ipMax: '',
  overridePhMin: '', overridePhMax: '', overrideIpMin: '', overrideIpMax: '', overrideNote: '',
  rules: [], conditions: [], qualificationsRequired: [],
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

  statusOptions = PROCEDURE_STATUS_OPTIONS;
  wtnPool = WTN_POOL;
  weldProcesses = WELD_PROCESSES;

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
        this.form = { ...existing, wtns: [...existing.wtns], rules: [...existing.rules], conditions: [...existing.conditions], qualificationsRequired: [...existing.qualificationsRequired] };
      } else {
        this.router.navigate(['/weld-engineering/admin']);
      }
    }
  }

  toggleWtn(wtn: string, checked: boolean) {
    this.form.wtns = checked ? [...this.form.wtns, wtn] : this.form.wtns.filter(w => w !== wtn);
  }

  addListItem(field: 'rules' | 'conditions' | 'qualificationsRequired', value: string) {
    const v = value.trim();
    if (!v) return;
    this.form[field] = [...this.form[field], v];
    if (field === 'rules') this.newRule = '';
    if (field === 'conditions') this.newCondition = '';
    if (field === 'qualificationsRequired') this.newQualification = '';
  }

  removeListItem(field: 'rules' | 'conditions' | 'qualificationsRequired', index: number) {
    this.form[field] = this.form[field].filter((_, i) => i !== index);
  }

  save() {
    if (!this.form.id.trim()) {
      this.toast.add({ severity: 'warn', summary: 'Required fields', detail: 'Procedure ID is required' });
      return;
    }
    if (this.isEdit()) {
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
