# Welding

A welding work-order and inspection manager (prototype), built with Angular 19 and DaisyUI 5 (Tailwind CSS 4).

## Quick start

```bash
npm install
npm start        # dev server at http://localhost:4200
```

## Build and checks

```bash
npx ng build
npx tsc --noEmit --noUnusedLocals -p tsconfig.app.json   # catches unused code
npx ng test --watch=false --browsers=ChromeHeadless
```

## Key facts

- **No backend**: all data is seeded in memory or saved to the browser's `localStorage`. Admin settings are saved per browser too.
- **480 seeded joints** with deterministic data (same every load).
- **Welding routing**: sign-off, reject rules, NDT steps driven by each joint's NDT values, unlimited repair rounds, and Cut (start over from Fit).
- **History**: every sign-off, deprogress and correction is recorded with the field values as they were.
- **Deprogress**: undo the last sign-off, with a required reason; History keeps the record. Nothing is ever un-signed.
- **Sold**: once signed, the joint is locked; only Deprogress is allowed.
- **Admin screens** for routing, Signoff Type Definition (which fields each step shows and their rules), qualifications, NDT settings, banners, joint designs and more.
- **No logins**: the app has a demo role filter, not real users, and nothing is access-controlled.
- **32 DaisyUI themes** (default: Light).

## Documentation

- [ROUTING.md](ROUTING.md): the routing rules in plain language, covering every step, NDT, repairs, Cut, and what's required to sign each step
- [ARCHITECTURE.md](ARCHITECTURE.md): folder map, data flow, data schema, services, screens, gotchas
- Change Log (Quick Links > Change Log in the app, data in `src/app/data/changelog.ts`): user-facing changes, newest first
