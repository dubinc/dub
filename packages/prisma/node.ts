import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/node/client";

const prismaClientSingleton = () => {
  const databaseUrl =
    process.env.PLANETSCALE_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL or PLANETSCALE_DATABASE_URL must be set");
  }

  const url = new URL(databaseUrl);

  // Read configuration from connection string query parameters
  const connectionLimit = url.searchParams.has("connection_limit")
    ? parseInt(url.searchParams.get("connection_limit")!, 10)
    : 50;

  const connectTimeout = url.searchParams.has("connect_timeout")
    ? parseInt(url.searchParams.get("connect_timeout")!, 10) * 1000 // convert seconds to milliseconds
    : 60000;

  const poolTimeout = url.searchParams.has("pool_timeout")
    ? parseInt(url.searchParams.get("pool_timeout")!, 10) * 1000 // convert seconds to milliseconds
    : 60000;

  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? parseInt(url.port, 10) : 3306,
    user: url.username || undefined,
    password: url.password || undefined,
    database: url.pathname.slice(1) || undefined,
    connectionLimit,
    // connectTimeout,
    // acquireTimeout: poolTimeout,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  console.log({ connectionLimit, connectTimeout, poolTimeout });

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
