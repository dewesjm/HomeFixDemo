/* route table */
import { AdminRepairCodesComponent } from './weld-record/admin/repair-codes/repair-codes.component';
import { AdminWeldColorsComponent } from './weld-record/admin/weld-colors/weld-colors.component';
import { AdminServicesComponent } from './weld-record/admin/services/services.component';
import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { canDeactivateGuard } from './shared/can-deactivate.guard';
import { featureToggles } from './data/feature-toggles';
import { PipeWeldingClassicPageComponent } from './future/weld-record/pipe-welding-classic-page/pipe-welding-classic-page.component';
import { HistoryPageComponent } from './weld-record/history-page/history-page.component';
import { PipeWeldingPageComponent } from './weld-record/pipe-welding-page/pipe-welding-page.component';
import { JointPageComponent } from './weld-record/joint-page/joint-page.component';
import { AdminRoutingSettingsComponent } from './weld-record/admin/routing-settings/routing-settings.component';
import { AdminAttributeCodesComponent } from './weld-record/admin/attribute-codes/attribute-codes.component';
import { AdminAttributeCodeExceptionsComponent } from './weld-record/admin/attribute-code-exceptions/attribute-code-exceptions.component';
import { AdminRoutingOverrideComponent } from './weld-record/admin/routing-override/routing-override.component';
import { AdminPenetrantTypesComponent } from './weld-record/admin/penetrant-types/penetrant-types.component';
import { AdminDefectCodesComponent } from './weld-record/admin/defect-codes/defect-codes.component';
import { AdminInspectionProceduresComponent } from './weld-record/admin/inspection-procedures/inspection-procedures.component';
import { AdminLocationsComponent } from './weld-record/admin/locations/locations.component';
import { AdminShipLocationsComponent } from './weld-record/admin/ship-locations/ship-locations.component';
import { ImportShipLocationsComponent } from './weld-record/admin/ship-locations/import-ship-locations.component';
import { AdminSignoffTypesComponent } from './weld-record/admin/signoff-types/signoff-types.component';
import { AdminSignoffTypeRoutingComponent } from './weld-record/admin/signoff-type-routing/signoff-type-routing.component';
import { AdminSignoffTypeFormsComponent } from './weld-record/admin/signoff-type-forms/signoff-type-forms.component';
import { AdminWeldPositionsComponent } from './weld-record/admin/weld-positions/weld-positions.component';
import { AdminBannerComponent } from './weld-record/admin/banner/banner.component';
import { AdminJointDesignsComponent } from './weld-record/admin/joint-designs/joint-designs.component';
import { AdminGroupsComponent } from './weld-record/admin/groups/groups.component';
import { AdminMaterialTraceabilityComponent } from './weld-record/admin/material-traceability/material-traceability.component';
import { AdminMaterialClassificationComponent } from './weld-record/admin/material-classification/material-classification.component';
import { AdminQuickLinksComponent } from './weld-record/admin/quick-links/quick-links.component';
import { AdminFeatureTogglesComponent } from './weld-record/admin/feature-toggles/feature-toggles.component';
import { ChangelogComponent } from './changelog/changelog.component';
import { SystemMapComponent } from './system-map/system-map.component';
import { AdminQualificationsComponent } from './weld-record/admin/qualifications/qualifications.component';
import { MakeupPageComponent } from './weld-record/makeup-page/makeup-page.component';
import { MyAssignmentsPageComponent } from './future/weld-record/my-assignments-page/my-assignments-page.component';
import { WeldPlanningListComponent } from './future/weld-planning/weld-planning-list.component';
import { WeldPlanningFormComponent } from './future/weld-planning/weld-planning-form.component';
import { WeldPlanningDetailComponent } from './future/weld-planning/weld-planning-detail.component';
import { WeldPlanningAdminComponent } from './future/weld-planning/weld-planning-admin.component';
import { WeldPlanningMassEditComponent } from './future/weld-planning/weld-planning-mass-edit.component';
import { WeldPlanningSearchComponent } from './future/weld-planning/weld-planning-search.component';
import { ExternalLoadsComponent } from './future/weld-planning/external-loads/external-loads.component';
import { ProcedureLookupComponent } from './future/weld-engineering/procedure-lookup/procedure-lookup.component';
import { ProcedureDetailComponent } from './future/weld-engineering/procedure-detail/procedure-detail.component';
import { ManageProceduresComponent } from './future/weld-engineering/admin/manage-procedures/manage-procedures.component';
import { ProcedureFormComponent } from './future/weld-engineering/admin/manage-procedures/procedure-form.component';
import { LoadProceduresComponent } from './future/weld-engineering/admin/load-procedures/load-procedures.component';
import { ProcedureSectionsComponent } from './future/weld-engineering/admin/procedure-sections/procedure-sections.component';
import { ServicesComponent } from './future/weld-engineering/admin/services/services.component';


export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'pipe-welding' },
  /* Pipe Welding is the Advanced Search page */
  { path: 'pipe-welding', component: PipeWeldingPageComponent, title: 'EWR - Pipe Welding' },
  /* the old Pipe Welding table, switched off unless Admin > Feature Toggles > Classic Pipe Welding page
     is on; kept so it can be turned back on without a rewrite */
  { path: 'pipe-welding-classic', component: PipeWeldingClassicPageComponent, title: 'EWR - Pipe Welding (Classic)',
    canActivate: [() => featureToggles().classicPipeWelding || inject(Router).parseUrl('/pipe-welding')] },
  /* switched off unless Admin > Feature Toggles > My Assignments page is on; kept so it can be turned
     back on without a rewrite */
  { path: 'assignments', component: MyAssignmentsPageComponent, title: 'EWR - My Assignments',
    canActivate: [() => featureToggles().myAssignments || inject(Router).parseUrl('/pipe-welding')] },
  { path: 'history', component: HistoryPageComponent, title: 'EWR - History' },
  { path: 'makeup', component: MakeupPageComponent, title: 'EWR - Makeup' },
  { path: 'admin/routing-settings', component: AdminRoutingSettingsComponent, title: 'EWR - Routing Settings' },
  /* not in the menu: attribute codes are another system's; the table is kept for code -> description */
  { path: 'admin/attribute-codes', component: AdminAttributeCodesComponent, title: 'EWR - Attribute Codes' },
  { path: 'admin/attribute-code-exceptions', component: AdminAttributeCodeExceptionsComponent, title: 'EWR - Attribute Code Exceptions' },
  { path: 'admin/routing-override', component: AdminRoutingOverrideComponent, title: 'EWR - Routing Override' },
  { path: 'admin/penetrant-types', component: AdminPenetrantTypesComponent, title: 'EWR - Penetrant Types' },
  { path: 'admin/inspection-procedures', component: AdminInspectionProceduresComponent, title: 'EWR - Inspection Procedures' },
  { path: 'admin/defect-codes', component: AdminDefectCodesComponent, title: 'EWR - Defect Codes' },
  { path: 'admin/locations',    component: AdminLocationsComponent,       title: 'EWR - Locations' },
  { path: 'admin/ship-locations', component: AdminShipLocationsComponent, title: 'EWR - Ship Locations' },
  { path: 'admin/ship-locations/import', component: ImportShipLocationsComponent, title: 'EWR - Import Ship Locations' },
  { path: 'admin/signoff-types', component: AdminSignoffTypesComponent, title: 'EWR - Signoff Types' },
  { path: 'admin/signoff-type-routing', component: AdminSignoffTypeRoutingComponent,     title: 'EWR - Signoff Type to Routing' },
  { path: 'admin/signoff-type-forms', component: AdminSignoffTypeFormsComponent, title: 'EWR - Signoff Type Forms' },
  { path: 'admin/repair-codes', component: AdminRepairCodesComponent, title: 'EWR - Repair Codes' },
  { path: 'admin/weld-colors', component: AdminWeldColorsComponent, title: 'EWR - Weld Colors' },
  { path: 'admin/services', component: AdminServicesComponent, title: 'EWR - Services' },
  { path: 'admin/weld-positions', component: AdminWeldPositionsComponent, title: 'EWR - Weld Positions' },
  { path: 'admin/banner', component: AdminBannerComponent, title: 'EWR - Banner' },
  { path: 'admin/joint-designs', component: AdminJointDesignsComponent, title: 'EWR - Joint Designs' },
  { path: 'admin/groups', component: AdminGroupsComponent, title: 'EWR - Groups' },
  { path: 'admin/qualifications', component: AdminQualificationsComponent, title: 'EWR - Qualifications' },
  { path: 'changelog', component: ChangelogComponent, title: 'Change Log' },
  { path: 'system-map', component: SystemMapComponent, title: 'System Map' },
  { path: 'admin/material-traceability', component: AdminMaterialTraceabilityComponent, title: 'EWR - Material Traceability' },
  { path: 'admin/material-classification', component: AdminMaterialClassificationComponent, title: 'EWR - Material Classification' },
  { path: 'admin/quick-links', component: AdminQuickLinksComponent, title: 'EWR - Quick Links' },
  { path: 'admin/feature-toggles', component: AdminFeatureTogglesComponent, title: 'EWR - Feature Toggles' },

  { path: 'jobs/:hull/:drawing/:joint', component: JointPageComponent, title: 'EWR - Hull Details', canDeactivate: [canDeactivateGuard] },

  /* ── Weld Planning routes (separate system) ── */
  { path: 'weld-planning', component: WeldPlanningListComponent, title: 'EWP - Joint Search' },
  { path: 'weld-planning/new', component: WeldPlanningFormComponent, title: 'EWP - Create Joint' },
  { path: 'weld-planning/search', component: WeldPlanningSearchComponent, title: 'EWP - Advanced Search' },
  { path: 'weld-planning/admin', component: WeldPlanningAdminComponent, title: 'EWP - Joint Designs & NDT' },
  { path: 'weld-planning/import', component: WeldPlanningMassEditComponent, title: 'EWP - Import Joints' },
  { path: 'weld-planning/external-loads', component: ExternalLoadsComponent, title: 'EWP - External Loads' },
  { path: 'weld-planning/:id', component: WeldPlanningDetailComponent, title: 'EWP - Joint Details' },
  { path: 'weld-planning/:id/edit', component: WeldPlanningFormComponent, title: 'EWP - Edit Joint' },

  /* ── Weld Engineering routes (separate system) ── */
  { path: 'weld-engineering', component: ProcedureLookupComponent, title: 'EWE - Procedure Lookup' },
  { path: 'weld-engineering/procedures/:gwp/:wtn', component: ProcedureDetailComponent, title: 'EWE - Procedure' },
  { path: 'weld-engineering/admin', component: ManageProceduresComponent, title: 'EWE - Manage Procedures' },
  { path: 'weld-engineering/admin/new', component: ProcedureFormComponent, title: 'EWE - New Procedure' },
  { path: 'weld-engineering/admin/import', component: LoadProceduresComponent, title: 'EWE - Load Procedures' },
  { path: 'weld-engineering/admin/sections', component: ProcedureSectionsComponent, title: 'EWE - Procedure Sections' },
  { path: 'weld-engineering/admin/services', component: ServicesComponent, title: 'EWE - Services' },
  { path: 'weld-engineering/admin/:gwp/:wtn/edit', component: ProcedureFormComponent, title: 'EWE - Edit Procedure' },

  { path: '**', redirectTo: 'pipe-welding' }
];
