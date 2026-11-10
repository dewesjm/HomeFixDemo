/* Admin > Feature Toggles: each switch saves as soon as it's changed */
import { Component } from '@angular/core';
import { FeatureToggles, featureToggles, setFeatureToggle } from '../../../data/feature-toggles';

@Component({
  selector: 'app-admin-feature-toggles',
  standalone: true,
  templateUrl: './feature-toggles.component.html'
})
export class AdminFeatureTogglesComponent {
  toggles = featureToggles;

  set(key: keyof FeatureToggles, on: boolean) {
    setFeatureToggle(key, on);
  }
}
