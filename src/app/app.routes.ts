/* route table */
import { Routes } from '@angular/router';
import { TableSearchComponent } from './table-search/table-search.component';
import { WorkHistoryComponent } from './work-history/work-history.component';
import { AdaptiveSearchComponent } from './adaptive-search/adaptive-search.component';
import { JobDetailComponent } from './job-detail/job-detail.component';
import { AdminStepsComponent } from './admin-steps/admin-steps.component';
import { AdminCharacteristicsComponent } from './admin-characteristics/admin-characteristics.component';
import { AdminConditionsComponent } from './admin-conditions/admin-conditions.component';
import { AdminMaterialsComponent } from './admin-materials/admin-materials.component';
import { AdminSetStepComponent } from './admin-set-step/admin-set-step.component';
import { AdminSignoffFieldsComponent } from './admin-signoff-fields/admin-signoff-fields.component';
import { AdminNdtComponent } from './admin-ndt/admin-ndt.component';
import { AdminLocationsComponent } from './admin-locations/admin-locations.component';


export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'table' },
  { path: 'table', component: TableSearchComponent, title: 'Job Search' },
  { path: 'history', component: WorkHistoryComponent, title: 'History' },
  { path: 'adaptive', component: AdaptiveSearchComponent, title: 'Advanced Search' },
  { path: 'admin/steps', component: AdminStepsComponent, title: 'Admin Routing' },
  { path: 'admin/characteristics', component: AdminCharacteristicsComponent, title: 'Characteristic Codes' },
  { path: 'admin/conditions', component: AdminConditionsComponent, title: 'Condition Codes' },
  { path: 'admin/materials', component: AdminMaterialsComponent, title: 'Materials' },
  { path: 'admin/set-step', component: AdminSetStepComponent, title: 'Set Step' },
  { path: 'admin/signoff-fields', component: AdminSignoffFieldsComponent, title: 'Signoff Fields' },
  { path: 'admin/ndt', component: AdminNdtComponent, title: 'NDT Configuration' },
  { path: 'admin/locations', component: AdminLocationsComponent, title: 'Locations' },

  { path: 'jobs/:id', component: JobDetailComponent, title: 'Job Details' },
  { path: '**', redirectTo: 'table' }
];
