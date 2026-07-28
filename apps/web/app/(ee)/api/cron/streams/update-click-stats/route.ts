import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { conn } from "@/lib/planetscale";
import { redis } from "@/lib/upstash/redis";
import {
  ClickStatsEvent,
  clickStatsStream,
} from "@/lib/upstash/redis-streams/click-stats";
import { RedisStreamEntry } from "@/lib/upstash/redis-streams/client";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { format } from "date-fns";
import { NextResponse } from "next/server";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 10_000; // Max stream entries to consume per cron run
const SUB_BATCH_SIZE = 50; // DB updates to run in parallel within each batch
const BACKLOG_ALERT_THRESHOLD = 50_000; // Alert when stream length exceeds this
const BACKLOG_AGE_ALERT_MS = 5 * 60 * 1000; // Alert when oldest pending entry is older than 5 minutes
const LOCK_KEY = "lock:update-click-stats"; // Prevents concurrent GET/POST from double-counting
const LOCK_TTL_SECONDS = 600; // ≥ cron maxDuration (600s) so lock outlives a running invocation

type LinkAggregate = {
  linkId: string;
  clicks: number;
  lastClicked: number;
  entryIds: string[];
};

type WorkspaceAggregate = {
  workspaceId: string;
  clicks: number;
};

type EnrollmentAggregate = {
  programId: string;
  partnerId: string;
  clicks: number;
};

const aggregateClickStats = (
  entries: RedisStreamEntry<ClickStatsEvent>[],
): {
  linkUpdates: LinkAggregate[];
  workspaceUpdates: WorkspaceAggregate[];
  enrollmentUpdates: EnrollmentAggregate[];
} => {
  const links = new Map<string, LinkAggregate>();
  const workspaces = new Map<string, WorkspaceAggregate>();
  const enrollments = new Map<string, EnrollmentAggregate>();

  for (const entry of entries) {
    const { linkId, workspaceId, programId, partnerId, timestamp } = entry.data;

    if (!linkId) {
      continue;
    }

    const parsedTimestamp = Date.parse(timestamp);
    const lastClicked = Number.isFinite(parsedTimestamp)
      ? parsedTimestamp
      : Date.now();

    const existingLink = links.get(linkId);
    if (existingLink) {
      existingLink.clicks += 1;
      existingLink.lastClicked = Math.max(
        existingLink.lastClicked,
        lastClicked,
      );
      existingLink.entryIds.push(entry.id);
    } else {
      links.set(linkId, {
        linkId,
        clicks: 1,
        lastClicked,
        entryIds: [entry.id],
      });
    }

    if (workspaceId) {
      const existingWorkspace = workspaces.get(workspaceId);
      if (existingWorkspace) {
        existingWorkspace.clicks += 1;
      } else {
        workspaces.set(workspaceId, {
          workspaceId,
          clicks: 1,
        });
      }
    }

    if (programId && partnerId) {
      const key = `${programId}:${partnerId}`;
      const existingEnrollment = enrollments.get(key);
      if (existingEnrollment) {
        existingEnrollment.clicks += 1;
      } else {
        enrollments.set(key, {
          programId,
          partnerId,
          clicks: 1,
        });
      }
    }
  }

  return {
    linkUpdates: Array.from(links.values()),
    workspaceUpdates: Array.from(workspaces.values()),
    enrollmentUpdates: Array.from(enrollments.values()),
  };
};

const processInSubBatches = async <T>(
  items: T[],
  handler: (item: T) => Promise<{ success: boolean; error?: unknown }>,
) => {
  const errors: unknown[] = [];
  let totalProcessed = 0;

  for (let i = 0; i < items.length; i += SUB_BATCH_SIZE) {
    const batch = items.slice(i, i + SUB_BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(handler));

    for (const result of results) {
      if (result.status === "fulfilled" && result.value.success) {
        totalProcessed++;
      } else if (result.status === "fulfilled" && result.value.error) {
        errors.push(result.value.error);
      } else if (result.status === "rejected") {
        errors.push(result.reason);
      }
    }
  }

  return { totalProcessed, errors };
};

const getStreamEntryAgeMs = (entryId: string | null) => {
  if (!entryId) {
    return null;
  }

  const timestampMs = Number(entryId.split("-")[0]);
  if (!Number.isFinite(timestampMs)) {
    return null;
  }

  return Date.now() - timestampMs;
};

const processClickStatsStreamBatch = () =>
  clickStatsStream.processBatch<ClickStatsEvent>(
    async (entries) => {
      if (!entries || entries.length === 0) {
        return {
          success: true,
          linkUpdates: [],
          workspaceUpdates: [],
          enrollmentUpdates: [],
          processedEntryIds: [],
          totalProcessed: 0,
          errors: [],
        };
      }

      console.log(`Aggregating ${entries.length} click stats events`);

      const { linkUpdates, workspaceUpdates, enrollmentUpdates } =
        aggregateClickStats(entries);

      if (linkUpdates.length === 0) {
        console.log("No click stats updates to process");
        return {
          success: true,
          linkUpdates: [],
          workspaceUpdates: [],
          enrollmentUpdates: [],
          processedEntryIds: entries.map((entry) => entry.id),
          totalProcessed: 0,
          errors: [],
        };
      }

      console.log(
        `Processing ${linkUpdates.length} link, ${workspaceUpdates.length} workspace, ${enrollmentUpdates.length} enrollment click stats updates...`,
      );

      const processedEntryIds: string[] = [];
      const errors: unknown[] = [];

      const linkResult = await processInSubBatches(
        linkUpdates,
        async (update) => {
          try {
            await conn.execute(
              "UPDATE Link SET clicks = clicks + ?, lastClicked = ? WHERE id = ?",
              [
                update.clicks,
                format(new Date(update.lastClicked), "yyyy-MM-dd HH:mm:ss"),
                update.linkId,
              ],
            );
            processedEntryIds.push(...update.entryIds);
            return { success: true };
          } catch (error) {
            console.error(`Failed to update link ${update.linkId}:`, error);
            return {
              success: false,
              error: { linkId: update.linkId, error },
            };
          }
        },
      );
      errors.push(...linkResult.errors);

      const workspaceResult = await processInSubBatches(
        workspaceUpdates,
        async (update) => {
          try {
            await conn.execute(
              "UPDATE Project SET usage = usage + ?, totalClicks = totalClicks + ? WHERE id = ?",
              [update.clicks, update.clicks, update.workspaceId],
            );
            return { success: true };
          } catch (error) {
            console.error(
              `Failed to update workspace ${update.workspaceId}:`,
              error,
            );
            return {
              success: false,
              error: { workspaceId: update.workspaceId, error },
            };
          }
        },
      );
      errors.push(...workspaceResult.errors);

      const enrollmentResult = await processInSubBatches(
        enrollmentUpdates,
        async (update) => {
          try {
            await conn.execute(
              "UPDATE ProgramEnrollment SET totalClicks = totalClicks + ? WHERE programId = ? AND partnerId = ?",
              [update.clicks, update.programId, update.partnerId],
            );
            return { success: true };
          } catch (error) {
            console.error(
              `Failed to update program enrollment ${update.programId}:${update.partnerId}:`,
              error,
            );
            return {
              success: false,
              error: {
                programId: update.programId,
                partnerId: update.partnerId,
                error,
              },
            };
          }
        },
      );
      errors.push(...enrollmentResult.errors);

      const totalProcessed =
        linkResult.totalProcessed +
        workspaceResult.totalProcessed +
        enrollmentResult.totalProcessed;

      console.log(
        `Processed ${linkResult.totalProcessed}/${linkUpdates.length} links, ${workspaceResult.totalProcessed}/${workspaceUpdates.length} workspaces, ${enrollmentResult.totalProcessed}/${enrollmentUpdates.length} enrollments`,
      );

      if (errors.length > 0) {
        console.error(
          `Encountered ${errors.length} errors while processing click stats:`,
          errors.slice(0, 5),
        );
      }

      return {
        linkUpdates,
        workspaceUpdates,
        enrollmentUpdates,
        errors,
        totalProcessed,
        processedEntryIds,
        entriesProcessed: entries.length,
      };
    },
    {
      count: BATCH_SIZE,
      deleteAfterRead: true,
    },
  );

const maybeAlertOnBacklog = async (streamInfo: {
  length: number;
  firstEntryId: string | null;
}) => {
  const ageMs = getStreamEntryAgeMs(streamInfo.firstEntryId);
  const isBackloggedByLength = streamInfo.length > BACKLOG_ALERT_THRESHOLD;
  const isBackloggedByAge =
    ageMs !== null && ageMs > BACKLOG_AGE_ALERT_MS && streamInfo.length > 0;

  if (!isBackloggedByLength && !isBackloggedByAge) {
    return;
  }

  await log({
    message: `Click stats stream backlog alert: length=${streamInfo.length}, oldestAgeMs=${ageMs ?? "unknown"}, firstEntryId=${streamInfo.firstEntryId ?? "none"}`,
    type: "alerts",
  });
};

const executeClickStatsCron = async () => {
  const {
    linkUpdates,
    errors,
    totalProcessed,
    entriesProcessed = 0,
  } = await processClickStatsStreamBatch();

  const streamInfo = await clickStatsStream.getStreamInfo();
  await maybeAlertOnBacklog(streamInfo);

  const hasMore =
    streamInfo.length > 0 || (entriesProcessed ?? 0) >= BATCH_SIZE;

  if (hasMore) {
    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/streams/update-click-stats`,
      method: "POST",
      body: {},
    });
  }

  if (!linkUpdates.length) {
    return NextResponse.json({
      success: true,
      message: "No updates to process",
      processed: 0,
      streamInfo,
      hasMore,
    });
  }

  const response = {
    success: true,
    processed: totalProcessed,
    errors: errors?.length || 0,
    streamInfo,
    hasMore,
    message: `Successfully processed ${totalProcessed} click stats updates`,
  };

  console.log(response);

  return NextResponse.json(response);
};

const runWithLock = async () => {
  const acquired = await redis.set(LOCK_KEY, "1", {
    nx: true,
    ex: LOCK_TTL_SECONDS,
  });

  if (!acquired) {
    return logAndRespond(
      "[update-click-stats] Another run is in progress. Skipping...",
    );
  }

  try {
    return await executeClickStatsCron();
  } finally {
    await redis.del(LOCK_KEY);
  }
};

// GET /api/cron/streams/update-click-stats
export const GET = withCron(async () => runWithLock());

// POST /api/cron/streams/update-click-stats (recursively called by QStash)
export const POST = withCron(async () => runWithLock());
