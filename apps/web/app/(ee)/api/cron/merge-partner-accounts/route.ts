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
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { userId, sourceEmail, targetEmail } = schema.parse(
      JSON.parse(rawBody),
    );

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

    const sourcePartnerId = sourceAccount.id;
    const targetPartnerId = targetAccount.id;

    const [sourcePartnerEnrollments, targetPartnerEnrollments] =
      await Promise.all([
        prisma.programEnrollment.findMany({
          where: {
            partnerId: sourcePartnerId,
          },
          select: {
            id: true,
            programId: true,
          },
        }),

        prisma.programEnrollment.findMany({
          where: {
            partnerId: targetPartnerId,
          },
          select: {
            id: true,
            programId: true,
          },
        }),
      ]);

    const programIdsToTransfer = sourcePartnerEnrollments.map(
      ({ programId }) => programId,
    );

    // Find new enrollments that are not in the target partner enrollments
    const newEnrollments = sourcePartnerEnrollments.filter(
      ({ programId }) =>
        !targetPartnerEnrollments.some(
          ({ programId: targetProgramId }) => programId === targetProgramId,
        ),
    );

    // Update program enrollments
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

    // Update partner links
    await prisma.link.updateMany({
      where: {
        programId: {
          in: programIdsToTransfer,
        },
        partnerId: sourcePartnerId,
      },
      data: {
        partnerId: targetPartnerId,
      },
    });

    // Update partner commissions
    await prisma.commission.updateMany({
      where: {
        programId: {
          in: programIdsToTransfer,
        },
        partnerId: sourcePartnerId,
      },
      data: {
        partnerId: targetPartnerId,
      },
    });

    // Update partner payouts
    await prisma.payout.updateMany({
      where: {
        programId: {
          in: programIdsToTransfer,
        },
        partnerId: sourcePartnerId,
      },
      data: {
        partnerId: targetPartnerId,
      },
    });

    // Delete source partner
    await prisma.partner.delete({
      where: {
        id: sourcePartnerId,
      },
    });

    await redis.del(`${CACHE_KEY_PREFIX}:${userId}`);

    // Invalidate links
    const updatedLinks = await prisma.link.findMany({
      where: {
        programId: {
          in: programIdsToTransfer,
        },
        partnerId: targetPartnerId,
      },
      include: includeTags,
    });

    // Record the updatedlinks
    await recordLink(updatedLinks);

    // Invalidate links for target partner
    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-partners`,
      body: {
        partnerId: targetPartnerId,
      },
    });

    // Send email to source and target partners
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

    return new Response("Partner accounts merged.");
  } catch (error) {
    await log({
      message: `Error merging partner accounts: ${error.message}`,
      type: "alerts",
    });

    return handleAndReturnErrorResponse(error);
  }
}
