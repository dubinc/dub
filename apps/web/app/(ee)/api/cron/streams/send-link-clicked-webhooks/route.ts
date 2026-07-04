import { transformLink } from "@/lib/api/links/utils/transform-link";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { ClickEventTB } from "@/lib/types";
import { redis } from "@/lib/upstash/redis";
import { RedisStreamEntry } from "@/lib/upstash/redis-streams/client";
import { workspaceClickEventStream } from "@/lib/upstash/redis-streams/workspace-click-events";
import { LINK_CLICK_WEBHOOK_TRIGGER } from "@/lib/webhook/constants";
import { sendWebhooks } from "@/lib/webhook/qstash";
import { transformClickEventData } from "@/lib/webhook/transform";
import { chunk, groupBy } from "@dub/utils";
import { NextResponse } from "next/server";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// How many stream entries to drain per run
const BATCH_SIZE = 6000;

// How many webhook deliveries to enqueue to QStash in parallel
const SEND_CONCURRENCY = 100;

// Lock for the cron job
const LOCK_KEY = "lock:send-link-clicked-webhooks";
const LOCK_TTL_SECONDS = 120;

// Drains the workspace:click:events stream and delivers link.clicked webhooks.
// Runs every minute (see vercel.json).
// GET /api/cron/streams/send-link-clicked-webhooks
export const GET = withCron(async () => {
  const acquired = await redis.set(LOCK_KEY, "1", {
    nx: true,
    ex: LOCK_TTL_SECONDS,
  });

  if (!acquired) {
    return logAndRespond(
      "[send-link-clicked-webhooks] Another run is in progress. Skipping...",
    );
  }

  try {
    const start = Date.now();

    const { processed, sent, failed, processedEntryIds } =
      await processStreamBatch();

    const streamInfo = await workspaceClickEventStream.getStreamInfo();

    console.log({
      processed,
      sent,
      failed,
      processedEntryIds,
      streamInfo,
      timeTaken: `${Date.now() - start}ms`,
    });

    return NextResponse.json("Finished processing stream.");
  } finally {
    await redis.del(LOCK_KEY);
  }
});

const processStreamBatch = (): Promise<{
  processed: number;
  sent: number;
  failed: number;
  processedEntryIds: string[];
}> =>
  workspaceClickEventStream.processBatch<ClickEventTB>(
    async (entries) => {
      if (!entries || entries.length === 0) {
        return {
          processed: 0,
          sent: 0,
          failed: 0,
          processedEntryIds: [],
        };
      }

      const workspaceIds = [
        ...new Set(entries.map((e) => e.data.workspace_id).filter(Boolean)),
      ];
      const linkIds = [
        ...new Set(entries.map((e) => e.data.link_id).filter(Boolean)),
      ];

      const [workspaces, links] = await Promise.all([
        prisma.project.findMany({
          where: {
            id: {
              in: workspaceIds,
            },
          },
          select: {
            id: true,
            usage: true,
            usageLimit: true,
            webhooks: {
              where: {
                disabledAt: null,
                triggers: {
                  array_contains: [LINK_CLICK_WEBHOOK_TRIGGER],
                },
              },
              select: {
                id: true,
                url: true,
                secret: true,
                linkScope: true,
                projectId: true,
              },
            },
          },
        }),

        prisma.link.findMany({
          where: {
            id: {
              in: linkIds,
            },
          },
          include: {
            tags: {
              select: {
                tag: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      const webhooks = workspaces.flatMap((w) => w.webhooks);

      const linkScopeWebhookIds = webhooks
        .filter((w) => w.linkScope === "links")
        .map((w) => w.id);

      const linkFolderScopeWebhookIds = webhooks
        .filter((w) => w.linkScope === "folders")
        .map((w) => w.id);

      const folderIds = [
        ...new Set(
          links.map((l) => l.folderId).filter((id): id is string => id != null),
        ),
      ];

      const [linkWebhooks, folderWebhooks] = await Promise.all([
        linkScopeWebhookIds.length > 0 && linkIds.length > 0
          ? prisma.linkWebhook.findMany({
              where: {
                webhookId: {
                  in: linkScopeWebhookIds,
                },
                linkId: {
                  in: linkIds,
                },
              },
              select: {
                webhookId: true,
                linkId: true,
              },
            })
          : Promise.resolve([]),

        linkFolderScopeWebhookIds.length > 0 && folderIds.length > 0
          ? prisma.folderWebhook.findMany({
              where: {
                webhookId: {
                  in: linkFolderScopeWebhookIds,
                },
                folderId: {
                  in: folderIds,
                },
              },
              select: {
                webhookId: true,
                folderId: true,
              },
            })
          : Promise.resolve([]),
      ]);

      const linkWebhooksByLinkId = groupBy(linkWebhooks, (r) => r.linkId);
      const folderWebhooksByFolderId = groupBy(
        folderWebhooks,
        (r) => r.folderId,
      );
      const webhooksByWorkspace = groupBy(webhooks, (w) => w.projectId);
      const workspaceById = new Map(workspaces.map((p) => [p.id, p]));
      const linkById = new Map(links.map((l) => [l.id, l]));

      const sendTasks: {
        entryId: string;
        task: () => Promise<boolean>;
      }[] = [];
      const processedEntryIds: string[] = [];

      for (const entry of entries as RedisStreamEntry<ClickEventTB>[]) {
        const event = entry.data;
        const workspaceWebhooks = webhooksByWorkspace[event.workspace_id] ?? [];

        if (workspaceWebhooks.length === 0) {
          processedEntryIds.push(entry.id);
          continue;
        }

        const workspace = workspaceById.get(event.workspace_id);
        if (!workspace || workspace.usage >= workspace.usageLimit) {
          processedEntryIds.push(entry.id);
          continue;
        }

        const link = linkById.get(event.link_id);
        if (!link) {
          processedEntryIds.push(entry.id);
          continue;
        }

        const applicableWebhooks = workspaceWebhooks.filter((webhook) => {
          if (webhook.linkScope === "workspace") {
            return true;
          }

          if (webhook.linkScope === "links") {
            return (
              linkWebhooksByLinkId[event.link_id]?.some(
                (r) => r.webhookId === webhook.id,
              ) ?? false
            );
          }

          if (webhook.linkScope === "folders") {
            return (
              link.folderId != null &&
              folderWebhooksByFolderId[link.folderId]?.some(
                (r) => r.webhookId === webhook.id,
              )
            );
          }

          return false;
        });

        if (applicableWebhooks.length === 0) {
          processedEntryIds.push(entry.id);
          continue;
        }

        sendTasks.push({
          entryId: entry.id,
          task: async () => {
            try {
              const results = await sendWebhooks({
                trigger: LINK_CLICK_WEBHOOK_TRIGGER,
                webhooks: applicableWebhooks,
                data: transformClickEventData({
                  ...event,
                  link: transformLink(link),
                }),
              });

              return results.every((r) => r.ok);
            } catch (error) {
              return false;
            }
          },
        });
      }

      let sent = 0;
      let failed = 0;

      for (const batch of chunk(sendTasks, SEND_CONCURRENCY)) {
        const results = await Promise.allSettled(
          batch.map(({ task }) => task()),
        );

        batch.forEach(({ entryId }, i) => {
          if (results[i].status === "fulfilled") {
            processedEntryIds.push(entryId);
            sent++;
          } else {
            failed++;
          }
        });
      }

      return {
        processed: processedEntryIds.length,
        sent,
        failed,
        processedEntryIds,
      };
    },
    {
      count: BATCH_SIZE,
      deleteAfterRead: true,
    },
  );
