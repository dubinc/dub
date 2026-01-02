import { PrismaPlanetScale } from "@prisma/adapter-planetscale";
import { PrismaClient } from "./generated/edge/client";

const adapter = new PrismaPlanetScale({
  url: process.env.PLANETSCALE_DATABASE_URL || process.env.DATABASE_URL,
});

export const prismaEdge = new PrismaClient({
  adapter,
});

export * from "./generated/edge/client";
export * from "./generated/edge/commonInputTypes";
