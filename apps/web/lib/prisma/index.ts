import { PrismaClient } from "@prisma/client";

// serverless prisma
export const prisma = global.prisma || new PrismaClient();

declare global {
  var prisma: PrismaClient | undefined;
}

if (process.env.NODE_ENV === "development") global.prisma = prisma;
