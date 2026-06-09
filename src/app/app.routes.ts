// Route table — maps each URL path to the screen component that renders for it.
import { Routes } from '@angular/router';
import { TableSearchComponent } from './table-search/table-search.component';
import { WorkHistoryComponent } from './work-history/work-history.component';
import { AdaptiveSearchComponent } from './adaptive-search/adaptive-search.component';
import { JobDetailComponent } from './job-detail/job-detail.component';
import { AdminStepsComponent } from './admin-steps/admin-steps.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'table' },
  { path: 'table', component: TableSearchComponent, title: 'Work orders' },
  { path: 'history', component: WorkHistoryComponent, title: 'Work history' },
  { path: 'adaptive', component: AdaptiveSearchComponent, title: 'Adaptive filters' },
  { path: 'admin/steps', component: AdminStepsComponent, title: 'Steps' },
  { path: 'jobs/:id', component: JobDetailComponent, title: 'Job details' },
  { path: '**', redirectTo: 'table' }
];
