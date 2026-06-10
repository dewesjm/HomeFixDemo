// Route table — maps each URL path to the screen component that renders for it.
import { Routes } from '@angular/router';
import { TableSearchComponent } from './table-search/table-search.component';
import { WorkHistoryComponent } from './work-history/work-history.component';
import { AdaptiveSearchComponent } from './adaptive-search/adaptive-search.component';
import { JobDetailComponent } from './job-detail/job-detail.component';
import { AdminStepsComponent } from './admin-steps/admin-steps.component';
import { AdminCharacteristicsComponent } from './admin-characteristics/admin-characteristics.component';
import { AdminConditionsComponent } from './admin-conditions/admin-conditions.component';
import { AdminMaterialsComponent } from './admin-materials/admin-materials.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'table' },
  { path: 'table', component: TableSearchComponent, title: 'Job Search' },
  { path: 'history', component: WorkHistoryComponent, title: 'History' },
  { path: 'adaptive', component: AdaptiveSearchComponent, title: 'Test Adaptive Filters' },
  { path: 'admin/steps', component: AdminStepsComponent, title: 'Admin Steps' },
  { path: 'admin/characteristics', component: AdminCharacteristicsComponent, title: 'Characteristic Codes' },
  { path: 'admin/conditions', component: AdminConditionsComponent, title: 'Condition Codes' },
  { path: 'admin/materials', component: AdminMaterialsComponent, title: 'Materials' },
  { path: 'jobs/:id', component: JobDetailComponent, title: 'Job Details' },
  { path: '**', redirectTo: 'table' }
];
