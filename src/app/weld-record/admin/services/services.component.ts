/* Admin > Services: try the calls made to Weld Record and see each response. The calls are
   defined in joint-service/ and reference-data-service/. The rules/ folder lists them for the shared tester. */
import { Component, computed, inject } from '@angular/core';

import { MakeupService } from '../../services/makeup.service';
import { makeupServiceOperations } from './rules/makeup-service-operations';
import { ViewerService } from '../../access-logic/viewer.service';
import { JOBS } from '../../../data/jobs';
import { ServiceTesterPanelComponent } from '../../../shared/service-tester-panel/service-tester-panel.component';
import { JointService } from '../../joint-service/joint-service';
import { jointRecordOperations, jointRoutingOperations, jointServiceOperations, jointSignoffOperations } from './rules/joint-service-operations';
import { JointRecordEditsService } from '../../joint-service/joint-record-edits.service';
import { JointRoutingWritesService } from '../../joint-service/joint-routing-writes.service';
import { JointSignoffService } from '../../joint-service/joint-signoff.service';
import { referenceDataServiceOperations } from './rules/reference-data-service-operations';
import { offlineServiceOperations } from './rules/offline-service-operations';
import { OfflinePreparationService } from '../../offline-logic/offline-preparation.service';

@Component({
  selector: 'app-admin-services',
  standalone: true,
  imports: [ServiceTesterPanelComponent],
  template: `
    <div class="table-page-wrap" style="max-width: 72rem">
      <h2 class="section-title">Services</h2>
      <p class="text-sm mb-sm">
        Run Weld Record demo calls and see their inputs and responses. Use these examples as a
        design reference for the production services.
      </p>
      @if (operations().length) {
        <app-service-tester-panel [operations]="operations()" />
      } @else {
        <p>Switch to Developer to run service calls.</p>
      }
    </div>
  `
})
export class AdminServicesComponent {
  private readonly viewer = inject(ViewerService);
  private readonly makeupOperations = makeupServiceOperations(inject(MakeupService));
  /* the inputs start on the first joint */
  private example = JOBS[0];
  private svc = inject(JointService);
  private routing = inject(JointRoutingWritesService);
  private signoff = inject(JointSignoffService);
  private edits = inject(JointRecordEditsService);
  private offline = inject(OfflinePreparationService);
  /* the Filter droplist comes from getJointFields, as another system would get it */
  private fields = (r => (r.ok ? r.data.fields : []))(this.svc.getJointFields());
  private readonly apiOperations = [
    ...jointServiceOperations(this.svc, { hull: this.example?.hull, drawing: this.example?.drawing, joint: this.example?.joint }, this.fields),
    ...jointSignoffOperations(this.signoff, this.example),
    ...jointRoutingOperations(this.routing, this.example),
    ...jointRecordOperations(this.edits, this.example),
    ...offlineServiceOperations(this.offline, this.example),
    ...referenceDataServiceOperations,
  ];

  readonly operations = computed(() => {
    if (this.viewer.canAccessApi()) return [...this.apiOperations, ...this.makeupOperations];
    return this.viewer.canManageMakeup() ? this.makeupOperations : [];
  });
}
