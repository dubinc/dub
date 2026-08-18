import { Client } from "@upstash/qstash";

export const qstash = new Client({
  baseUrl: process.env.QSTASH_URL || "https://qstash-us-east-1.upstash.io",
  token: process.env.QSTASH_TOKEN || "",
});

// Default batch size for cron jobs that process records in batches
export const CRON_BATCH_SIZE = 100;

// 250 is generally the best size limit for Prisma updateMany operations
export const PRISMA_UPDATEMANY_LIMIT = 250;
