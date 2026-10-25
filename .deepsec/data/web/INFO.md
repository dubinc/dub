# Dub web (`apps/web`)

Dub is a multi-tenant link-management and conversion-tracking platform. This DeepSec project covers only `apps/web` (Next.js App Router). Do not treat `packages/*` as in-scope unless a web file imports a helper that clearly implements authz or billing.

## Product surfaces

- **Workspaces** are the tenant boundary. Almost every customer API is workspace-scoped (`/api/workspaces/[idOrSlug]/…` or a workspace resolved from the session/token).
- **Links, domains, folders, analytics** are the core product.
- **Conversions** (enterprise): lead/sale tracking, customers, and Stripe/Shopify/HubSpot/Singular/AppsFlyer integrations under `app/(ee)/`.
- **Billing**: Stripe subscriptions, invoices, and domain renewal payments. Billing bugs are HIGH until proven otherwise.
- **OAuth / SAML / embed**: third-party apps and the support-chat embed. Confused-deputy and redirect issues matter.
- **Crons**: QStash-signed routes under `app/(ee)/api/cron/`. Missing or weak signature checks are critical.

## Auth primitives (expected)

- `withWorkspace` (`lib/auth/workspace.ts`): session cookie **or** hashed API token. Enforces workspace membership, role, token scopes, plan, and optional feature flags. This is the default customer API wrapper.
- `withSession` (`lib/auth/session.ts`): authenticated user, not necessarily a workspace. Used for user-level routes.
- `withPublishableKey` (`lib/auth/publishable-key.ts`): `dub_pk_…` public keys. Must stay read-scoped; never treat as a secret API token.
- Tokens are hashed (`hashToken`) and cached (`tokenCache`). Compare hashes, not raw tokens.

A route that reads `workspaceId` / `linkId` / `customerId` from the URL or body without going through one of these wrappers (or an equivalent explicit check) is a likely IDOR.

## Common false-positive sources

- `(ee)` folders are feature/plan gated, not “unauthenticated.”
- Plan checks (`requiredPlan`) and token scopes (`requiredPermissions`) are intentional 403s, not missing auth.
- Publishable-key routes are supposed to be limited; flag them only if they mutate or leak other workspaces.
- QStash crons are authenticated by signature (`verifyQstashSignature`), not by `withWorkspace`.
- Test, Playwright, and script files are out of scope.

## What to prioritize

1. Cross-workspace IDOR (read/write another workspace’s links, domains, folders, or customers).
2. Authz gaps: member/token doing owner-only actions.
3. Billing tampering (plan, invoice, or payment method changes).
4. SSRF from user-controlled URLs (webhooks, oEmbed, domain verification, imports).
5. XSS in dashboards, embeds, and OG/preview HTML.
6. Cron or webhook handlers that skip signature verification.
