# Partner Programs Browse Feature

This directory contains the public browse page for partner programs on `partners.dub.co/browse`.

## Overview

The browse page allows users to discover and explore all active and open partner programs. It displays a grid of available programs that users can click to view individual program details.

## Route Structure

- **Browse Page**: `/browse` - Lists all active partner programs
- **Individual Programs**: `/{programSlug}` - Existing program landing pages (handled by the `(apply)/[programSlug]` route)

## Components

### `page.tsx`
Server component that:
- Fetches all public programs using `getPublicPrograms()`
- Renders the page layout with header and programs grid
- Handles empty state when no programs are available
- Sets SEO metadata

### `header.tsx`
Client component for the browse page header:
- Displays Dub Partners logo/wordmark
- Shows login button for unauthenticated users
- Sticky header with scroll effects

### `programs-grid.tsx`
Client component that:
- Displays programs in a responsive grid layout
- Maps over programs array and renders ProgramCard for each

### `program-card.tsx`
Client component for individual program cards:
- Displays program logo/wordmark or fallback initial
- Shows program name
- Links to individual program page (`/{programSlug}`)
- Hover effects and transitions

## Data Fetching

Programs are fetched using `getPublicPrograms()` from `@/lib/fetchers/get-public-programs.ts`. A program is considered "active and open" if:

- Has a group with `slug = "default"`
- Group has `landerPublishedAt` not null
- Group has `landerData` not null

## UI Notes

⚠️ **Important**: The current UI components are basic placeholders.

## SEO

The `/browse` route is included in the sitemap for search engine indexing (see `apps/web/app/sitemap.ts`).

