import { PrismaClient } from "@prisma/client";
import { getNeonClient } from "./neon";
import { getPlanetscaleClient } from "./planetscale";

export const DATABASE_URL =
    process.env.PLANETSCALE_DATABASE_URL || process.env.DATABASE_URL;

export function getDatabaseType(url = DATABASE_URL) {
    const type = url && url.split(':')[0];

    if (type === 'postgres') {
        return 'postgresql';
    }

    return type;
}

export const getEdgeClient = (): PrismaClient => {
    const databaseType = getDatabaseType();
    let client: PrismaClient | null = null;

    if (databaseType == "postgresql") {
        client = getNeonClient();
    } else {
        client = getPlanetscaleClient();
    }

    return client;
}