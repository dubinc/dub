# Dub web (`apps/web`)

Dub is a multi-tenant link-management and partner/affiliate platform. This DeepSec project covers only `apps/web` (Next.js App Router). Do not treat `packages/*` as in-scope unless a web file imports a helper that clearly implements authz or money movement.

## Product surfaces

- **Workspaces** are the tenant boundary. Almost every customer API is workspace-scoped (`/api/workspaces/[idOrSlug]/…` or a workspace resolved from the session/token).
- **Links, domains, folders, analytics** are the core product.
- **Partners / programs** (enterprise): commissions, bounties, applications, network, partner-profile APIs under `app/(ee)/`.
- **Payouts**: Stripe and PayPal withdrawals, commission aggregation, force-withdrawals. Money-movement bugs are HIGH/CRITICAL until proven otherwise.
- **Admin portal**: internal Dub-staff tools gated by `withAdmin` (membership on the Dub workspace). Impersonation lives here.
- **OAuth / SAML / embed**: third-party apps and partner embeds. Confused-deputy and redirect issues matter.
- **Crons**: QStash-signed routes under `app/(ee)/api/cron/`. Missing or weak signature checks are critical.

## Auth primitives (expected)

- `withWorkspace` (`lib/auth/workspace.ts`): session cookie **or** hashed API token. Enforces workspace membership, role, token scopes, plan, and optional feature flags. This is the default customer API wrapper.
- `withSession` (`lib/auth/session.ts`): authenticated user, not necessarily a workspace. Used for user-level routes.
- `withPartnerProfile` (`lib/auth/partner.ts`): partner-user session/token plus `throwIfNoPermission`.
- `withAdmin` (`lib/auth/admin.ts`): Dub staff only (`DUB_WORKSPACE_ID`).
- `withPublishableKey` (`lib/auth/publishable-key.ts`): `dub_pk_…` public keys. Must stay read-scoped; never treat as a secret API token.
- Partner-user permissions: `lib/auth/partner-users/`.
- Tokens are hashed (`hashToken`) and cached (`tokenCache`). Compare hashes, not raw tokens.

A route that reads `workspaceId` / `programId` / `partnerId` / `commissionId` from the URL or body without going through one of these wrappers (or an equivalent explicit check) is a likely IDOR.

## Common false-positive sources

- `(ee)` folders are feature/plan gated, not “unauthenticated.”
- Plan checks (`requiredPlan`) and token scopes (`requiredPermissions`) are intentional 403s, not missing auth.
- Publishable-key routes are supposed to be limited; flag them only if they mutate or leak other workspaces.
- QStash crons are authenticated by signature (`verifyQstashSignature`), not by `withWorkspace`.
- Test, Playwright, and script files are out of scope.

## What to prioritize

1. Cross-workspace IDOR (read/write another workspace’s links, customers, payouts, or programs).
2. Authz gaps: member/token doing owner-only actions; partner users exceeding role permissions.
3. Payout / commission / withdrawal tampering (amount, destination, status).
4. SSRF from user-controlled URLs (webhooks, oEmbed, domain verification, imports).
5. XSS in dashboards, embeds, and OG/preview HTML.
6. Cron or webhook handlers that skip signature verification.
