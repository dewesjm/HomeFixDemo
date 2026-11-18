/* Weld Engineering Admin - Services: try the calls made to Weld Engineering and see each response. The
   calls are in procedure-service/: procedure-service.ts (procedures), section-service.ts (section and
   field definitions), procedure-file-service.ts (export and load template) and
   procedure-catalog-service.ts (material and filler choices); rules/ lists them for the shared service
   tester. The main reads are starred and listed first; the writes follow. The Filter and Fields
   droplists come from getProcedureFields, as another system would get them. */
import { Component } from '@angular/core';

import { procedures } from '../../../../data/procedures';
import { ServiceTesterPanelComponent } from '../../../../shared/service-tester-panel/service-tester-panel.component';
import { procedureSections } from '../../procedure-sections';
import { procedureServiceOperations } from './rules/procedure-service-operations';
import { sectionServiceOperations } from './rules/section-service-operations';
import { getProcedureFields } from '../../procedure-service/section-service';

@Component({
  selector: 'app-weld-engineering-services',
  standalone: true,
  imports: [ServiceTesterPanelComponent],
  template: `
    <div class="table-page-wrap" style="max-width: 72rem">
      <h2 class="section-title">Services</h2>
      <p class="text-sm mb-sm">
        Read and change procedures and their field definitions, look up material choices, or download
        files. Starred calls are the main ones. Run a call to see its inputs and response.
      </p>
      <app-service-tester-panel [operations]="operations" />
    </div>
  `
})
export class ServicesComponent {
  /* the inputs start on the first Active procedure */
  private example = procedures().find(p => p.status === 'active') ?? procedures()[0];
  private exampleKey = { gwp: this.example?.gwp ?? '', wtn: this.example?.wtn ?? '' };
  /* the section inputs start on the first section and its first field that isn't locked */
  private section = procedureSections()[0];
  private field = procedureSections().flatMap(s => s.fields).find(f => !f.locked);
  private fields = (r => (r.ok ? r.data.fields : []))(getProcedureFields());
  operations = [
    ...procedureServiceOperations(this.exampleKey, this.fields),
    ...sectionServiceOperations({
      sectionId: this.section?.id ?? '', sectionName: this.section?.name ?? '',
      fieldKey: this.field?.key ?? '', fieldLabel: this.field?.label ?? '',
    }),
  ];
}
