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
- **Welding routing**: signoff, configurable accepted/reject rules, NDT routings driven by each joint's requirements, unlimited repair rounds, and Cut (start over from Fit).
- **History**: every sign-off, deprogress and correction is recorded with the field values as they were.
- **Deprogress**: undo the last sign-off, with a required reason; History keeps the record. Nothing is ever un-signed.
- **Sold**: the joint is closed and locked; Deprogress can reverse the preceding signoff.
- **Admin screens** for routing, Signoff Types, Signoff Type to Routing, Signoff Type Forms, qualifications, inspection procedures, weld colors, locations, joint designs, banners, and more.
- **No logins**: the app has a demo role filter, not real users, and nothing is access-controlled.
- **32 DaisyUI themes** (default: Light).

## Documentation

Built with AI assistance (Claude Code and Codex).

The docs below, and the AI tool rules (CLAUDE.md, AGENTS.md), are kept locally and are not in this repository. Local docs are in [docs/](docs/):

- [ARCHITECTURE.md](docs/ARCHITECTURE.md): folder map, data flow, data schema, services, screens, gotchas
- [ROUTING.md](docs/ROUTING.md): current routing rules, NDT, repairs, Cut, and signoff requirements
- [Tasks.md](docs/Tasks.md): master backlog of outstanding requirements, gaps and tentative ideas
- [ATTRIBUTE-CODES-PLAN.md](docs/ATTRIBUTE-CODES-PLAN.md): attribute code assumptions and open questions for end users
- [TEST-COVERAGE-PLAN.md](docs/TEST-COVERAGE-PLAN.md): deferred testing packages and historical coverage baseline
- Change Log (Quick Links > Change Log in the app, data in `src/app/data/changelog.ts`): user-facing changes, newest first
