/* The route component of the per-joint-type settings pages: the page named in the route's data, given the
   joint type from the URL. A new type (the select, Back, a link) builds the page anew for that type. */
import { Component, Injector, Type, computed, inject } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SETTINGS_JOINT_TYPE, jointTypeFromParam } from './joint-type-settings';

@Component({
  selector: 'app-joint-type-settings-page',
  imports: [NgComponentOutlet],
  template: `<ng-container *ngComponentOutlet="page; injector: pageInjector()" />`,
})
export class JointTypeSettingsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  readonly page = this.route.snapshot.data['page'] as Type<unknown>;
  private readonly jointType = toSignal(this.route.queryParamMap.pipe(map(p => jointTypeFromParam(p.get('type')))),
    { initialValue: jointTypeFromParam(this.route.snapshot.queryParamMap.get('type')) });
  /* a new injector per type, so the outlet creates the page again */
  readonly pageInjector = computed(() => Injector.create({
    providers: [{ provide: SETTINGS_JOINT_TYPE, useValue: this.jointType() }], parent: this.injector,
  }));
}
