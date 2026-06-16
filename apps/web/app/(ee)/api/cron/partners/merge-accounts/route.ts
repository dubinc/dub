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
import { sendBatchEmail, sendEmail } from "@dub/email";
import PartnerAccountMergeFailed from "@dub/email/templates/partner-account-merge-failed";
import PartnerAccountMerged from "@dub/email/templates/partner-account-merged";
import { prisma } from "@dub/prisma";
import { FraudRuleType, Prisma, ProgramEnrollment } from "@dub/prisma/client";
import { log, prettyPrint, R2_URL } from "@dub/utils";
import * as z from "zod/v4";

export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.string(),
  sourceEmail: z.string(),
  targetEmail: z.string(),
});

const CACHE_KEY_PREFIX = "merge-partner-accounts";

async function transferPartnerProgramData(
  tx: Prisma.TransactionClient,
  {
    sourcePartnerId,
    targetPartnerId,
    programId,
  }: {
    sourcePartnerId: string;
    targetPartnerId: string;
    programId: string;
  },
) {
  const payload = {
    where: {
      programId,
      partnerId: sourcePartnerId,
    },
    data: {
      partnerId: targetPartnerId,
    },
  };

  await Promise.all([
    tx.link.updateMany(payload),
    tx.customer.updateMany(payload),
    tx.commission.updateMany(payload),
    tx.payout.updateMany(payload),
    tx.discountCode.updateMany(payload),
    tx.notificationEmail.updateMany(payload),
    tx.message.updateMany(payload),
    tx.partnerComment.updateMany(payload),
  ]);
}

async function mergeOverlappingProgramEnrollment(
  tx: Prisma.TransactionClient,
  {
    sourceEnrollment,
    targetEnrollment,
    mergeSourcePartnerId,
    mergeTargetPartnerId,
  }: {
    sourceEnrollment: ProgramEnrollment;
    targetEnrollment: ProgramEnrollment;
    mergeSourcePartnerId: string;
    mergeTargetPartnerId: string;
  },
) {
  await transferPartnerProgramData(tx, {
    sourcePartnerId: mergeSourcePartnerId,
    targetPartnerId: mergeTargetPartnerId,
    programId: sourceEnrollment.programId,
  });

  if (
    sourceEnrollment.status === "approved" &&
    ["pending", "invited"].includes(targetEnrollment.status)
  ) {
    await tx.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId: mergeTargetPartnerId,
          programId: sourceEnrollment.programId,
        },
      },
      data: { status: "approved" },
    });
  }

  if (sourceEnrollment.applicationId) {
    await tx.programEnrollment.update({
      where: { id: sourceEnrollment.id },
      data: { applicationId: null },
    });
  }

  await tx.programEnrollment.delete({
    where: { id: sourceEnrollment.id },
  });

  const tenantIdToCopy = targetEnrollment.tenantId ?? sourceEnrollment.tenantId;

  if (tenantIdToCopy && tenantIdToCopy !== targetEnrollment.tenantId) {
    const existingTenantEnrollment = await tx.programEnrollment.findUnique({
      where: {
        tenantId_programId: {
          tenantId: tenantIdToCopy,
          programId: sourceEnrollment.programId,
        },
      },
    });

    if (!existingTenantEnrollment) {
      await tx.programEnrollment.update({
        where: {
          partnerId_programId: {
            partnerId: mergeTargetPartnerId,
            programId: sourceEnrollment.programId,
          },
        },
        data: { tenantId: tenantIdToCopy },
      });
    }
  }
}

async function transferProgramEnrollment(
  tx: Prisma.TransactionClient,
  {
    sourceEnrollment,
    mergeSourcePartnerId,
    mergeTargetPartnerId,
  }: {
    sourceEnrollment: ProgramEnrollment;
    mergeSourcePartnerId: string;
    mergeTargetPartnerId: string;
  },
) {
  await tx.programEnrollment.update({
    where: { id: sourceEnrollment.id },
    data: { partnerId: mergeTargetPartnerId },
  });

  await transferPartnerProgramData(tx, {
    sourcePartnerId: mergeSourcePartnerId,
    targetPartnerId: mergeTargetPartnerId,
    programId: sourceEnrollment.programId,
  });
}

// POST /api/cron/partners/merge-accounts
// This route is used to merge a partner account into another account
export async function POST(req: Request) {
  let userId: string | null = null;
  let sourceEmail: string | null = null;
  let targetEmail: string | null = null;
  let sourcePartnerId: string | null = null;
  let targetPartnerId: string | null = null;
  let mergedProgramIds: string[] = [];

  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const {
      userId: parsedUserId,
      sourceEmail: parsedSourceEmail,
      targetEmail: parsedTargetEmail,
    } = schema.parse(JSON.parse(rawBody));

    userId = parsedUserId;
    sourceEmail = parsedSourceEmail;
    targetEmail = parsedTargetEmail;

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
      ({ email }) => email?.toLowerCase() === sourceEmail!.toLowerCase(),
    );

    const targetAccount = partnerAccounts.find(
      ({ email }) => email?.toLowerCase() === targetEmail!.toLowerCase(),
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

    const mergeSourcePartnerId = sourceAccount.id;
    const mergeTargetPartnerId = targetAccount.id;
    sourcePartnerId = mergeSourcePartnerId;
    targetPartnerId = mergeTargetPartnerId;

    const { users: sourcePartnerUsers } = sourceAccount;

    const [sourceEnrollments, targetEnrollments] = await Promise.all([
      prisma.programEnrollment.findMany({
        where: { partnerId: mergeSourcePartnerId },
      }),
      prisma.programEnrollment.findMany({
        where: { partnerId: mergeTargetPartnerId },
      }),
    ]);

    const targetEnrollmentByProgramId = new Map(
      targetEnrollments.map((enrollment) => [enrollment.programId, enrollment]),
    );

    const overlappingEnrollments = sourceEnrollments.filter((enrollment) =>
      targetEnrollmentByProgramId.has(enrollment.programId),
    );

    const transferEnrollments = sourceEnrollments.filter(
      (enrollment) => !targetEnrollmentByProgramId.has(enrollment.programId),
    );

    // Overlaps first, then transfers. Re-check target enrollment inside each
    // transaction so a stale read cannot trigger [partnerId, programId] errors.
    for (const sourceEnrollment of [
      ...overlappingEnrollments,
      ...transferEnrollments,
    ]) {
      let mergedAsOverlap = false;

      await prisma.$transaction(async (tx) => {
        const targetEnrollment = await tx.programEnrollment.findUnique({
          where: {
            partnerId_programId: {
              partnerId: mergeTargetPartnerId,
              programId: sourceEnrollment.programId,
            },
          },
        });

        if (targetEnrollment) {
          mergedAsOverlap = true;
          await mergeOverlappingProgramEnrollment(tx, {
            sourceEnrollment,
            targetEnrollment,
            mergeSourcePartnerId,
            mergeTargetPartnerId,
          });
          return;
        }

        await transferProgramEnrollment(tx, {
          sourceEnrollment,
          mergeSourcePartnerId,
          mergeTargetPartnerId,
        });
      });

      mergedProgramIds.push(sourceEnrollment.programId);

      console.log(
        mergedAsOverlap
          ? `Merged overlapping enrollment for program ${sourceEnrollment.programId}`
          : `Transferred enrollment for program ${sourceEnrollment.programId}`,
      );
    }

    const programIdsToTransfer = sourceEnrollments.map(
      ({ programId }) => programId,
    );

    if (programIdsToTransfer.length > 0) {
      const updatedLinks = await prisma.link.findMany({
        where: {
          programId: {
            in: programIdsToTransfer,
          },
          partnerId: mergeTargetPartnerId,
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
            in: [mergeSourcePartnerId, mergeTargetPartnerId],
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
              partnerId: mergeSourcePartnerId,
            },
            data: {
              partnerId: mergeTargetPartnerId,
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
            partnerId: mergeTargetPartnerId,
            programId,
          }),
        ),
      ]);
      console.log(prettyPrint(res));
    }

    // If source account has rewind, need to delete and recalculate for the target account
    if (sourceAccount.partnerRewinds.length > 0) {
      const deletedRewinds = await prisma.partnerRewind.deleteMany({
        where: {
          partnerId: mergeSourcePartnerId,
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

    const fraudEventsToDelete = await prisma.fraudEvent.findMany({
      where: {
        partnerId: mergeSourcePartnerId,
        fraudEventGroup: {
          type: FraudRuleType.partnerDuplicateAccount,
        },
      },
      include: {
        fraudEventGroup: {
          select: {
            id: true,
            _count: {
              select: {
                fraudEvents: true,
              },
            },
          },
        },
      },
    });

    if (fraudEventsToDelete.length > 0) {
      await prisma.fraudEvent.deleteMany({
        where: {
          id: { in: fraudEventsToDelete.map((e) => e.id) },
        },
      });
    }

    const fraudEventGroupsToResolve = fraudEventsToDelete.filter(
      // this is the count pre-deletion the fraud event, so if there are 2 fraud events
      // that means post-deletion will leave 1 fraud event in the group (no additional duplicates), hence can be resolved
      (e) => e.fraudEventGroup._count.fraudEvents === 2,
    );

    await resolveFraudGroups({
      where: {
        OR: [
          {
            partnerId: mergeSourcePartnerId,
          },
          ...(fraudEventGroupsToResolve.length > 0
            ? [
                {
                  id: {
                    in: fraudEventGroupsToResolve.map(
                      (e) => e.fraudEventGroup.id,
                    ),
                  },
                },
              ]
            : []),
        ],
        type: FraudRuleType.partnerDuplicateAccount,
      },
      resolutionReason:
        "Automatically resolved because partners with duplicate payout methods were merged. No other partners share this payout method.",
    });

    try {
      // Finally, delete the partner account
      await conn.execute(`DELETE FROM Partner WHERE id = ?`, [
        mergeSourcePartnerId,
      ]);
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
        `Error deleting partner ${mergeSourcePartnerId}: ${error.message}`,
      );
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

    const partialMergeNote =
      mergedProgramIds.length > 0
        ? ` Partial merge: ${mergedProgramIds.length} program(s) already merged (${mergedProgramIds.join(", ")}). Manual cleanup may be required.`
        : "";

    await log({
      message: `Error merging partner accounts: userId=${userId}, sourcePartnerId=${sourcePartnerId}, targetPartnerId=${targetPartnerId}, error=${error.message}.${partialMergeNote}`,
      type: "alerts",
      mention: true,
    });

    if (targetEmail) {
      try {
        await sendEmail({
          variant: "notifications",
          to: targetEmail,
          subject: "We couldn't merge your Dub partner accounts",
          react: PartnerAccountMergeFailed({ email: targetEmail }),
        });
      } catch (emailError) {
        console.error(
          `Error sending merge failure email: ${emailError.message}`,
        );
      }
    }

    return handleAndReturnErrorResponse(error);
  }
}
