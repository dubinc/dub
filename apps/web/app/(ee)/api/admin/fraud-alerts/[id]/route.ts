import { trackActivityLog } from "@/lib/api/activity-log/track-activity-log";
import { reportCrossProgramBanToNetwork } from "@/lib/api/fraud/report-cross-program-ban-to-network";
import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { withAdmin } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { MAX_FRAUD_REASON_LENGTH } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import {
  PartnerBannedReason,
  Prisma,
  ProgramEnrollmentStatus,
} from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const banPartnerQueue = qstash.queue({
  queueName: "ban-partner",
});

const reviewSchema = z.object({
  status: z.enum(["confirmed", "dismissed"]),
  reviewNote: z.string().trim().max(MAX_FRAUD_REASON_LENGTH).optional(),
});

// PATCH /api/admin/fraud-alerts/[id]
export const PATCH = withAdmin(
  async ({ req, params, session }) => {
    const { id } = params;
    const { status: newStatus, reviewNote } = reviewSchema.parse(
      await req.json(),
    );

    const fraudAlert = await prisma.fraudAlert.findUnique({
      where: {
        id,
      },
    });

    if (!fraudAlert) {
      return new Response("Fraud alert not found.", { status: 404 });
    }

    const reviewedAt = new Date();
    const reviewData: Prisma.FraudAlertUpdateManyArgs["data"] = {
      reviewedAt,
      reviewNote: reviewNote || null,
      reviewedById: session.user.id,
    };

    if (newStatus === "dismissed") {
      const { count } = await prisma.fraudAlert.updateMany({
        where: {
          id,
          status: "pending",
        },
        data: {
          status: "dismissed",
          ...reviewData,
        },
      });

      if (count === 0) {
        return new Response("Fraud alert has already been reviewed.", {
          status: 409,
        });
      }

      return NextResponse.json({ success: true });
    }

    if (fraudAlert.status !== "pending") {
      return new Response("Fraud alert has already been reviewed.", {
        status: 409,
      });
    }

    const reviewerUserId = session.user.id;

    const { claimCount, confirmedAlerts, bansForSideEffects } =
      await prisma.$transaction(async (tx) => {
        const claim = await tx.fraudAlert.updateMany({
          where: {
            partnerId: fraudAlert.partnerId,
            status: "pending",
          },
          data: {
            status: "confirmed",
            ...reviewData,
          },
        });

        if (claim.count === 0) {
          return {
            claimCount: 0 as const,
            confirmedAlerts: [],
            bansForSideEffects: [],
          };
        }

        const confirmedAlerts = await tx.fraudAlert.findMany({
          where: {
            partnerId: fraudAlert.partnerId,
            status: "confirmed",
            reviewedAt,
            reviewedById: reviewerUserId,
          },
          select: {
            id: true,
            reason: true,
            programEnrollment: {
              select: {
                programId: true,
                partnerId: true,
                status: true,
                bannedReason: true,
                bannedAt: true,
              },
            },
          },
        });

        const bansForSideEffects: Array<{
          programId: string;
          partnerId: string;
          workspaceId: string;
          previousStatus: ProgramEnrollmentStatus;
        }> = [];

        const bannedRejectedKey = new Set<string>();

        for (const fa of confirmedAlerts) {
          const { programId, partnerId, status } = fa.programEnrollment;
          if (status !== ProgramEnrollmentStatus.rejected) {
            continue;
          }
          const key = `${programId}:${partnerId}`;
          if (bannedRejectedKey.has(key)) {
            continue;
          }

          const enrollment = await tx.programEnrollment.findUnique({
            where: {
              partnerId_programId: {
                partnerId,
                programId,
              },
            },
            include: {
              program: {
                select: {
                  workspaceId: true,
                },
              },
            },
          });

          if (
            !enrollment ||
            enrollment.status !== ProgramEnrollmentStatus.rejected
          ) {
            continue;
          }

          bannedRejectedKey.add(key);

          await tx.programEnrollment.update({
            where: {
              partnerId_programId: {
                partnerId,
                programId,
              },
            },
            data: {
              status: ProgramEnrollmentStatus.banned,
              bannedAt: new Date(),
              bannedReason: PartnerBannedReason.fraud,
              clickRewardId: null,
              leadRewardId: null,
              saleRewardId: null,
              discountId: null,
            },
          });

          bansForSideEffects.push({
            programId,
            partnerId,
            workspaceId: enrollment.program.workspaceId,
            previousStatus: enrollment.status,
          });
        }

        return { claimCount: claim.count, confirmedAlerts, bansForSideEffects };
      });

    if (claimCount === 0) {
      return new Response("Fraud alert has already been reviewed.", {
        status: 409,
      });
    }

    const postConfirmTasks: Promise<unknown>[] = [];

    for (const {
      programId,
      partnerId,
      workspaceId,
      previousStatus,
    } of bansForSideEffects) {
      postConfirmTasks.push(
        resolveFraudGroups({
          where: {
            programId,
            partnerId,
          },
          userId: reviewerUserId,
          resolutionReason:
            "Resolved automatically because Dub confirmed fraud (rejected enrollment).",
        }),
        trackActivityLog({
          workspaceId,
          programId,
          resourceType: "partner",
          resourceId: partnerId,
          userId: reviewerUserId,
          action: "partner.banned",
          changeSet: {
            status: {
              old: previousStatus,
              new: "banned",
            },
          },
        }),
        banPartnerQueue.enqueueJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partners/ban`,
          deduplicationId: `ban-${programId}-${partnerId}`,
          method: "POST",
          body: {
            programId,
            partnerId,
          },
        }),
      );
    }

    const fraudReasonByEnrollmentKey = new Map<string, string>();
    for (const fa of confirmedAlerts) {
      const pk = `${fa.programEnrollment.programId}:${fa.programEnrollment.partnerId}`;
      if (!fraudReasonByEnrollmentKey.has(pk)) {
        fraudReasonByEnrollmentKey.set(pk, fa.reason);
      }
    }

    const crossProgramSourceKeys = new Set(
      bansForSideEffects.map((b) => `${b.programId}:${b.partnerId}`),
    );

    for (const key of crossProgramSourceKeys) {
      const delimiter = key.indexOf(":");
      const programId = key.slice(0, delimiter);
      const partnerId = key.slice(delimiter + 1);

      const enrollment = await prisma.programEnrollment.findUnique({
        where: {
          partnerId_programId: {
            partnerId,
            programId,
          },
        },
        select: {
          bannedReason: true,
          bannedAt: true,
        },
      });

      if (enrollment?.bannedReason == null || enrollment.bannedAt == null) {
        continue;
      }

      postConfirmTasks.push(
        reportCrossProgramBanToNetwork({
          partnerId,
          programId,
          bannedReason: enrollment.bannedReason,
          bannedAt: enrollment.bannedAt,
          fraudAlertReason: fraudReasonByEnrollmentKey.get(key) ?? "",
        }),
      );
    }

    waitUntil(Promise.allSettled(postConfirmTasks));

    return NextResponse.json({ success: true });
  },
  {
    requiredRoles: ["owner"],
  },
);
