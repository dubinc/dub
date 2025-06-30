import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { includeTags } from "@/lib/api/links/include-tags";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { recordLink } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import PartnerAccountMerged from "@dub/email/templates/partner-account-merged";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
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

      waitUntil(
        Promise.all([
          recordLink(updatedLinks),

          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-partners`,
            body: {
              partnerId: targetPartnerId,
            },
          }),
        ]),
      );
    }

    // decide if we should delete the actual user account
    const sourcePartnerUser = sourcePartnerUsers[0];

    const workspaceCount = await prisma.projectUsers.count({
      where: {
        userId: sourcePartnerUser.userId,
      },
    });

    if (workspaceCount === 0) {
      await prisma.user.delete({
        where: {
          id: sourcePartnerUser.userId,
        },
      });
    }

    await prisma.partner.delete({
      where: {
        id: sourcePartnerId,
      },
    });

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
    await redis.del(`${CACHE_KEY_PREFIX}:${userId}`);

    await log({
      message: `Error merging partner accounts: ${error.message}`,
      type: "alerts",
    });

    return handleAndReturnErrorResponse(error);
  }
}
