# E2E Tests (Playwright)

## Prerequisites

1. Install Chromium (one-time):

   ```sh
   pnpm --filter web exec playwright install chromium
   ```

2. Set environment variables in `apps/web/.env`:

   ```sh
   # Required for credential-based tests
   E2E_PARTNER_EMAIL=your-test-partner@example.com
   E2E_PARTNER_PASSWORD=your-test-password

   # Optional — defaults to http://partners.localhost:8888
   PLAYWRIGHT_BASE_URL=http://partners.localhost:8888
   ```

   The test user must exist in your local database with a password and ideally a partner profile.

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
