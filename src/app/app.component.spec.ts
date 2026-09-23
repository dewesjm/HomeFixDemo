import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        /* AppComponent reads Router.events / ActivatedRoute to track the active nav system */
        provideRouter([]),
        /* SwUpdate.isEnabled is false outside a production service-worker context (same as
           provideServiceWorker(..., { enabled: !isDevMode() }) in app.config.ts) -- AppComponent's
           update-check logic short-circuits on that, so nothing further needs mocking here */
        { provide: SwUpdate, useValue: { isEnabled: false } },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'welding-inspection' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('welding-inspection');
  });
});
