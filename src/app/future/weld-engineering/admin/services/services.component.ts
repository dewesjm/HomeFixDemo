/* Weld Engineering Admin - Services: try the calls other systems make to Weld Engineering and see
   each response. The calls are procedure-service/procedure-service.ts; rules/procedure-service-operations.ts
   lists them for the shared service tester. */
import { Component } from '@angular/core';

import { procedures } from '../../../../data/procedures';
import { ServiceTesterPanelComponent } from '../../../../shared/service-tester-panel/service-tester-panel.component';
import { procedureServiceOperations } from './rules/procedure-service-operations';

@Component({
  selector: 'app-weld-engineering-services',
  standalone: true,
  imports: [ServiceTesterPanelComponent],
  template: `
    <div class="table-page-wrap" style="max-width: 72rem">
      <h2 class="section-title">Services</h2>
      <p class="text-sm mb-sm">
        The calls other systems make to Weld Engineering. Run one to see its exact response.
        Calls marked Changes data really change the procedure.
      </p>
      <app-service-tester-panel [operations]="operations" />
    </div>
  `
})
export class ServicesComponent {
  /* the inputs start on the first Active procedure */
  private example = procedures().find(p => p.status === 'active') ?? procedures()[0];
  operations = procedureServiceOperations({ gwp: this.example?.gwp ?? '', wtn: this.example?.wtn ?? '' });
}
