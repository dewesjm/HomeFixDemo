import { Component, signal } from '@angular/core';
import { FeatureToggles, loadFeatureToggles, saveFeatureToggles } from '../../../data/feature-toggles';

/* Admin > Feature Toggles: each switch saves as soon as it's changed */
@Component({
  selector: 'app-admin-feature-toggles',
  standalone: true,
  templateUrl: './admin-feature-toggles.component.html'
})
export class AdminFeatureTogglesComponent {
  toggles = signal<FeatureToggles>(loadFeatureToggles());

  set(key: keyof FeatureToggles, on: boolean) {
    this.toggles.update(t => ({ ...t, [key]: on }));
    saveFeatureToggles(this.toggles());
  }
}
