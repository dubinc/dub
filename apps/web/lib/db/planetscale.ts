import { DATABASE_URL } from ".";
import { PrismaClient } from '@prisma/client'
import { PrismaPlanetScale } from '@prisma/adapter-planetscale'
import { Client } from '@planetscale/database'

export const getPlanetscaleClient = () => {
  const planetscale = new Client({ url: DATABASE_URL });
  const adapter = new PrismaPlanetScale(planetscale);
  const client = new PrismaClient({ adapter });

  return client;
}
