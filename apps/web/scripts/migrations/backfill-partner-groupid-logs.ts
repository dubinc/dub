import { buildProgramEnrollmentChangeSet } from "@/lib/api/activity-log/build-program-enrollment-change-set";
import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { prisma } from "@dub/prisma";
import { groupBy } from "@dub/utils";
import { differenceInSeconds } from "date-fns";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

let logsToBackfill: {
  programId: string;
  partnerId: string;
  groupId: string;
  timestamp: Date;
}[] = [];

// Remove the following before running this script:
// - "server-only" from serialize-reward.ts
// - import { logger } from "@/lib/axiom/server" from track-activity-log.ts
async function main() {
  Papa.parse(fs.createReadStream("backfill_group_id_logs.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: {
      data: {
        program_id: string;
        partner_id: string;
        partner_group_id: string;
        timestamp: string;
      };
    }) => {
      logsToBackfill.push({
        programId: result.data.program_id,
        partnerId: result.data.partner_id,
        groupId: result.data.partner_group_id,
        timestamp: new Date(result.data.timestamp),
      });
    },
    complete: async () => {
      const programs = await prisma.program.findMany({
        select: {
          id: true,
          slug: true,
          workspaceId: true,
          workspace: {
            select: {
              users: {
                select: {
                  userId: true,
                },
                orderBy: {
                  createdAt: "asc",
                },
                take: 1,
              },
            },
          },
        },
      });

      for (const program of programs) {
        const filteredLogs = logsToBackfill.filter(
          (log) => log.programId === program.id,
        );
        console.log(
          `Found ${filteredLogs.length} logs to backfill for program ${program.slug}`,
        );

        const groups = await prisma.partnerGroup.findMany({
          where: {
            id: {
              in: filteredLogs.map((log) => log.groupId),
            },
          },
          select: {
            id: true,
            name: true,
          },
        });

        const groupNameMap = new Map(
          groups.map((group) => [group.id, group.name]),
        );

        const activityLogHistory = await prisma.activityLog.findMany({
          where: {
            programId: program.id,
            resourceType: "partner",
          },
        });

        // group by and partner id and sort by timestamp to show chronological order
        const groupedLogs = Object.entries(
          groupBy(filteredLogs, (log) => log.partnerId),
        ).map(([partnerId, logs]) => ({
          partnerId,
          activityLogsToBackfill: logs
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()) // sort by timestamp to show chronological order
            .map((log, idx) => {
              if (idx === 0) return null;
              if (
                activityLogHistory.find(
                  (a) =>
                    a.resourceId === log.partnerId &&
                    differenceInSeconds(a.createdAt, log.timestamp) < 10,
                )
              ) {
                // console.log(
                //   `Skipping log for partner ${log.partnerId} because it already exists in the activity log history`,
                // );
                return null;
              }
              return {
                workspaceId: program.workspaceId,
                programId: log.programId,
                resourceType: "partner" as const,
                resourceId: log.partnerId,
                action: "partner.groupChanged" as const,
                createdAt: log.timestamp,
                userId: program.workspace.users[0].userId,
                changeSet: buildProgramEnrollmentChangeSet({
                  oldEnrollment: {
                    partnerGroup: groupNameMap.get(logs[idx - 1].groupId)
                      ? {
                          id: logs[idx - 1].groupId,
                          name: groupNameMap.get(logs[idx - 1].groupId)!,
                        }
                      : null,
                  },
                  newEnrollment: groupNameMap.get(log.groupId)
                    ? {
                        partnerGroup: groupNameMap.get(log.groupId)
                          ? {
                              id: log.groupId,
                              name: groupNameMap.get(log.groupId)!,
                            }
                          : null,
                      }
                    : null,
                }),
              };
            })
            .filter((log): log is NonNullable<typeof log> => log !== null),
        }));

        const withChanges = groupedLogs.filter(
          (group) => group.activityLogsToBackfill.length,
        );
        console.log(
          `Found ${withChanges.length} partners with activity logs to backfill`,
        );

        await trackActivityLog(
          withChanges.flatMap((group) => group.activityLogsToBackfill),
        );
      }
    },
  });
}

main();
