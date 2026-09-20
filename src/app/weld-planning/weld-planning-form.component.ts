import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { LucideSave, LucideX } from '@lucide/angular';

import { ToastService } from '../shared/toast.service';
import {
  addJointPlan, updateJointPlan, getJointPlan,
  JOINT_STATUS_OPTIONS, JOINT_PRIORITY_OPTIONS,
  adminJointDesigns, adminNdtOptions, adminPwhtOptions,
  type JointPlan, type JointStatus, type JointPriority
} from './weld-planning.data';

const PIPE_SIZES = ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"', '4"', '6"', '8"', '10"', '12"'];
const WALL_THICKNESSES = ['0.065"', '0.083"', '0.109"', '0.120"', '0.134"', '0.154"', '0.188"', '0.219"', '0.250"'];
const MATERIALS_1 = ['Carbon Steel', 'Stainless Steel 304', 'Stainless Steel 316', 'Alloy Steel', 'Aluminum'];
const MATERIALS_2 = ['E6010', 'E7018', 'ER70S-6', '308L SS', '316L SS'];
const WELD_TYPES = ['SMAW', 'GMAW', 'GTAW', 'FCAW'];
const WPS_POOL = ['WPS-001', 'WPS-002', 'WPS-003', 'WPS-004', 'WPS-005'];
const LOCATIONS = ['Shop A', 'Shop B', 'Building 4', 'Field - Onsite', 'Drydock Bay 1', 'Drydock Bay 2'];
const TECHNICIANS = ['Mike R.', 'Sara L.', 'Tom B.', 'Dave K.', 'Priya N.', 'Luis G.', 'Emma W.'];

@Component({
  selector: 'app-weld-planning-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideSave, LucideX],
  templateUrl: './weld-planning-form.component.html'
})
export class WeldPlanningFormComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  isEdit = signal(false);
  jointId = signal('');

  form: JointPlan = {
    id: '', jointNumber: '', title: '', description: '',
    status: 'planned', priority: 'medium',
    jointDesign: '', weldType: '', pipeSize: '', wallThickness: '',
    materialType1: '', materialType2: '', wps: '', ndt: '', pwht: '',
    drawing: '', drawingRev: '', location: '', assignedTo: '',
    scheduledDate: '', estimatedHours: 0, notes: '',
    createdBy: 'User', createdAt: '', updatedAt: ''
  };

  statusOptions = JOINT_STATUS_OPTIONS;
  priorityOptions = JOINT_PRIORITY_OPTIONS;
  pipeSizes = PIPE_SIZES;
  wallThicknesses = WALL_THICKNESSES;
  materials1 = MATERIALS_1;
  materials2 = MATERIALS_2;
  weldTypes = WELD_TYPES;
  wpsPool = WPS_POOL;
  locations = LOCATIONS;
  technicians = TECHNICIANS;

  designOptions = adminJointDesigns;
  ndtOpts = adminNdtOptions;
  pwhtOpts = adminPwhtOptions;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.jointId.set(id);
      const existing = getJointPlan(id);
      if (existing) {
        this.form = { ...existing };
      } else {
        this.router.navigate(['/weld-planning']);
      }
    }
  }

  save() {
    if (!this.form.jointNumber || !this.form.title) {
      this.toast.add({ severity: 'warn', summary: 'Required fields', detail: 'Joint Number and Title are required' });
      return;
    }

    if (this.isEdit()) {
      updateJointPlan(this.jointId(), this.form);
      this.toast.add({ severity: 'success', summary: 'Updated', detail: `${this.form.jointNumber} updated` });
    } else {
      const { id, createdAt, updatedAt, ...rest } = this.form;
      addJointPlan(rest);
      this.toast.add({ severity: 'success', summary: 'Created', detail: `${this.form.jointNumber} created` });
    }
    this.router.navigate(['/weld-planning']);
  }

  scheduledDateValue(): string {
    if (!this.form.scheduledDate) return '';
    return this.form.scheduledDate.substring(0, 10);
  }

  onDateChange(val: string) {
    this.form.scheduledDate = val ? new Date(val).toISOString() : '';
  }

  cancel() {
    this.router.navigate(['/weld-planning']);
  }
}
