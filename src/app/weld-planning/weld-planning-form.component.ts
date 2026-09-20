import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { LucideSave, LucideX, LucideArrowLeft } from '@lucide/angular';

import { ToastService } from '../shared/toast.service';
import {
  addJointPlan, updateJointPlan, getJointPlan,
  JOINT_STATUS_OPTIONS, JOINT_TYPE_OPTIONS,
  adminJointDesigns, adminNdtOptions, adminPwhtOptions,
  type JointPlan, type JointStatus, type JointType
} from './weld-planning.data';

const PIPE_SIZES = ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"', '4"', '6"', '8"', '10"', '12"'];
const WALL_THICKNESSES = ['0.065"', '0.083"', '0.109"', '0.120"', '0.134"', '0.154"', '0.188"', '0.219"', '0.250"'];
const MATERIALS_1 = ['Carbon Steel', 'Stainless Steel 304', 'Stainless Steel 316', 'Alloy Steel', 'Aluminum'];
const MATERIALS_2 = ['E6010', 'E7018', 'ER70S-6', '308L SS', '316L SS'];
const WELD_TYPES = ['SMAW', 'GMAW', 'GTAW', 'FCAW'];
const WPS_POOL = ['WPS-001', 'WPS-002', 'WPS-003', 'WPS-004', 'WPS-005'];
const PROJECTS = ['PRJ-001', 'PRJ-002', 'PRJ-003', 'PRJ-004', 'PRJ-005'];
const JOINTS_POOL = ['J-001', 'J-002', 'J-003', 'J-004', 'J-005', 'J-006', 'J-007', 'J-008'];
const TECHNICIANS = ['Mike R.', 'Sara L.', 'Tom B.', 'Dave K.', 'Priya N.', 'Luis G.', 'Emma W.'];

@Component({
  selector: 'app-weld-planning-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideSave, LucideX, LucideArrowLeft],
  templateUrl: './weld-planning-form.component.html'
})
export class WeldPlanningFormComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  isEdit = signal(false);
  jointId = signal('');

  form: JointPlan = {
    id: '', jointNumber: '', projectNumber: '', joint: '',
    title: '', description: '',
    status: 'development', priority: 'medium', jointType: 'pipe',
    drawing: '', drawingRev: '',
    jointDesign: '', weldType: '', pipeSize: '', wallThickness: '',
    materialType1: '', materialType2: '', wps: '', ndt: '', pwht: '',
    assignedTo: '', estimatedHours: 0, notes: '',
    createdBy: 'User', createdAt: '', updatedAt: ''
  };

  isLocked = signal(false);

  statusOptions = JOINT_STATUS_OPTIONS;
  jointTypeOptions = JOINT_TYPE_OPTIONS;
  pipeSizes = PIPE_SIZES;
  wallThicknesses = WALL_THICKNESSES;
  materials1 = MATERIALS_1;
  materials2 = MATERIALS_2;
  weldTypes = WELD_TYPES;
  wpsPool = WPS_POOL;
  projects = PROJECTS;
  jointsPool = JOINTS_POOL;
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
        if (existing.status === 'locked') {
          this.isLocked.set(true);
          this.toast.add({ severity: 'warn', summary: 'Locked', detail: 'This joint plan is locked and cannot be edited' });
          this.router.navigate(['/weld-planning', id]);
        }
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

  cancel() {
    this.router.navigate(['/weld-planning']);
  }
}
