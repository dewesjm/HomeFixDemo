/* route table */
import { Routes } from '@angular/router';
import { canDeactivateGuard } from './shared/can-deactivate.guard';
import { PipeSearchComponent } from './weld-record/pipe-search/pipe-search.component';
import { WorkHistoryComponent } from './weld-record/work-history/work-history.component';
import { AdaptiveSearchComponent } from './weld-record/adaptive-search/adaptive-search.component';
import { JointPageComponent } from './weld-record/joint-page/joint-page.component';
import { AdminRoutingComponent } from './weld-record/admin/admin-routing/admin-routing.component';
import { AdminCharacteristicsComponent } from './weld-record/admin/admin-characteristics/admin-characteristics.component';
import { AdminSetRoutingComponent } from './weld-record/admin/admin-set-routing/admin-set-routing.component';
import { AdminSignoffFieldsComponent } from './weld-record/admin/admin-signoff-fields/admin-signoff-fields.component';
import { AdminNdtComponent } from './weld-record/admin/admin-ndt/admin-ndt.component';
import { AdminLocationsComponent } from './weld-record/admin/admin-locations/admin-locations.component';
import { AdminRoutingOptionsComponent } from './weld-record/admin/admin-routing-options/admin-routing-options.component';
import { AdminWeldPositionsComponent } from './weld-record/admin/admin-weld-positions/admin-weld-positions.component';
import { AdminBannerComponent } from './weld-record/admin/admin-banner/admin-banner.component';
import { AdminJointDesignsComponent } from './weld-record/admin/admin-joint-designs/admin-joint-designs.component';
import { AdminTeamsComponent } from './weld-record/admin/admin-teams/admin-teams.component';
import { AdminMaterialTraceabilityComponent } from './weld-record/admin/admin-material-traceability/admin-material-traceability.component';
import { AdminQuickLinksComponent } from './weld-record/admin/admin-quick-links/admin-quick-links.component';
import { MyAssignmentsComponent } from './weld-record/my-assignments/my-assignments.component';
import { WeldPlanningListComponent } from './weld-planning/weld-planning-list.component';
import { WeldPlanningFormComponent } from './weld-planning/weld-planning-form.component';
import { WeldPlanningDetailComponent } from './weld-planning/weld-planning-detail.component';
import { WeldPlanningAdminComponent } from './weld-planning/weld-planning-admin.component';
import { WeldPlanningMassEditComponent } from './weld-planning/weld-planning-mass-edit.component';
import { WeldPlanningSearchComponent } from './weld-planning/weld-planning-search.component';


export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'pipe-search' },
  { path: 'pipe-search', component: PipeSearchComponent, title: 'EWR — Hull Search' },
  { path: 'assignments', component: MyAssignmentsComponent, title: 'EWR — My Assignments' },
  { path: 'history', component: WorkHistoryComponent, title: 'EWR — History' },
  { path: 'adaptive', component: AdaptiveSearchComponent, title: 'EWR — Advanced Search' },
  { path: 'admin/routing', component: AdminRoutingComponent, title: 'EWR — Admin Routing' },
  { path: 'admin/characteristics', component: AdminCharacteristicsComponent, title: 'EWR — Attribute Codes' },
  { path: 'admin/set-routing', component: AdminSetRoutingComponent, title: 'EWR — Set Routing' },
  { path: 'admin/signoff-fields', component: AdminSignoffFieldsComponent, title: 'EWR — Signoff Fields' },
  { path: 'admin/ndt', component: AdminNdtComponent, title: 'EWR — NDT Configuration' },
  { path: 'admin/locations',    component: AdminLocationsComponent,       title: 'EWR — Locations' },
  { path: 'admin/routing-options', component: AdminRoutingOptionsComponent,     title: 'EWR — Routing Options' },
  { path: 'admin/weld-positions', component: AdminWeldPositionsComponent, title: 'EWR — Weld Positions' },
  { path: 'admin/banner', component: AdminBannerComponent, title: 'EWR — Banner Message' },
  { path: 'admin/joint-designs', component: AdminJointDesignsComponent, title: 'EWR — Joint Designs' },
  { path: 'admin/teams', component: AdminTeamsComponent, title: 'EWR — Teams & Permissions' },
  { path: 'admin/material-traceability', component: AdminMaterialTraceabilityComponent, title: 'EWR — Material Traceability' },
  { path: 'admin/quick-links', component: AdminQuickLinksComponent, title: 'EWR — Quick Links' },

  { path: 'jobs/:id', component: JointPageComponent, title: 'EWR — Hull Details', canDeactivate: [canDeactivateGuard] },

  /* ── Weld Planning routes (separate system) ── */
  { path: 'weld-planning', component: WeldPlanningListComponent, title: 'EWP — Weld Planning' },
  { path: 'weld-planning/new', component: WeldPlanningFormComponent, title: 'EWP — Create Joint' },
  { path: 'weld-planning/search', component: WeldPlanningSearchComponent, title: 'EWP — Advanced Search' },
  { path: 'weld-planning/admin', component: WeldPlanningAdminComponent, title: 'EWP — Admin' },
  { path: 'weld-planning/import', component: WeldPlanningMassEditComponent, title: 'EWP — Mass Import Joints' },
  { path: 'weld-planning/:id', component: WeldPlanningDetailComponent, title: 'EWP — Joint Details' },
  { path: 'weld-planning/:id/edit', component: WeldPlanningFormComponent, title: 'EWP — Edit Joint' },

  { path: '**', redirectTo: 'pipe-search' }
];
