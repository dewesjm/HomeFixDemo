/* Admin > Services: try the calls made to Weld Record and see each response. The calls are
   weld-record/joint-service/joint-service.ts; rules/ lists them for the shared service tester. Reads
   only for now; which writes Weld Record offers is still open (Tasks.md). */
import { Component, inject } from '@angular/core';

import { JOBS } from '../../../data/jobs';
import { ServiceTesterPanelComponent } from '../../../shared/service-tester-panel/service-tester-panel.component';
import { JointService } from '../../joint-service/joint-service';
import { jointServiceOperations } from './rules/joint-service-operations';

@Component({
  selector: 'app-admin-services',
  standalone: true,
  imports: [ServiceTesterPanelComponent],
  template: `
    <div class="table-page-wrap" style="max-width: 72rem">
      <h2 class="section-title">Services</h2>
      <p class="text-sm mb-sm">
        Every call made to Weld Record, both the ones this application uses internally and the ones other
        systems can call: a joint, its routing and its History. Run one to see its exact response.
      </p>
      <app-service-tester-panel [operations]="operations" />
    </div>
  `
})
export class AdminServicesComponent {
  /* the inputs start on the first joint */
  private example = JOBS[0];
  operations = jointServiceOperations(inject(JointService), { hull: this.example?.hull, drawing: this.example?.drawing, joint: this.example?.joint });
}
