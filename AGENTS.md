# Agent guide for dub

Dub is a Turborepo monorepo: Next.js 14 (App Router) + TypeScript + Tailwind, package manager is pnpm.

## UI components: check before building custom

Before building any UI element from scratch, check whether a component already exists:

1. `packages/ui/src/index.tsx` — `@dub/ui`, the shared component library (Button, Modal, Sheet, Tooltip, Combobox, Popover, tables, charts, etc.)
2. `apps/web/ui/shared/` — app-level shared components
3. `apps/web/ui/<domain>/` — domain-specific components (links, partners, analytics, …)

Prefer reusing or extending these over custom implementations. New reusable components belong in `apps/web/ui/shared/` (app-level) or `packages/ui` (cross-app).

### Callout

`apps/web/ui/shared/callout.tsx` — inline notice/alert banner with an icon. Use this for any info, success, warning, or error message box inside a page, form, or modal. Do not hand-roll bordered/tinted `<div>` notice boxes.

```tsx
import { Callout } from "@/ui/shared/callout";

<Callout variant="warn" size={1}>
  This domain is not verified yet.
</Callout>;
```

- `variant`: `success` | `info` | `warn` | `error` | `neutral` (default `neutral`) — sets icon and colors
- `size`: `1` (compact) | `2` (default)
- Note the casing: `Callout`, not `CallOut`
