# @dub/prisma

Prisma client package for Dub, configured for PlanetScale with support for both Node.js and Edge runtimes.

## Overview

This package provides a Prisma client configured for Dub's database setup. It includes:

- **MySQL/PlanetScale** database adapter support
- **Dual client setup**: Node.js client and Edge runtime client
- **Modular schema**: Schema split across multiple `.prisma` files for better organization
- **Type exports**: TypeScript types exported for use across the codebase

## Usage

### Standard Node.js Client

For use in Node.js environments (API routes, server components, etc.):

```typescript
import { prisma } from "@dub/prisma";
```

### Edge Runtime Client

For use in Edge runtime environments (Vercel Edge Functions, middleware, etc.):

```typescript
import { prismaEdge } from "@dub/prisma/edge";
```

### Type Exports (Browser)

For browser/client-side code, use the types export:

```typescript
import { WorkspaceRole, EventType } from "@dub/prisma/types";
```

For server-side code, you can import types directly from the main package:

```typescript
import { Prisma, WorkspaceRole } from "@dub/prisma";
```

### Key Configuration

- **Database**: MySQL with Prisma relation mode
- **Provider**: Uses `DATABASE_URL` or `PLANETSCALE_DATABASE_URL` environment variable
- **Relation Mode**: `prisma` (required for PlanetScale compatibility)
- **Generators**:
  - Standard client for Node.js runtime
  - Edge client for Edge runtime

## Client Configuration

### Node.js Client (`node.ts`)

- Uses `@prisma/adapter-mariadb` adapter

### Edge Client (`edge.ts`)

- Uses `@prisma/adapter-planetscale` adapter
- Optimized for Edge runtime environments
- Uses PlanetScale's HTTP-based connection

## Exports

The package exports:

- **Default export** (`@dub/prisma`): Node.js Prisma client (server-side only)
- **Edge export** (`@dub/prisma/edge`): Edge runtime Prisma client (server-side only)
- **Types export** (`@dub/prisma/types`): TypeScript types and enums (browser-safe, use in client components)
