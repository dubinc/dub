import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { linkCache } from "@/lib/api/links/cache";
import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { sendBatchEmail } from "@dub/email";
import PartnerAccountMerged from "@dub/email/templates/partner-account-merged";
import { prisma } from "@dub/prisma";
import { log, R2_URL } from "@dub/utils";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.string(),
  sourceEmail: z.string(),
  targetEmail: z.string(),
});

const CACHE_KEY_PREFIX = "merge-partner-accounts";

// POST /api/cron/merge-partner-accounts
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
        payoutMethodHash: true,
        programs: {
          select: {
            programId: true,
          },
        },
        users: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (partnerAccounts.length === 0) {
      return new Response("Partner accounts not found.");
    }

    const sourceAccount = partnerAccounts.find(
      ({ email }) => email === sourceEmail,
    );

    const targetAccount = partnerAccounts.find(
      ({ email }) => email === targetEmail,
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
      await Promise.all([
        prisma.link.updateMany(updateManyPayload),
        prisma.commission.updateMany(updateManyPayload),
        prisma.payout.updateMany(updateManyPayload),
      ]);

      // update notification emails, messages, and partner comments
      await Promise.all([
        prisma.notificationEmail.updateMany(updateManyPayload),
        prisma.message.updateMany(updateManyPayload),
        prisma.partnerComment.updateMany(updateManyPayload),
      ]);

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

      // Bounty submissions to transfer to the target partner
      const bountySubmissions = await prisma.bountySubmission.findMany({
        where: {
          programId: {
            in: programIdsToTransfer,
          },
          partnerId: sourcePartnerId,
        },
      });

      // Attempting to update all source submissions to the target partnerId fails
      // if the target already has submissions for the same bounties.
      if (bountySubmissions.length > 0) {
        await Promise.allSettled(
          bountySubmissions.map((submission) =>
            prisma.bountySubmission.update({
              where: {
                id: submission.id,
              },
              data: {
                partnerId: targetPartnerId,
              },
            }),
          ),
        );
      }

      await Promise.allSettled([
        // update link metadata in Tinybird
        recordLink(updatedLinks),
        // expire link cache in Redis
        linkCache.expireMany(updatedLinks),
        // Sync total commissions for the target partner in each program
        ...programIdsToTransfer.map((programId) =>
          syncTotalCommissions({
            partnerId: targetPartnerId,
            programId,
          }),
        ),
      ]);
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
              image: true,
              email: true,
            },
          });

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

    try {
      // Finally, delete the partner account
      const deletedPartner = await prisma.partner.delete({
        where: {
          id: sourcePartnerId,
        },
      });

      if (deletedPartner.image) {
        await storage.delete({
          key: deletedPartner.image.replace(`${R2_URL}/`, ""),
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
            type: "partnerDuplicatePayoutMethod",
          },
          resolutionReason:
            "Automatically resolved because partners with duplicate payout methods were merged. No other partners share this payout method.",
        });
      }
    }

    // Make sure the cache is cleared
    await redis.del(`${CACHE_KEY_PREFIX}:${userId}`);

    await sendBatchEmail(
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
        idempotencyKey: `merge-partner-accounts/${userId}`,
      },
    );

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
