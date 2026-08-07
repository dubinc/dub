# Dub App Design System

Dub's design system guidance for app UI and agent-assisted frontend work in `apps/web`. Treat this file as an operational contract: it should help new app work feel native to Dub and should route implementation back to the real source files.

This file is for the authenticated Dub product, partner app, admin app, embedded app surfaces, settings, tables, forms, modals, and workflow UI. It is not intended to guide Dub's marketing website or campaign pages.

## Source Of Truth

- Shared Tailwind preset: `packages/tailwind-config/tailwind.config.ts`
- Light and dark CSS variables: `packages/tailwind-config/themes.css`
- Reusable UI primitives: `packages/ui/src`
- Web app Tailwind extensions: `apps/web/tailwind.config.ts`
- Font setup: `apps/web/styles/fonts.ts`

Prefer these sources over this document when values disagree.

## App Principles

Dub app UI is quiet, dense, and workflow-oriented. Favor clear hierarchy, compact spacing, neutral surfaces, strong affordances, and restrained motion. App screens should optimize scanning, comparison, and repeated action.

Prioritize the user's current job: creating links, managing workspaces, reviewing analytics, configuring integrations, running partner programs, messaging partners, and resolving operational states. Avoid landing-page composition, oversized hero sections, decorative card layouts, and promotional copy inside app workflows.

## Color

Use semantic theme classes for app UI so light and dark mode keep working:

- Surfaces: `bg-bg-default`, `bg-bg-muted`, `bg-bg-subtle`, `bg-bg-emphasis`, `bg-bg-inverted`
- Text and icons: `text-content-emphasis`, `text-content-default`, `text-content-subtle`, `text-content-muted`, `text-content-inverted`
- Borders: `border-border-emphasis`, `border-border-default`, `border-border-subtle`, `border-border-muted`
- Status backgrounds: `bg-bg-info`, `bg-bg-success`, `bg-bg-attention`, `bg-bg-warning`, `bg-bg-error`
- Status text: `text-content-info`, `text-content-success`, `text-content-attention`, `text-content-warning`, `text-content-error`

Use Tailwind scale colors for accents, charts, illustrations, and existing component variants when the semantic set does not cover the need. Avoid raw hex values in app UI unless creating a contained visual asset.

## Typography

- `font-default`: Inter, used for most app UI and prose.
- `font-mono`: Geist Mono fallback stack, used for code, IDs, data, and tabular content.

Most app UI should use compact `text-sm` and `text-xs` labels with clear hierarchy. Use larger type for page titles and empty states, not dense control panels or repeated workflow surfaces.

## Shape

Radii stay tight and functional. Use `rounded-md` for everyday inputs and compact controls, `rounded-lg` for standard buttons, menus, and small panels, `rounded-xl` for cards, tooltips, popovers, and larger containers, and `rounded-2xl` for desktop modals when using the existing `Modal` primitive.

Use `rounded-full` for true circles: avatars, circular icon buttons, progress dots, status dots, and other controls with equal width and height. Do not introduce pill-shaped buttons or badges unless an existing app component already uses that shape for the same pattern. Avoid mixing sharp, medium-rounded, and highly-rounded corners in the same app surface unless an existing component already does it.

For drawers and sheets, round only the detached edge, such as `rounded-t-[10px]` on bottom mobile drawers. Do not round edges that are flush with the viewport.

## Spacing And Layout

Use the existing Tailwind spacing scale. App screens should stay compact: small gaps inside a control group, moderate gaps between groups, larger gaps between sections.

Do not put cards inside cards. Use framed cards for repeated items, modals, or contained tools; use normal page layout for sections.

## Elevation And Depth

Hierarchy comes from semantic surfaces, borders, and overlays first; shadows should be subtle and tied to interactive layers. Prefer existing Tailwind shadow utilities and `@dub/ui` primitives over custom `box-shadow` values.

- Cards and repeated rows: use borders and tonal surfaces first. Add hover depth with existing utilities like `drop-shadow-card-hover` only when the item is clickable or draggable.
- Tooltips: use `Tooltip` from `packages/ui/src/tooltip.tsx`; the default layer is `bg-bg-default`, `border-border-default`, `rounded-xl`, and `shadow-sm`.
- Popovers and menus: use `Popover` from `packages/ui/src/popover.tsx`; desktop popovers use `bg-bg-default`, `border-border-subtle`, `rounded-lg`, and `drop-shadow-lg`.
- Modals and dialogs: use `Modal` from `packages/ui/src/modal.tsx`; desktop dialogs use a blurred backdrop, bordered white surface, `shadow-xl`, and `sm:rounded-2xl`.
- Sheets and drawers: use the existing drawer behavior in `Modal` and `Popover` for mobile. Drawer surfaces should anchor to the viewport edge, use `bg-bg-default` or the primitive's existing white surface, include a border on the attached edge, and avoid extra nested shadows.

Do not stack multiple heavy shadows. If a layer already has an overlay, border, or backdrop blur, keep the surface shadow modest. Preserve z-index and portal behavior supplied by Radix, Vaul, and `@dub/ui`.

## Components

Use `@dub/ui` primitives before creating local component markup.

- Buttons: use `Button` from `packages/ui/src/button.tsx`. Variants are `primary`, `secondary`, `outline`, `success`, `danger`, and `danger-outline`.
- Inputs: use `Input` from `packages/ui/src/input.tsx` for basic text and password fields with error handling.
- Badges: use `Badge` from `packages/ui/src/badge.tsx` for compact labels.
- Status: use `StatusBadge` from `packages/ui/src/status-badge.tsx` for stateful labels with icons.
- Modals: use `Modal` from `packages/ui/src/modal.tsx`; it adapts to a drawer on mobile.
- Popovers: use `Popover` from `packages/ui/src/popover.tsx`; it adapts to a drawer on mobile unless forced.
- Tables: use the table primitives in `packages/ui/src/table` for dense data views, selection, resizing, and pagination.

Button icons should be intentional. Use icons for main page actions, icon-only controls, destructive/alerting actions that need extra recognition, or compact repeated controls where the icon meaning is established. Avoid adding icons to ordinary section-level buttons, settings-card actions, helper buttons, and secondary text actions unless the surrounding app pattern already does it.

When extending a primitive, preserve its size, radius, focus, disabled, loading, and mobile behavior unless the product need clearly requires a different pattern.

## Forms And Validation

Required fields should be enforced through validation and submit behavior, not passive `Required` text in the label row. If a missing value prevents completion, keep the primary action disabled until the form is valid when possible, or show the existing error state after validation.

Use the existing input error pattern: red border/focus styling, an error icon when provided by the primitive, and a short message below the field. Keep helper text for guidance, constraints, or examples, such as `Max 32 characters`, not for restating that a field is required.

## State And Interactions

Exhaust declarative options before adding client state or effects for visual behavior. Prefer CSS, existing component APIs, derived render values, refs, Radix state attributes, and Tailwind variants before reaching for `useState` or `useEffect`.

Use state hooks when the interface genuinely owns changing state, such as open/closed controls, form values, selections, async status, or user-driven configuration.

## Motion

Use existing animation tokens from `packages/tailwind-config/tailwind.config.ts` and `apps/web/tailwind.config.ts`. App UI motion should be short and functional: disclosure, menu entry, modal entry, loading, and state feedback. Avoid long decorative loops in app workflows.

Respect reduced-motion expectations for any new custom animation.

## Language

Dub app copy should be clear, calm, and useful. Say what happened, what it means, and what the user can do next.

- Use short, direct sentences. Avoid filler, hype, jokes, and overly friendly reassurance.
- Name actions with a verb and object: `Create link`, `Delete program`, `Save settings`.
- Avoid vague labels like `Confirm`, `OK`, `Submit`, or `Continue` when a specific action exists.
- Write errors as problem plus next step: `Domain is already connected. Choose another domain or remove the existing one.`
- Toasts should name the thing that changed: `Program updated`, not `Successfully updated`.
- Empty states should explain what is missing and point to the first useful action.
- Confirmation copy should make irreversible or high-impact changes explicit before the action.

## Accessibility

Every interactive element needs a visible focus state, disabled state when unavailable, and accessible name. Do not communicate status by color alone; pair status color with text, icon, or both. Preserve keyboard behavior supplied by Radix and `@dub/ui` primitives.

## Do's And Don'ts

- Do prefer semantic theme classes like `bg-bg-default`, `text-content-emphasis`, and `border-border-subtle` over raw `bg-white`, `text-neutral-*`, `border-neutral-*`, or hex values for app UI.
- Do use `@dub/ui` primitives before creating local buttons, inputs, badges, status badges, popovers, modals, tables, or tooltips.
- Do keep app UI compact and task-focused; prioritize scanning, comparison, and repeated action.
- Do preserve dark mode, focus, disabled, loading, mobile, and empty states when creating or changing components.
- Do prefer CSS, existing props, derived values, refs, and data attributes before adding `useState` or `useEffect` for visual-only behavior.
- Don't add icons to ordinary section-level buttons, settings-card actions, helper buttons, or secondary text actions.
- Don't introduce pill-shaped buttons or badges; reserve `rounded-full` for true circular elements like avatars, icon buttons, and status dots.
- Don't add passive `Required` notes beside field labels; use disabled submit behavior or validation errors for missing required values.
- Don't use marketing-style cards, oversized type, hero sections, or promotional composition in repeated app workflows.
- Don't communicate status with color alone; pair it with text, an icon, or both.
- Don't stack heavy shadows or add custom `box-shadow` values when existing `@dub/ui` layers already provide depth.
- Don't mix sharp, medium-rounded, and highly-rounded corners in the same app surface unless an existing component already does it.
