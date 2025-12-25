import { PrismaPlanetScale } from "@prisma/adapter-planetscale";
import { PrismaClient } from "./generated/client";

const adapter = new PrismaPlanetScale({
  url: process.env.PLANETSCALE_DATABASE_URL || process.env.DATABASE_URL,
});

const prismaClientSingleton = () => {
  return new PrismaClient({
    adapter,
    omit: {
      user: {
        passwordHash: true,
      },
    },
  });
};

declare global {
  var prisma: PrismaClient<never, { user: { passwordHash: true } }> | undefined;
}

export const prisma = global.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export const sanitizeFullTextSearch = (search: string) => {
  // remove unsupported characters for full text search
  return search.replace(/[*+\-()~@%<>!=?:]/g, "").trim();
};

export * from "./generated/client";
export * from "./generated/commonInputTypes";
