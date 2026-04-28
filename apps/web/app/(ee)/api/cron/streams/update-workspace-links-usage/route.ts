import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { sendLimitEmail } from "@/lib/cron/send-limit-email";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { WorkspaceProps } from "@/lib/types";
import {
  RedisStreamEntry,
  WorkspaceLinksUsageEvent,
  workspaceLinksUsageStream,
} from "@/lib/upstash/redis-streams";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 10000;

type WorkspaceLinksUsageAggregate = {
  workspaceId: string;
  linksCount: number;
  entryIds: string[];
};

type LimitEmailType = "firstLinksLimitEmail" | "secondLinksLimitEmail";

const getLimitEmailType = (percentage: number): LimitEmailType | null => {
  if (percentage < 80) {
    return null;
  }

  if (percentage < 100) {
    return "firstLinksLimitEmail";
  }

  return "secondLinksLimitEmail";
};

const aggregateWorkspaceLinksUsage = (
  entries: RedisStreamEntry<WorkspaceLinksUsageEvent>[],
): {
  updates: WorkspaceLinksUsageAggregate[];
  lastProcessedId: string | null;
} => {
  const aggregatedUsage = new Map<string, WorkspaceLinksUsageAggregate>();
  let lastProcessedId: string | null = null;

  for (const entry of entries) {
    const workspaceId = entry.data.workspaceId;
    const linksCount = Number(entry.data.linksCount);

    if (!workspaceId || !Number.isFinite(linksCount) || linksCount <= 0) {
      continue;
    }

    lastProcessedId = entry.id;

    if (aggregatedUsage.has(workspaceId)) {
      const existing = aggregatedUsage.get(workspaceId)!;
      existing.linksCount += linksCount;
      existing.entryIds.push(entry.id);
      continue;
    }

    aggregatedUsage.set(workspaceId, {
      workspaceId,
      linksCount,
      entryIds: [entry.id],
    });
  }

  return {
    updates: Array.from(aggregatedUsage.values()),
    lastProcessedId,
  };
};

const processWorkspaceLinksUsageBatch = () =>
  workspaceLinksUsageStream.processBatch<WorkspaceLinksUsageEvent>(
    async (entries) => {
      if (!entries || entries.length === 0) {
        return {
          success: true,
          updates: [],
          processedEntryIds: [],
        };
      }

      const { updates, lastProcessedId } =
        aggregateWorkspaceLinksUsage(entries);

      if (updates.length === 0) {
        return {
          success: true,
          updates: [],
          processedEntryIds: [],
        };
      }

      const SUB_BATCH_SIZE = 50;
      const batches: WorkspaceLinksUsageAggregate[][] = [];

      for (let i = 0; i < updates.length; i += SUB_BATCH_SIZE) {
        batches.push(updates.slice(i, i + SUB_BATCH_SIZE));
      }

      const processedEntryIds: string[] = [];
      const errors: { workspaceId: string; error: unknown }[] = [];
      const updatedWorkspaces: (WorkspaceProps & {
        linksUsage: number;
        linksLimit: number;
      })[] = [];
      let totalProcessed = 0;

      for (const batch of batches) {
        const batchResults = await Promise.allSettled(
          batch.map(async (update) => {
            const workspace = await prisma.project.update({
              where: {
                id: update.workspaceId,
              },
              data: {
                linksUsage: {
                  increment: update.linksCount,
                },
                totalLinks: {
                  increment: update.linksCount,
                },
              },
              select: {
                id: true,
                name: true,
                slug: true,
                linksUsage: true,
                linksLimit: true,
                plan: true,
              },
            });

            processedEntryIds.push(...update.entryIds);
            return workspace;
          }),
        );

        batchResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            totalProcessed++;
            updatedWorkspaces.push(
              result.value as (typeof updatedWorkspaces)[number],
            );
            return;
          }

          errors.push({
            workspaceId: batch[index].workspaceId,
            error: result.reason,
          });
        });
      }

      const workspacesAboveThreshold = updatedWorkspaces
        .map((workspace) => {
          const percentage = Math.round(
            (workspace.linksUsage / workspace.linksLimit) * 100,
          );
          const emailType = getLimitEmailType(percentage);

          return {
            workspace,
            percentage,
            emailType,
          };
        })
        .filter(
          (
            item,
          ): item is {
            workspace: (typeof updatedWorkspaces)[number];
            percentage: number;
            emailType: LimitEmailType;
          } => item.emailType !== null,
        );

      const workspaceIds = workspacesAboveThreshold.map(
        ({ workspace }) => workspace.id,
      );
      let notificationsSent = 0;

      if (workspaceIds.length > 0) {
        const sentEmails = await prisma.sentEmail.findMany({
          where: {
            projectId: {
              in: workspaceIds,
            },
            type: {
              in: ["firstLinksLimitEmail", "secondLinksLimitEmail"],
            },
          },
          select: {
            projectId: true,
            type: true,
          },
        });

        const sentEmailSet = new Set(
          sentEmails.map((email) => `${email.projectId}:${email.type}`),
        );

        const users = await prisma.user.findMany({
          where: {
            projects: {
              some: {
                projectId: {
                  in: workspaceIds,
                },
              },
            },
          },
          select: {
            email: true,
            projects: {
              where: {
                projectId: {
                  in: workspaceIds,
                },
              },
              select: {
                projectId: true,
              },
            },
          },
        });

        const emailsByWorkspace = new Map<string, string[]>();
        for (const user of users) {
          if (!user.email) {
            continue;
          }

          for (const project of user.projects) {
            if (!project.projectId) {
              continue;
            }

            const existingEmails =
              emailsByWorkspace.get(project.projectId) ?? [];
            existingEmails.push(user.email);
            emailsByWorkspace.set(project.projectId, existingEmails);
          }
        }

        const notificationResults = await Promise.allSettled(
          workspacesAboveThreshold.map(
            async ({ workspace, percentage, emailType }) => {
              const sentKey = `${workspace.id}:${emailType}`;
              if (sentEmailSet.has(sentKey)) {
                return { skipped: true };
              }

              const emails = emailsByWorkspace.get(workspace.id) ?? [];
              if (emails.length === 0) {
                return { skipped: true };
              }

              await Promise.allSettled([
                sendLimitEmail({
                  emails,
                  workspace: workspace as WorkspaceProps,
                  type: emailType,
                }),
                log({
                  message: `*${workspace.slug}* has used ${percentage.toString()}% of its links limit for the month.`,
                  type: workspace.plan === "free" ? "cron" : "alerts",
                  mention: workspace.plan !== "free",
                }),
              ]);

              return { skipped: false };
            },
          ),
        );

        notificationsSent = notificationResults.filter(
          (result) =>
            result.status === "fulfilled" && result.value.skipped === false,
        ).length;
      }

      return {
        updates,
        errors,
        totalProcessed,
        notificationsSent,
        lastProcessedId,
        processedEntryIds,
      };
    },
    {
      count: BATCH_SIZE,
      deleteAfterRead: true,
    },
  );

export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const {
      updates,
      errors,
      totalProcessed,
      notificationsSent,
      lastProcessedId,
    } = await processWorkspaceLinksUsageBatch();

    if (!updates.length) {
      return NextResponse.json({
        success: true,
        message: "No updates to process",
        processed: 0,
      });
    }

    const streamInfo = await workspaceLinksUsageStream.getStreamInfo();
    const response = {
      success: true,
      processed: totalProcessed,
      notificationsSent,
      errors: errors?.length || 0,
      lastProcessedId,
      streamInfo,
      message: `Successfully processed ${totalProcessed} workspace links usage updates`,
    };

    console.log(response);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to process workspace links usage updates:", error);
    return handleAndReturnErrorResponse(error);
  }
}
