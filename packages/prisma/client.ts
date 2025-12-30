import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/client";

const adapter = new PrismaMariaDb({
  // database: process.env.PLANETSCALE_DATABASE_URL || process.env.DATABASE_URL,

  host: process.env.PLANETSCALE_DATABASE_URL || process.env.DATABASE_URL,
  // port: 3306,
  // connectionLimit: 5,
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
