# Partner Profile Bounty Routes & Server Actions

Inventory of all API routes, server actions, and related files that touch bounties on the **partner profile** side (`partners.dub.co` / `/api/partner-profile`). This excludes program-admin routes (`/api/bounties`, `app.dub.co` program dashboard) and embed referral routes (`/api/embed/referrals`).

---

## Summary

| Type                                             | Count |
| ------------------------------------------------ | ----- |
| API routes (`/api/partner-profile/.../bounties`) | 3     |
| Server actions (`authPartnerActionClient`)       | 2     |

**Auth:** All API routes use `withPartnerProfile` from `apps/web/lib/auth/partner.ts`. All server actions use `authPartnerActionClient` from `apps/web/lib/actions/safe-action.ts`.

---

## API Routes

### 1. List bounties for an enrolled program

|              |                                                                                |
| ------------ | ------------------------------------------------------------------------------ |
| **Method**   | `GET`                                                                          |
| **Path**     | `/api/partner-profile/programs/[programId]/bounties`                           |
| **File**     | `apps/web/app/(ee)/api/partner-profile/programs/[programId]/bounties/route.ts` |
| **Auth**     | `withPartnerProfile`                                                           |
| **Response** | `PartnerBountyProps[]` (parsed via `PartnerBountySchema`)                      |

**Behavior:**

- Resolves program enrollment for the authenticated partner via `getProgramEnrollmentOrThrow` (includes program, links stats, partner tags).
- Fetches eligible bounties via `getBountiesForPartner`.
- Returns bounties with effective `startsAt`/`endsAt`, performance conditions, partner link stats, and the partner's submissions.

**Direct dependencies:**

- `apps/web/lib/api/programs/get-program-enrollment-or-throw.ts`
- `apps/web/lib/auth/partner.ts` — `withPartnerProfile`
- `apps/web/lib/bounty/api/get-bounties-for-partner.ts`

---

### 2. Get a single bounty

|              |                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------- |
| **Method**   | `GET`                                                                                     |
| **Path**     | `/api/partner-profile/programs/[programId]/bounties/[bountyId]`                           |
| **File**     | `apps/web/app/(ee)/api/partner-profile/programs/[programId]/bounties/[bountyId]/route.ts` |
| **Auth**     | `withPartnerProfile`                                                                      |
| **Response** | `PartnerBountyProps` (parsed via `PartnerBountySchema`)                                   |

**Behavior:**

- Loads program enrollment (program, links, partner tags).
- Loads bounty with workflow trigger conditions, partner's submissions (with commission), and eligibility includes.
- Validates view access via `throwIfPartnerCannotViewBounty`.
- Computes effective bounty period via `getEffectiveBountyPeriod`.
- Strips `groups` from response; includes aggregated partner link stats and `performanceCondition`.

**Direct dependencies:**

- `apps/web/lib/api/programs/get-program-enrollment-or-throw.ts`
- `apps/web/lib/auth/partner.ts` — `withPartnerProfile`
- `apps/web/lib/bounty/api/bounty-eligibility.ts` — `bountyEligibilityIncludes`, `throwIfPartnerCannotViewBounty`
- `apps/web/lib/bounty/api/get-bounty-or-throw.ts`
- `apps/web/lib/bounty/bounty-period.ts` — `getEffectiveBountyPeriod`
- `apps/web/lib/partners/aggregate-partner-links-stats.ts`
- `apps/web/lib/zod/schemas/partner-profile.ts` — `PartnerBountySchema`

---

### 3. Fetch social content stats for a submission URL

|                  |                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| **Method**       | `GET`                                                                                                          |
| **Path**         | `/api/partner-profile/programs/[programId]/bounties/[bountyId]/social-content-stats`                           |
| **File**         | `apps/web/app/(ee)/api/partner-profile/programs/[programId]/bounties/[bountyId]/social-content-stats/route.ts` |
| **Auth**         | `withPartnerProfile`                                                                                           |
| **Query params** | `url` (required, HTTP URL)                                                                                     |
| **Response**     | Social content object from scrape-creators API                                                                 |

**Behavior:**

- Rate limited: 10 requests/hour per partner (`partner-profile:social-content-stats:{partnerId}`).
- Validates program enrollment and bounty submit eligibility via `throwIfPartnerCannotSubmitBounty`.
- Requires bounty to have social metrics requirements (`resolveBountyDetails`).
- Fetches live social content via `getSocialContent` for the bounty's platform.

**Direct dependencies:**

- `apps/web/lib/api/errors.ts` — `DubApiError`
- `apps/web/lib/api/programs/get-program-enrollment-or-throw.ts`
- `apps/web/lib/api/scrape-creators/get-social-content.ts`
- `apps/web/lib/auth/partner.ts` — `withPartnerProfile`
- `apps/web/lib/bounty/api/bounty-eligibility.ts` — `bountyEligibilityIncludes`, `throwIfPartnerCannotSubmitBounty`
- `apps/web/lib/bounty/api/get-bounty-or-throw.ts`
- `apps/web/lib/bounty/utils.ts` — `resolveBountyDetails`
- `apps/web/lib/upstash.ts` — `ratelimit`

---

## Server Actions

### 1. Create bounty submission

|                  |                                                             |
| ---------------- | ----------------------------------------------------------- |
| **Export**       | `createBountySubmissionAction`                              |
| **File**         | `apps/web/lib/actions/partners/create-bounty-submission.ts` |
| **Auth**         | `authPartnerActionClient`                                   |
| **Input schema** | `createBountySubmissionInputSchema`                         |

**Input fields:**

- `programId` (string)
- `bountyId` (string)
- `files` (array, max `BOUNTY_MAX_SUBMISSION_FILES`)
- `urls` (array of HTTP URLs, max `BOUNTY_MAX_SUBMISSION_URLS`)
- `description` (optional string)
- `isDraft` (boolean, default `false`)
- `periodNumber` (optional int, required for multi-submission bounties)

**Behavior:**

- Instantiates `BountySubmissionHandler` with partner context from session and calls `submit()`.
- Handler validates eligibility, requirements, files, social content; persists submission; sends notification emails.

**Direct dependencies:**

- `apps/web/lib/bounty/api/create-bounty-submission.ts` — `BountySubmissionHandler`
- `apps/web/lib/zod/schemas/bounties.ts` — `createBountySubmissionInputSchema`
- `apps/web/lib/actions/safe-action.ts` — `authPartnerActionClient`

---

### 2. Upload bounty submission file

|                  |                                                                  |
| ---------------- | ---------------------------------------------------------------- |
| **Export**       | `uploadBountySubmissionFileAction`                               |
| **File**         | `apps/web/lib/actions/partners/upload-bounty-submission-file.ts` |
| **Auth**         | `authPartnerActionClient`                                        |
| **Input schema** | Inline Zod schema                                                |

**Input fields:**

- `programId` (string)
- `bountyId` (string)
- `fileName` (string, trimmed, min 1)
- `contentType` (string, trimmed, min 1)
- `contentLength` (positive int)

**Returns:**

- `signedUrl` — presigned R2 upload URL
- `destinationUrl` — final file URL after upload

**Behavior:**

- Loads program enrollment with partner tags.
- Delegates to `getBountySubmissionUploadUrl` which validates eligibility, file type (JPEG/PNG/WebP/SVG), size (max 5MB), rate limits (25 attempts/24h per bounty+partner), and bounty image submission requirements.

**Direct dependencies:**

- `apps/web/lib/api/programs/get-program-enrollment-or-throw.ts`
- `apps/web/lib/bounty/api/get-bounty-submission-upload-url.ts`
- `apps/web/lib/actions/safe-action.ts` — `authPartnerActionClient`

---

## Backend Library Files (full dependency tree)

Files invoked directly or transitively by the routes and server actions above.

### Bounty API (`apps/web/lib/bounty/api/`)

| File                                  | Role                                                                                                                                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get-bounties-for-partner.ts`         | Lists eligible bounties for a partner's program enrollment                                                                                                                               |
| `get-bounty-or-throw.ts`              | Fetches bounty by ID, validates it belongs to program                                                                                                                                    |
| `bounty-eligibility.ts`               | Group/tag eligibility checks; `throwIfPartnerCannotViewBounty`, `throwIfPartnerCannotSubmitBounty`, `canPartnerSubmitBounty`, `buildBountyEligibilityWhere`, `bountyEligibilityIncludes` |
| `create-bounty-submission.ts`         | `BountySubmissionHandler` class — full submission create/update flow                                                                                                                     |
| `get-bounty-submission-upload-url.ts` | Presigned upload URL generation for submission images                                                                                                                                    |

### Bounty utilities (`apps/web/lib/bounty/`)

| File                                 | Role                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `bounty-period.ts`                   | `getEffectiveBountyPeriod`, `isBountyExpired`                                 |
| `periods.ts`                         | `addFrequency`, `getCurrentPeriodNumber` — multi-submission period logic      |
| `utils.ts`                           | `resolveBountyDetails` — parses submission requirements, social metrics flags |
| `social-content.ts`                  | `SOCIAL_URL_HOST_TO_PLATFORM` — URL host → platform mapping                   |
| `constants.ts`                       | `BOUNTY_MAX_SUBMISSION_URLS`, `BOUNTY_MAX_SUBMISSION_FILES`, etc.             |
| `bounty-submission-status-badges.ts` | Status badge config (used by partner UI tables)                               |

### Other lib files

| File                                                           | Role                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------ |
| `apps/web/lib/api/programs/get-program-enrollment-or-throw.ts` | Loads partner's program enrollment                           |
| `apps/web/lib/api/scrape-creators/get-social-content.ts`       | Fetches social post metrics from external API                |
| `apps/web/lib/api/create-id.ts`                                | ID generation for new submissions                            |
| `apps/web/lib/api/errors.ts`                                   | `DubApiError`                                                |
| `apps/web/lib/api/get-workspace-users.ts`                      | Notifies workspace users on new submission                   |
| `apps/web/lib/partners/aggregate-partner-links-stats.ts`       | Aggregates clicks/leads/conversions/sales from partner links |
| `apps/web/lib/auth/partner.ts`                                 | `withPartnerProfile` route wrapper                           |
| `apps/web/lib/actions/safe-action.ts`                          | `authPartnerActionClient` server action wrapper              |
| `apps/web/lib/prisma.ts`                                       | Database client                                              |
| `apps/web/lib/storage.ts`                                      | R2 presigned URL generation (via upload-url helper)          |
| `apps/web/lib/upstash.ts`                                      | Rate limiting                                                |

### Zod schemas

| File                                          | Exports used                                                                                                                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web/lib/zod/schemas/partner-profile.ts` | `PartnerBountySchema`, `partnerBountySubmissionSchema`                                                                                                                                                                   |
| `apps/web/lib/zod/schemas/bounties.ts`        | `BountySchema`, `BountySubmissionSchema`, `BountySubmissionFileSchema`, `createBountySubmissionInputSchema`, `submissionRequirementsSchema`, `bountyPerformanceConditionSchema`, `bountySocialContentRequirementsSchema` |

### Prisma schema

| File                                   | Models                                                          |
| -------------------------------------- | --------------------------------------------------------------- |
| `apps/web/prisma/schema/bounty.prisma` | `Bounty`, `BountySubmission`, `BountyGroup`, `BountyPartnerTag` |

### Email templates (submission notifications)

| File                                                 | Trigger                              |
| ---------------------------------------------------- | ------------------------------------ |
| `packages/email/templates/bounty-new-submission.tsx` | Notifies workspace on new submission |
| `packages/email/templates/bounty-submitted.tsx`      | Confirms submission to partner       |

---

## SWR Hooks (API consumers)

| File                                                  | Endpoint(s)                                                                                        |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `apps/web/lib/swr/use-partner-program-bounties.ts`    | `GET /api/partner-profile/programs/{programSlug}/bounties`                                         |
| `apps/web/lib/swr/use-partner-bounty.ts`              | `GET /api/partner-profile/programs/{programSlug}/bounties/{bountyId}`                              |
| `apps/web/ui/partners/bounties/use-social-content.ts` | `GET /api/partner-profile/programs/{programSlug}/bounties/{bountyId}/social-content-stats?url=...` |

---

## Partner Dashboard Pages (`partners.dub.co`)

| File                                                                                                                                 | Role                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `apps/web/app/(ee)/partners.dub.co/(dashboard)/programs/[programSlug]/(enrolled)/bounties/page.tsx`                                  | Bounties list page (active/expired tabs)                                |
| `apps/web/app/(ee)/partners.dub.co/(dashboard)/programs/[programSlug]/(enrolled)/bounties/bounty-card.tsx`                           | Bounty card component                                                   |
| `apps/web/app/(ee)/partners.dub.co/(dashboard)/programs/[programSlug]/(enrolled)/bounties/[bountyId]/page.tsx`                       | Single bounty page shell                                                |
| `apps/web/app/(ee)/partners.dub.co/(dashboard)/programs/[programSlug]/(enrolled)/bounties/[bountyId]/page-client.tsx`                | Single bounty page client (progress, submissions, details)              |
| `apps/web/app/(ee)/partners.dub.co/(dashboard)/programs/[programSlug]/(enrolled)/bounties/[bountyId]/bounty-submissions-table.tsx`   | Submissions table with claim/details actions                            |
| `apps/web/app/(ee)/partners.dub.co/(dashboard)/programs/[programSlug]/(enrolled)/bounties/[bountyId]/bounty-performance-section.tsx` | Performance bounty chart/table (currently commented out in page-client) |

---

## Shared UI Components (`apps/web/ui/partners/bounties/`)

All files in this directory are used by the partner bounty experience. Files that directly call partner-profile routes or server actions are marked.

| File                                      | Calls partner-profile API/actions                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `claim-bounty-sheet.tsx`                  | `createBountySubmissionAction`, `uploadBountySubmissionFileAction`; revalidates bounties list SWR key |
| `use-claim-bounty-form.ts`                | Form state for claim sheet (no direct API calls)                                                      |
| `claim-bounty-context.tsx`                | Context provider for claim flow                                                                       |
| `use-social-content.ts`                   | `GET .../social-content-stats`                                                                        |
| `bounty-submission-details-sheet.tsx`     | Displays submission details (read-only)                                                               |
| `bounty-social-content.tsx`               | Social content input/preview; uses `usePartnerProfile`, `useSocialContent`                            |
| `bounty-social-content-preview.tsx`       | Social content preview UI                                                                             |
| `evaluate-social-content-requirements.ts` | Client-side social requirement evaluation                                                             |
| `bounty-submission-requirements.tsx`      | Renders submission requirements                                                                       |
| `bounty-reward-criteria.tsx`              | Renders reward criteria                                                                               |
| `bounty-reward-description.tsx`           | Renders reward description                                                                            |
| `bounty-description.tsx`                  | Renders bounty description                                                                            |
| `bounty-performance.tsx`                  | Progress bars for performance/submission bounties                                                     |
| `bounty-progress-bar-row.tsx`             | Progress bar row component                                                                            |
| `bounty-status-badge.tsx`                 | Status badge                                                                                          |
| `bounty-thumbnail-image.tsx`              | Thumbnail display                                                                                     |
| `bounty-social-metrics-rewards-table.tsx` | Social metrics rewards table                                                                          |
| `bounty-incremental-bonus-tooltip.tsx`    | Incremental bonus tooltip                                                                             |
| `bounty-platform-icons.ts`                | Platform icon mapping                                                                                 |
| `reject-bounty-submission-modal.tsx`      | **Program admin only** (`rejectBountySubmissionAction` via `authActionClient`) — not partner-profile  |

---

## Request Flow Diagrams

### List / view bounties

```
partners.dub.co UI
  → usePartnerProgramBounties / usePartnerBounty (SWR)
    → GET /api/partner-profile/programs/{programId}/bounties[/{bountyId}]
      → withPartnerProfile
        → getProgramEnrollmentOrThrow
        → getBountiesForPartner / getBountyOrThrow + throwIfPartnerCannotViewBounty
        → PartnerBountySchema.parse
```

### Claim / submit bounty

```
claim-bounty-sheet.tsx
  → uploadBountySubmissionFileAction (if image required)
    → authPartnerActionClient
      → getBountySubmissionUploadUrl
  → createBountySubmissionAction
    → authPartnerActionClient
      → BountySubmissionHandler.submit()
        → validate eligibility, requirements, social content
        → prisma.bountySubmission.create/update
        → send notification emails
  → SWR mutate on /api/partner-profile/programs/{slug}/bounties
```

### Social content preview (during claim)

```
bounty-social-content.tsx
  → useSocialContent
    → GET /api/partner-profile/programs/{programId}/bounties/{bountyId}/social-content-stats?url=...
      → withPartnerProfile
        → throwIfPartnerCannotSubmitBounty
        → getSocialContent (scrape-creators)
```

---

## Explicitly Excluded (program-admin / other surfaces)

These touch bounties but are **not** partner-profile:

### Program-admin API routes

- `apps/web/app/(ee)/api/bounties/route.ts`
- `apps/web/app/(ee)/api/bounties/[bountyId]/route.ts`
- `apps/web/app/(ee)/api/bounties/[bountyId]/submissions/route.ts`
- `apps/web/app/(ee)/api/bounties/[bountyId]/submissions/[submissionId]/approve/route.ts`
- `apps/web/app/(ee)/api/bounties/[bountyId]/submissions/[submissionId]/reject/route.ts`
- `apps/web/app/(ee)/api/bounties/[bountyId]/sync-social-metrics/route.ts`
- `apps/web/app/(ee)/api/cron/bounties/sync-social-metrics/route.ts`

### Program-admin server actions (`authActionClient`, not `authPartnerActionClient`)

- `apps/web/lib/actions/partners/approve-bounty-submission.ts`
- `apps/web/lib/actions/partners/reject-bounty-submission.ts`
- `apps/web/lib/actions/partners/reopen-bounty-submission.ts`

### Embed referral routes (separate auth surface)

- `apps/web/app/(ee)/api/embed/referrals/submissions/route.ts`
- `apps/web/app/(ee)/api/embed/referrals/bounties/[bountyId]/upload/route.ts`
- `apps/web/app/(ee)/api/embed/referrals/bounties/[bountyId]/social-content-stats/route.ts`
- `apps/web/app/(ee)/app.dub.co/embed/referrals/get-referrals-embed-data.ts`

### Program dashboard UI (`app.dub.co`)

- `apps/web/app/app.dub.co/(dashboard)/[slug]/(ee)/program/bounties/**`
