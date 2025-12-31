import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/node/client";

const prismaClientSingleton = () => {
  const databaseUrl =
    process.env.PLANETSCALE_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL or PLANETSCALE_DATABASE_URL must be set");
  }

  const url = new URL(databaseUrl);

  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? parseInt(url.port, 10) : 3306,
    user: url.username || undefined,
    password: url.password || undefined,
    database: url.pathname.slice(1) || undefined,
    connectionLimit: 50,
    connectTimeout: 60000,
    acquireTimeout: 60000,
    // SSL configuration for PlanetScale
    ssl:
      url.searchParams.get("sslaccept") === "strict" ||
      url.searchParams.has("ssl") ||
      url.protocol === "mysqls:"
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
  });

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

export * from "./generated/node/client";
export * from "./generated/node/commonInputTypes";
