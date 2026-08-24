import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

const BATCH_SIZE = 500;

// Cron to delete expired idempotency cache rows
// Runs once every day at midnight UTC (0 0 * * *)
// GET /api/cron/cleanup/idempotency-keys
export const GET = withCron(async () => {
  let deletedCount = 0;

  while (true) {
    const { count } = await prisma.idempotencyKey.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
      limit: BATCH_SIZE,
    });

    deletedCount += count;

    if (count < BATCH_SIZE) {
      break;
    }
  }

  return logAndRespond(`Deleted ${deletedCount} expired idempotency key(s).`);
});
