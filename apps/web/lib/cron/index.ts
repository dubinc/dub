import { Client } from "@upstash/qstash";

export const qstash = new Client({
  baseUrl: process.env.QSTASH_URL || "https://qstash-us-east-1.upstash.io",
  token: process.env.QSTASH_TOKEN || "",
  ...(process.env.VERCEL_ENV === "preview" && {
    headers: {
      "x-vercel-protection-bypass":
        process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "",
    },
  }),
});

// This is a special client only used for publishWebhookEventToQStash
// (to avoid forwarding the Vercel automation bypass secret to third party webhook receivers)
export const qstashWithoutBypass = new Client({
  baseUrl: process.env.QSTASH_URL || "https://qstash-us-east-1.upstash.io",
  token: process.env.QSTASH_TOKEN || "",
});

// Default batch size for cron jobs that process records in batches
export const CRON_BATCH_SIZE = 100;

// 250 is generally the best size limit for Prisma updateMany operations
export const PRISMA_UPDATEMANY_LIMIT = 250;
