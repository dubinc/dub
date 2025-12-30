import { Client } from "@planetscale/database";
import { PrismaPlanetScale } from "@prisma/adapter-planetscale";
import { PrismaClient } from "./generated-edge/client";

const client = new Client({
  url: process.env.PLANETSCALE_DATABASE_URL || process.env.DATABASE_URL,
});

export const prismaEdge = new PrismaClient({
  adapter: new PrismaPlanetScale(client),
});
