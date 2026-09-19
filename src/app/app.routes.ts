/* route table */
import { Routes } from '@angular/router';
import { canDeactivateGuard } from './shared/can-deactivate.guard';
import { TableSearchComponent } from './table-search/table-search.component';
import { WorkHistoryComponent } from './work-history/work-history.component';
import { AdaptiveSearchComponent } from './adaptive-search/adaptive-search.component';
import { JobDetailComponent } from './job-detail/job-detail.component';
import { AdminStepsComponent } from './admin-steps/admin-steps.component';
import { AdminCharacteristicsComponent } from './admin-characteristics/admin-characteristics.component';
import { AdminSetStepComponent } from './admin-set-step/admin-set-step.component';
import { AdminSignoffFieldsComponent } from './admin-signoff-fields/admin-signoff-fields.component';
import { AdminNdtComponent } from './admin-ndt/admin-ndt.component';
import { AdminLocationsComponent } from './admin-locations/admin-locations.component';
import { AdminStepOptionsComponent } from './admin-step-options/admin-step-options.component';
import { AdminWeldPositionsComponent } from './admin-weld-positions/admin-weld-positions.component';
import { AdminBannerComponent } from './admin-banner/admin-banner.component';
import { AdminJointDesignsComponent } from './admin-joint-designs/admin-joint-designs.component';
import { AdminTeamsComponent } from './admin-teams/admin-teams.component';
import { MyAssignmentsComponent } from './my-assignments/my-assignments.component';


export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'table' },
  { path: 'table', component: TableSearchComponent, title: 'Project Search' },
  { path: 'assignments', component: MyAssignmentsComponent, title: 'My Assignments' },
  { path: 'history', component: WorkHistoryComponent, title: 'History' },
  { path: 'adaptive', component: AdaptiveSearchComponent, title: 'Advanced Search' },
  { path: 'admin/steps', component: AdminStepsComponent, title: 'Admin Routing' },
  { path: 'admin/characteristics', component: AdminCharacteristicsComponent, title: 'Attribute Codes' },
  { path: 'admin/set-step', component: AdminSetStepComponent, title: 'Set Step' },
  { path: 'admin/signoff-fields', component: AdminSignoffFieldsComponent, title: 'Signoff Fields' },
  { path: 'admin/ndt', component: AdminNdtComponent, title: 'NDT Configuration' },
  { path: 'admin/locations',    component: AdminLocationsComponent,       title: 'Locations' },
  { path: 'admin/step-options', component: AdminStepOptionsComponent,     title: 'Step Options' },
  { path: 'admin/weld-positions', component: AdminWeldPositionsComponent, title: 'Weld Positions' },
  { path: 'admin/banner', component: AdminBannerComponent, title: 'Banner Message' },
  { path: 'admin/joint-designs', component: AdminJointDesignsComponent, title: 'Joint Designs' },
  { path: 'admin/teams', component: AdminTeamsComponent, title: 'Teams & Permissions' },

  { path: 'jobs/:id', component: JobDetailComponent, title: 'Project Details', canDeactivate: [canDeactivateGuard] },
  { path: '**', redirectTo: 'table' }
];
