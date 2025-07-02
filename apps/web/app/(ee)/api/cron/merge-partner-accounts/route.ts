import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { includeTags } from "@/lib/api/links/include-tags";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { resend, unsubscribe } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
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

    // update links, commissions, and payouts
    if (programIdsToTransfer.length > 0) {
      await Promise.all([
        prisma.link.updateMany({
          where: {
            programId: {
              in: programIdsToTransfer,
            },
            partnerId: sourcePartnerId,
          },
          data: {
            partnerId: targetPartnerId,
          },
        }),

        prisma.commission.updateMany({
          where: {
            programId: {
              in: programIdsToTransfer,
            },
            partnerId: sourcePartnerId,
          },
          data: {
            partnerId: targetPartnerId,
          },
        }),

        prisma.payout.updateMany({
          where: {
            programId: {
              in: programIdsToTransfer,
            },
            partnerId: sourcePartnerId,
          },
          data: {
            partnerId: targetPartnerId,
          },
        }),
      ]);

      const updatedLinks = await prisma.link.findMany({
        where: {
          programId: {
            in: programIdsToTransfer,
          },
          partnerId: targetPartnerId,
        },
        include: includeTags,
      });

      await Promise.all([
        // update link metadata in Tinybird
        recordLink(updatedLinks),
        // expire link cache in Redis
        linkCache.expireMany(updatedLinks),
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
        const deletedUser = await prisma.user.delete({
          where: {
            id: sourcePartnerUser.userId,
          },
          select: {
            image: true,
            email: true,
          },
        });

        await Promise.all([
          deletedUser.image
            ? storage.delete(deletedUser.image.replace(`${R2_URL}/`, ""))
            : Promise.resolve(),

          unsubscribe({
            email: deletedUser.email!,
          }),
        ]);
      }
    }

    // Finally, delete the partner account
    const deletedPartner = await prisma.partner.delete({
      where: {
        id: sourcePartnerId,
      },
    });

    await Promise.all([
      deletedPartner.image
        ? storage.delete(deletedPartner.image.replace(`${R2_URL}/`, ""))
        : Promise.resolve(),

      unsubscribe({
        email: sourceEmail,
        audience: "partners.dub.co",
      }),
    ]);

    // Make sure the cache is cleared
    await redis.del(`${CACHE_KEY_PREFIX}:${userId}`);

    await resend?.batch.send([
      {
        from: VARIANT_TO_FROM_MAP.notifications,
        to: sourceEmail,
        subject: "Your Dub partner accounts are now merged",
        react: PartnerAccountMerged({
          email: sourceEmail,
          sourceEmail,
          targetEmail,
        }),
      },
      {
        from: VARIANT_TO_FROM_MAP.notifications,
        to: targetEmail,
        subject: "Your Dub partner accounts are now merged",
        react: PartnerAccountMerged({
          email: targetEmail,
          sourceEmail,
          targetEmail,
        }),
      },
    ]);

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
