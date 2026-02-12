import { PrismaClient } from "@dub/prisma/client";
import { env } from "./env";

// Dedicated Prisma client for E2E tests.
// Requires E2E_DATABASE_URL to be set explicitly.
export const prisma = new PrismaClient({
  datasourceUrl: env.E2E_DATABASE_URL,
  omit: {
    user: { passwordHash: true },
  },
});
