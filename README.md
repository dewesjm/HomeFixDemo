# Welding

A welding work-order & inspection manager built with Angular 19 + DaisyUI 5 (Tailwind CSS 4).

## Quick start

```bash
npm start        # dev server at http://localhost:4200
```

## Build

```powershell
cd "C:\Users\dewes\primeng-search-demo"; npx ng build 2>&1
```

## Key facts

- **No backend** — all data is seeded in-memory or persisted to `localStorage`
- **240 seeded jobs** with deterministic data (same every load)
- **Workflow stages** per trade with signoff, rejection routing, NDT inspection, repair
- **Signoff Records** — each signoff and reopen is an immutable record with full field snapshots
- **Deprogress** — reverse last signed step with required comment; audit trail preserved
- **Sold stage** — once signed, workflow fully locked; only deprogress allowed
- **Admin screens** for routing, signoff fields, NDT settings, banners, joint designs, teams & permissions
- **My Assignments** page with role-filtered assignment list, keyword search, document links
- **32 DaisyUI themes** enabled (default: forest)
- **Fabrication section** — Location with Ship-specific fields, MIC tracking, W.E. Memo, Drawing Rev

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — folder map, data flow, data schema, staging, theming
- [COMPONENTS.md](COMPONENTS.md) — component reference, patterns, key features
