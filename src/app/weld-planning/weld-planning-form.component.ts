import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { LucideSave, LucideX, LucideArrowLeft } from '@lucide/angular';

import { ToastService } from '../shared/toast.service';
import {
  addWeldJoint, updateWeldJoint, getWeldJoint, NDT_FIELDS, NDT_MARKS,
  JOINT_STATUS_OPTIONS, JOINT_TYPE_OPTIONS,
  adminJointDesigns,
  type WeldJoint
} from './weld-planning.data';

const PIPE_SIZES = ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '2-1/2"', '3"', '4"', '6"', '8"', '10"', '12"'];
const WALL_THICKNESSES = ['0.065"', '0.083"', '0.109"', '0.120"', '0.134"', '0.154"', '0.188"', '0.219"', '0.250"'];
/* same codes as jobs.ts (see its MATERIALS_1/2 comment): 02-CS Carbon Steel, 12-SS304/13-SS316
   Stainless Steel, 04-AS Alloy Steel, 63-AL10 Aluminum */
const MATERIALS_1 = ['02-CS', '12-SS304', '13-SS316', '04-AS', '63-AL10'];
const MATERIALS_2 = ['01-E60', '02-E70', '03-ER70', '15-SS308', '16-SS316'];
const WELD_TYPES = ['SMAW', 'GMAW', 'GTAW', 'FCAW'];
const HULLS = ['K1001', 'K1002', 'K1003', 'K1004', 'K1005'];

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

  form: WeldJoint = {
    id: '', jointNumber: '', hull: '', joint: '',
    description: '',
    status: 'development', priority: 'medium', jointType: 'pipe',
    drawing: '', drawingRev: '',
    jointDesign: '', weldType: '', pipeSize: '', wallThickness: '',
    materialType1: '', materialType2: '',
    rtRoot: '', rtFinal: '', ndtRoot: '', ndtEach: '', ndtFinal: '', ut: '', vt: '',
    notes: '',
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
  hulls = HULLS;

  ndtFields = NDT_FIELDS;
  ndtMarks = NDT_MARKS;
  designOptions = adminJointDesigns;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.jointId.set(id);
      const existing = getWeldJoint(id);
      if (existing) {
        this.form = { ...existing };
        if (existing.status === 'locked') {
          this.isLocked.set(true);
          this.toast.add({ severity: 'warn', summary: 'Locked', detail: 'This joint is locked and cannot be edited' });
          this.router.navigate(['/weld-planning', id]);
        }
      } else {
        this.router.navigate(['/weld-planning']);
      }
    }
  }

  save() {
    if (!this.form.jointNumber) {
      this.toast.add({ severity: 'warn', summary: 'Required fields', detail: 'System is required' });
      return;
    }

    if (this.isEdit()) {
      updateWeldJoint(this.jointId(), this.form);
      this.toast.add({ severity: 'success', summary: 'Updated', detail: `${this.form.jointNumber} updated` });
    } else {
      const { id, createdAt, updatedAt, ...rest } = this.form;
      addWeldJoint(rest);
      this.toast.add({ severity: 'success', summary: 'Created', detail: `${this.form.jointNumber} created` });
    }
    this.router.navigate(['/weld-planning']);
  }

  cancel() {
    this.router.navigate(['/weld-planning']);
  }
}
