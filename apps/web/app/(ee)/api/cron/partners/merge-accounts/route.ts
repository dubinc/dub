import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { linkCache } from "@/lib/api/links/cache";
import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { conn } from "@/lib/planetscale";
import { storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { sendBatchEmail } from "@dub/email";
import PartnerAccountMerged from "@dub/email/templates/partner-account-merged";
import { prisma } from "@dub/prisma";
import { FraudRuleType } from "@dub/prisma/client";
import { log, prettyPrint, R2_URL } from "@dub/utils";
import * as z from "zod/v4";

export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.string(),
  sourceEmail: z.string(),
  targetEmail: z.string(),
});

const CACHE_KEY_PREFIX = "merge-partner-accounts";

// POST /api/cron/partners/merge-accounts
// This route is used to merge a partner account into another account
export async function POST(req: Request) {
  let userId: string | null = null;

  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const {
      userId: parsedUserId,
      sourceEmail,
      targetEmail,
    } = schema.parse(JSON.parse(rawBody));

    userId = parsedUserId;

    console.log({
      userId,
      sourceEmail,
      targetEmail,
    });

    const partnerAccounts = await prisma.partner.findMany({
      where: {
        email: {
          in: [sourceEmail, targetEmail],
        },
      },
      select: {
        id: true,
        email: true,
        image: true,
        payoutMethodHash: true,
        programs: {
          select: {
            programId: true,
            tenantId: true,
          },
        },
        users: {
          select: {
            userId: true,
          },
        },
        partnerRewinds: true,
      },
    });

    if (partnerAccounts.length === 0) {
      return new Response("Partner accounts not found.");
    }

    const sourceAccount = partnerAccounts.find(
      ({ email }) => email?.toLowerCase() === sourceEmail.toLowerCase(),
    );

    const targetAccount = partnerAccounts.find(
      ({ email }) => email?.toLowerCase() === targetEmail.toLowerCase(),
    );

    if (!sourceAccount) {
      return new Response(
        `Partner account with email ${sourceEmail} not found.`,
      );
    }

    if (!targetAccount) {
      return new Response(
        `Partner account with email ${targetEmail} not found.`,
      );
    }

    if (sourceAccount.id === targetAccount.id) {
      return new Response(
        `Source and target partner accounts must be different. Source account: ${sourceAccount.email} (${sourceAccount.id}), Target account: ${targetAccount.email} (${targetAccount.id})`,
      );
    }

    const {
      id: sourcePartnerId,
      users: sourcePartnerUsers,
      programs: sourcePartnerEnrollments,
    } = sourceAccount;

    const { id: targetPartnerId, programs: targetPartnerEnrollments } =
      targetAccount;

    // Find new enrollments that are not in the target partner enrollments
    const newEnrollments = sourcePartnerEnrollments.filter(
      ({ programId }) =>
        !targetPartnerEnrollments.some(
          ({ programId: targetProgramId }) => programId === targetProgramId,
        ),
    );

    // Update program enrollments
    if (newEnrollments.length > 0) {
      await prisma.programEnrollment.updateMany({
        where: {
          programId: {
            in: newEnrollments.map(({ programId }) => programId),
          },
          partnerId: sourcePartnerId,
        },
        data: {
          partnerId: targetPartnerId,
        },
      });
    }

    const programIdsToTransfer = sourcePartnerEnrollments.map(
      ({ programId }) => programId,
    );

    const updateManyPayload = {
      where: {
        programId: {
          in: programIdsToTransfer,
        },
        partnerId: sourcePartnerId,
      },
      data: {
        partnerId: targetPartnerId,
      },
    };

    // update links, commissions, bounty submissions, and payouts
    if (programIdsToTransfer.length > 0) {
      const [
        updatedLinksRes,
        updatedCustomersRes,
        updatedCommissionsRes,
        updatedPayoutsRes,
      ] = await Promise.all([
        prisma.link.updateMany(updateManyPayload),
        prisma.customer.updateMany(updateManyPayload),
        prisma.commission.updateMany(updateManyPayload),
        prisma.payout.updateMany(updateManyPayload),
      ]);
      console.log(
        `Updated ${updatedLinksRes.count} links, ${updatedCustomersRes.count} customers, ${updatedCommissionsRes.count} commissions, and ${updatedPayoutsRes.count} payouts`,
      );

      // update discount codes, notification emails, messages, and partner comments
      const [
        updatedDiscountCodesRes,
        updatedNotificationEmailsRes,
        updatedMessagesRes,
        updatedPartnerCommentsRes,
      ] = await Promise.all([
        prisma.discountCode.updateMany(updateManyPayload),
        prisma.notificationEmail.updateMany(updateManyPayload),
        prisma.message.updateMany(updateManyPayload),
        prisma.partnerComment.updateMany(updateManyPayload),
      ]);
      console.log(
        `Updated ${updatedDiscountCodesRes.count} discount codes, ${updatedNotificationEmailsRes.count} notification emails, ${updatedMessagesRes.count} messages, and ${updatedPartnerCommentsRes.count} partner comments`,
      );

      const updatedLinks = await prisma.link.findMany({
        where: {
          programId: {
            in: programIdsToTransfer,
          },
          partnerId: targetPartnerId,
        },
        include: {
          ...includeTags,
          ...includeProgramEnrollment,
        },
      });

      // only transfer bounty submissions if the target partner has no submissions for the same bounty
      const bountySubmissionStats = await prisma.bountySubmission.groupBy({
        by: ["bountyId"],
        where: {
          partnerId: {
            in: [sourcePartnerId, targetPartnerId],
          },
        },
        _count: {
          partnerId: true,
        },
      });
      const bountiesToTransfer = bountySubmissionStats
        .filter(({ _count }) => _count.partnerId === 1)
        .map(({ bountyId }) => bountyId);

      if (bountiesToTransfer.length > 0) {
        const updatedBountySubmissions =
          await prisma.bountySubmission.updateMany({
            where: {
              bountyId: { in: bountiesToTransfer },
              partnerId: sourcePartnerId,
            },
            data: {
              partnerId: targetPartnerId,
            },
          });
        console.log(
          `Transferred ${updatedBountySubmissions.count} bounty submissions`,
        );
      }

      const res = await Promise.allSettled([
        // update link metadata in Tinybird
        recordLink(updatedLinks),
        // expire link cache in Redis
        linkCache.expireMany(updatedLinks),
        // Sync total commissions for the target partner in each program
        ...programIdsToTransfer.map((programId) =>
          syncTotalCommissions({
            partnerId: targetPartnerId,
            programId,
            mode: "direct",
          }),
        ),
      ]);
      console.log(prettyPrint(res));
    }

    const existingEnrollments = sourcePartnerEnrollments.filter(
      ({ programId }) =>
        targetPartnerEnrollments.some(
          ({ programId: targetProgramId }) => programId === targetProgramId,
        ),
    );

    if (existingEnrollments.length > 0) {
      for (const sourceEnrollment of existingEnrollments) {
        const targetEnrollment = targetPartnerEnrollments.find(
          ({ programId }) => programId === sourceEnrollment.programId,
        );
        await prisma.$transaction(async (tx) => {
          // delete old source enrollment
          await tx.programEnrollment.delete({
            where: {
              partnerId_programId: {
                partnerId: sourcePartnerId,
                programId: sourceEnrollment.programId,
              },
            },
          });

          // update target enrollment with source enrollment's tenantId if target enrollment does not have a tenantId
          if (sourceEnrollment.tenantId && !targetEnrollment?.tenantId) {
            await tx.programEnrollment.update({
              where: {
                partnerId_programId: {
                  partnerId: targetPartnerId,
                  programId: sourceEnrollment.programId,
                },
              },
              data: {
                tenantId: sourceEnrollment.tenantId,
              },
            });
          }
        });
        console.log(
          `Deleted old source enrollment for program ${sourceEnrollment.programId}.${sourceEnrollment.tenantId ? ` Since there was a tenantId, we updated the target enrollment with the same tenantId: ${sourceEnrollment.tenantId}` : ""}`,
        );
      }
    }

    // If source account has rewind, need to delete and recalculate for the target account
    if (sourceAccount.partnerRewinds.length > 0) {
      const deletedRewinds = await prisma.partnerRewind.deleteMany({
        where: {
          partnerId: sourcePartnerId,
        },
      });
      console.log(`Deleted ${deletedRewinds.count} partner rewinds`);
    }

    // Remove the user if there are no workspaces left
    // TODO: we need to handle deleting multiple users when we allow partners to invite their team members in the future
    const sourcePartnerUser = sourcePartnerUsers[0];

    if (sourcePartnerUser) {
      const workspaceCount = await prisma.projectUsers.count({
        where: {
          userId: sourcePartnerUser.userId,
        },
      });

      if (workspaceCount === 0) {
        try {
          const deletedUser = await prisma.user.delete({
            where: {
              id: sourcePartnerUser.userId,
            },
            select: {
              id: true,
              email: true,
              image: true,
            },
          });
          console.log(`Deleted user ${deletedUser.email} (${deletedUser.id})`);

          if (deletedUser.image) {
            await storage.delete({
              key: deletedUser.image.replace(`${R2_URL}/`, ""),
            });
          }
        } catch (error) {
          console.error(
            `Error deleting user ${sourcePartnerUser.userId}: ${error.message}`,
          );
        }
      }
    }

    // Remove duplicate-payout fraud for the merged-away partner
    if (sourcePartnerId !== targetPartnerId) {
      await prisma.$transaction(async (tx) => {
        await tx.fraudEvent.deleteMany({
          where: {
            partnerId: sourcePartnerId,
            fraudEventGroup: {
              type: FraudRuleType.partnerDuplicatePayoutMethod,
            },
          },
        });

        const eventsWithDuplicateMeta = await tx.fraudEvent.findMany({
          where: {
            fraudEventGroup: {
              type: FraudRuleType.partnerDuplicatePayoutMethod,
              partnerId: { in: [sourcePartnerId, targetPartnerId] },
            },
          },
          select: { id: true, metadata: true },
        });

        const idsFromMetadata = eventsWithDuplicateMeta
          .filter((e) => {
            const meta = e.metadata as Record<string, unknown> | null;
            return meta?.duplicatePartnerId === sourcePartnerId;
          })
          .map((e) => e.id);

        if (idsFromMetadata.length > 0) {
          await tx.fraudEvent.deleteMany({
            where: { id: { in: idsFromMetadata } },
          });
        }

        await tx.fraudEventGroup.deleteMany({
          where: {
            partnerId: sourcePartnerId,
            type: FraudRuleType.partnerDuplicatePayoutMethod,
          },
        });

        const emptyTargetGroups = await tx.fraudEventGroup.findMany({
          where: {
            partnerId: targetPartnerId,
            type: FraudRuleType.partnerDuplicatePayoutMethod,
            fraudEvents: { none: {} },
          },
          select: { id: true },
        });

        if (emptyTargetGroups.length > 0) {
          await tx.fraudEventGroup.deleteMany({
            where: {
              id: { in: emptyTargetGroups.map((g) => g.id) },
            },
          });
        }
      });
    }

    try {
      // Finally, delete the partner account
      await conn.execute(`DELETE FROM Partner WHERE id = ?`, [sourcePartnerId]);
      console.log(
        `Deleted partner ${sourceAccount.email} (${sourceAccount.id})`,
      );

      if (sourceAccount.image) {
        await storage.delete({
          key: sourceAccount.image.replace(`${R2_URL}/`, ""),
        });
      }
    } catch (error) {
      console.error(
        `Error deleting partner ${sourcePartnerId}: ${error.message}`,
      );
    }

    // After merging, check if the fraud condition has been resolved.
    // If no other partners share the same payout method hash, we can
    // automatically resolve any pending fraud groups for this partner.
    if (targetAccount.payoutMethodHash) {
      const duplicatePartners = await prisma.partner.count({
        where: {
          payoutMethodHash: targetAccount.payoutMethodHash,
        },
      });

      if (duplicatePartners <= 1) {
        await resolveFraudGroups({
          where: {
            partnerId: targetPartnerId,
            type: FraudRuleType.partnerDuplicatePayoutMethod,
          },
          resolutionReason:
            "Automatically resolved because partners with duplicate payout methods were merged. No other partners share this payout method.",
        });
      }
    }

    // Make sure the cache is cleared
    await redis.del(`${CACHE_KEY_PREFIX}:${userId}`);

    const resendBatchEmailRes = await sendBatchEmail(
      [
        {
          variant: "notifications",
          to: sourceEmail,
          subject: "Your Dub partner accounts are now merged",
          react: PartnerAccountMerged({
            email: sourceEmail,
            sourceEmail,
            targetEmail,
          }),
        },
        {
          variant: "notifications",
          to: targetEmail,
          subject: "Your Dub partner accounts are now merged",
          react: PartnerAccountMerged({
            email: targetEmail,
            sourceEmail,
            targetEmail,
          }),
        },
      ],
      {
        idempotencyKey: `${CACHE_KEY_PREFIX}/${userId}`,
      },
    );
    console.log(prettyPrint(resendBatchEmailRes));

    return new Response(
      `Partner account ${sourceEmail} merged into ${targetEmail}.`,
    );
  } catch (error) {
    if (userId) {
      await redis.del(`${CACHE_KEY_PREFIX}:${userId}`);
    }

    await log({
      message: `Error merging partner accounts: ${error.message}`,
      type: "alerts",
    });

    return handleAndReturnErrorResponse(error);
  }
}
