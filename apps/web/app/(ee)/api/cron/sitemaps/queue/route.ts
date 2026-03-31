import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const SITEMAP_QUEUE_BATCH_SIZE = 50;

const bodySchema = z.object({
  startingAfter: z.string().optional(),
});

async function runSitemapQueueBatch(startingAfter?: string) {
  const cursorFragment = startingAfter
    ? Prisma.sql`AND p.id > ${startingAfter}`
    : Prisma.sql``;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT p.id
      FROM Project p
      INNER JOIN Domain d ON d.projectId = p.id
        AND d.slug = JSON_UNQUOTE(JSON_EXTRACT(p.siteVisitTrackingSettings, '$.siteDomainSlug'))
        AND d.archived = false
        AND d.verified = true
      WHERE p.siteVisitTrackingSettings IS NOT NULL
        AND JSON_LENGTH(JSON_EXTRACT(p.siteVisitTrackingSettings, '$.trackedSitemaps')) > 0
        AND CHAR_LENGTH(TRIM(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(p.siteVisitTrackingSettings, '$.siteDomainSlug')), ''))) > 0
        ${cursorFragment}
      ORDER BY p.id ASC
      LIMIT ${SITEMAP_QUEUE_BATCH_SIZE}
    `,
  );

  if (rows.length === 0) {
    return {
      queued: 0,
      hasMore: false,
      lastId: undefined as string | undefined,
    };
  }

  const dayKey = new Date().toISOString().slice(0, 10);

  await Promise.all(
    rows.map(({ id }) =>
      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/sitemaps/import`,
        method: "POST",
        body: {
          workspaceId: id,
        },
        deduplicationId: `sitemap-import-${dayKey}-${id}`,
      }),
    ),
  );

  return {
    queued: rows.length,
    hasMore: rows.length === SITEMAP_QUEUE_BATCH_SIZE,
    lastId: rows[rows.length - 1]?.id,
  };
}

const handler = withCron(async ({ rawBody }) => {
  const { startingAfter } = bodySchema.parse(
    JSON.parse(rawBody?.trim() ? rawBody : "{}"),
  );

  const { queued, hasMore, lastId } = await runSitemapQueueBatch(startingAfter);

  if (hasMore && lastId) {
    const qstashResponse = await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/sitemaps/queue`,
      method: "POST",
      body: {
        startingAfter: lastId,
      },
    });

    if (!qstashResponse.messageId) {
      await log({
        message: `Error scheduling next sitemap queue batch: ${JSON.stringify(qstashResponse)}`,
        type: "errors",
        mention: true,
      });
    }

    return logAndRespond(
      `Queued ${queued} sitemap import job(s) for this batch. Scheduling next batch (startingAfter: ${lastId}).`,
    );
  }

  return logAndRespond(
    queued === 0 && !startingAfter
      ? "No eligible workspaces for sitemap import."
      : `Queued ${queued} sitemap import job(s) for this batch. No further batches.`,
  );
});

export { handler as GET, handler as POST };
