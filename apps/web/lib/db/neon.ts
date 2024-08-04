import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool } from '@neondatabase/serverless'
import { DATABASE_URL } from '.'

export const getNeonClient = () => {
    const neon = new Pool({ connectionString: DATABASE_URL });
    const adapter = new PrismaNeon(neon);
    const client = new PrismaClient({ adapter });

    return client;
}