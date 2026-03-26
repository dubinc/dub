# E2E Tests (Playwright)

## Prerequisites

1. Install Chromium (one-time):

   ```sh
   pnpm --filter web exec playwright install chromium
   ```

2. Start MailHog (used for email verification during signup):

   ```sh
   docker-compose -f apps/web/docker-compose.yml up -d mailhog
   ```

3. Set environment variables in `apps/web/.env`:

   ```sh
   # Required for login tests (seeded user)
   E2E_PARTNER_EMAIL=partner1@dub-internal-test.com
   E2E_PARTNER_PASSWORD=password

   # SMTP must point to MailHog — signup tests read OTP emails from it
   SMTP_HOST=localhost
   SMTP_PORT=1025

   # RESEND_API_KEY must NOT be set, otherwise emails go to Resend instead of MailHog

   # Optional — defaults to http://partners.localhost:8888
   PLAYWRIGHT_BASE_URL=http://partners.localhost:8888

   # Optional — dashboard E2E (default http://localhost:8888)
   # PLAYWRIGHT_DASHBOARD_BASE_URL=http://localhost:8888
   # E2E_DASHBOARD_EMAIL=…
   # E2E_DASHBOARD_PASSWORD=…
   ```

   The seeded test user (`E2E_PARTNER_EMAIL`) must exist in your local database — run `tsx apps/web/playwright/seed.ts` to create it. Signup tests generate a fresh user each run via MailHog email verification.

## Running tests

Make sure the dev server is running first (`pnpm dev`), then:

```sh
# Headless (default)
pnpm --filter web test:e2e

# With browser visible
pnpm --filter web test:e2e:headed

# Interactive UI mode
pnpm --filter web test:e2e:ui
```
