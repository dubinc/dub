import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { linkCache } from "@/lib/api/links/cache";
import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { logger } from "@/lib/axiom/server";
import { getWorkflowConfig } from "@/lib/cron/qstash-workflow";
import { conn } from "@/lib/planetscale";
import { storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { sendBatchEmail } from "@dub/email";
import PartnerAccountMerged from "@dub/email/templates/partner-account-merged";
import { prisma } from "@dub/prisma";
import { FraudRuleType } from "@dub/prisma/client";
import { log, prettyPrint, R2_URL } from "@dub/utils";
import { serve } from "@upstash/workflow/nextjs";
import * as z from "zod/v4";
import { logAndReturn } from "../../cron/utils";

const inputSchema = z.object({
  userId: z.string(),
  sourceEmail: z.string(),
  targetEmail: z.string(),
});

type Input = z.infer<typeof inputSchema>;

const CACHE_KEY_PREFIX = "merge-partner-accounts";
const MERGE_BATCH_SIZE = 500;

/**
 * Steps:
 * 1. load-merge-plan: resolve + validate accounts, build the ordered list of
 *    source enrollments to process (overlaps first, then transfers).
 * 2. merge-enrollment-<id> (one per enrollment): transfer the enrollment's
 *    program data to the target and either merge into the existing target
 *    enrollment (overlap) or move the enrollment over (transfer).
 * 3. transfer-bounty-submissions
 * 4. sync-links-and-commissions
 * 5. delete-partner-rewinds
 * 6. delete-source-user
 * 7. cleanup-fraud-events
 * 8. delete-source-partner
 * 9. send-merged-emails
 */

// POST /api/workflows/merge-partner-account
export const { POST } = serve<Input>(
  async (context) => {
    const { userId, sourceEmail, targetEmail } = context.requestPayload;

    // Step 1: Resolve + validate accounts and build the merge plan
    const plan = await context.run("load-merge-plan", async () => {
      return await loadMergePlan({ sourceEmail, targetEmail });
    });

    if (!plan.proceed) {
      console.log(`Skipping merge: ${plan.reason}`);
      return;
    }

    const {
      sourcePartnerId,
      targetPartnerId,
      sourceImage,
      sourceUserId,
      hasRewinds,
      orderedSourceEnrollmentIds,
      programIdsToTransfer,
    } = plan;

    // Step 2: Merge each source enrollment in its own durable step.
    // Overlaps are ordered first, then transfers. Each step re-fetches the
    // live enrollment so it is safe to retry after a partial run.
    for (const enrollmentId of orderedSourceEnrollmentIds) {
      await context.run(`merge-enrollment-${enrollmentId}`, async () => {
        return await mergeSingleEnrollment({
          enrollmentId,
          sourcePartnerId,
          targetPartnerId,
        });
      });
    }

    // Step 3: Transfer bounty submissions (only when the target has none for the same bounty)
    await context.run("transfer-bounty-submissions", async () => {
      if (programIdsToTransfer.length === 0) {
        return logAndReturn({
          outputLog: "No programs to transfer bounties for.",
        });
      }

      return await transferBountySubmissions({
        sourcePartnerId,
        targetPartnerId,
      });
    });

    // Step 4: Sync transferred links (Tinybird + cache) and total commissions
    await context.run("sync-links-and-commissions", async () => {
      if (programIdsToTransfer.length === 0) {
        return logAndReturn({ outputLog: "No programs to sync." });
      }

      return await syncLinksAndCommissions({
        targetPartnerId,
        programIdsToTransfer,
      });
    });

    // Step 5: Delete the source partner's rewinds (target will be recalculated separately)
    if (hasRewinds) {
      await context.run("delete-partner-rewinds", async () => {
        const deletedRewinds = await prisma.partnerRewind.deleteMany({
          where: { partnerId: sourcePartnerId },
        });

        return logAndReturn({
          outputLog: `Deleted ${deletedRewinds.count} partner rewinds`,
        });
      });
    }

    // Step 6: Remove the source user if there are no workspaces left
    if (sourceUserId) {
      await context.run("delete-source-user", async () => {
        return await deleteSourceUser({ sourceUserId });
      });
    }

    // Step 7: Clean up duplicate-account fraud events + resolve their groups
    await context.run("cleanup-fraud-events", async () => {
      return await cleanupFraudEvents({ sourcePartnerId });
    });

    // Step 8: Delete the source partner account
    await context.run("delete-source-partner", async () => {
      return await deleteSourcePartner({
        sourcePartnerId,
        sourceEmail,
        sourceImage,
      });
    });

    // Step 9: Clear the verification cache and notify both accounts
    await context.run("send-merged-emails", async () => {
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

      return logAndReturn({
        outputLog: `Partner account ${sourceEmail} merged into ${targetEmail}. ${prettyPrint(resendBatchEmailRes)}`,
      });
    });
  },
  {
    initialPayloadParser: (requestPayload) => {
      return inputSchema.parse(JSON.parse(requestPayload));
    },
    failureFunction: async ({
      context,
      failStatus,
      failResponse,
      failHeaders,
    }) => {
      const { userId } = inputSchema.parse(context.requestPayload);

      // Clear the verification cache so the partner can retry from the start
      await redis.del(`${CACHE_KEY_PREFIX}:${userId}`);

      const { correlation } = getWorkflowConfig({
        workflowType: "merge-partner-account",
        body: context.requestPayload,
      });

      await log({
        message: `Error merging partner accounts: ${JSON.stringify(correlation)}, workflowRunId=${context.workflowRunId}, failStatus=${failStatus}, failResponse=${failResponse}. Some enrollments may already be merged (see workflow run for completed steps) - manual cleanup may be required.`,
        type: "alerts",
        mention: true,
      });

      logger.error("workflow.failed", {
        service: "qstash",
        event: "workflow.failed",
        workflowType: "merge-partner-account",
        workflowRunId: context.workflowRunId,
        failStatus,
        failResponse,
        failHeaders,
        correlation,
      });

      await logger.flush();
    },
  },
);

type MergePlan =
  | { proceed: false; reason: string }
  | {
      proceed: true;
      sourcePartnerId: string;
      targetPartnerId: string;
      sourceImage: string | null;
      sourceUserId: string | null;
      hasRewinds: boolean;
      orderedSourceEnrollmentIds: string[];
      programIdsToTransfer: string[];
    };

async function loadMergePlan({
  sourceEmail,
  targetEmail,
}: {
  sourceEmail: string;
  targetEmail: string;
}): Promise<MergePlan> {
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
    return { proceed: false, reason: "Partner accounts not found." };
  }

  const sourceAccount = partnerAccounts.find(
    ({ email }) => email?.toLowerCase() === sourceEmail.toLowerCase(),
  );

  const targetAccount = partnerAccounts.find(
    ({ email }) => email?.toLowerCase() === targetEmail.toLowerCase(),
  );

  if (!sourceAccount) {
    return {
      proceed: false,
      reason: `Partner account with email ${sourceEmail} not found.`,
    };
  }

  if (!targetAccount) {
    return {
      proceed: false,
      reason: `Partner account with email ${targetEmail} not found.`,
    };
  }

  if (sourceAccount.id === targetAccount.id) {
    return {
      proceed: false,
      reason: `Source and target partner accounts must be different. Source account: ${sourceAccount.email} (${sourceAccount.id}), Target account: ${targetAccount.email} (${targetAccount.id})`,
    };
  }

  const sourcePartnerId = sourceAccount.id;
  const targetPartnerId = targetAccount.id;

  const [sourceEnrollments, targetEnrollments] = await Promise.all([
    prisma.programEnrollment.findMany({
      where: { partnerId: sourcePartnerId },
      select: { id: true, programId: true },
    }),
    prisma.programEnrollment.findMany({
      where: { partnerId: targetPartnerId },
      select: { programId: true },
    }),
  ]);

  const targetProgramIds = new Set(
    targetEnrollments.map((enrollment) => enrollment.programId),
  );

  const overlappingEnrollments = sourceEnrollments.filter((enrollment) =>
    targetProgramIds.has(enrollment.programId),
  );

  const transferEnrollments = sourceEnrollments.filter(
    (enrollment) => !targetProgramIds.has(enrollment.programId),
  );

  // Overlaps first, then transfers (preserves the original processing order).
  const orderedSourceEnrollmentIds = [
    ...overlappingEnrollments,
    ...transferEnrollments,
  ].map(({ id }) => id);

  return {
    proceed: true,
    sourcePartnerId,
    targetPartnerId,
    sourceImage: sourceAccount.image,
    sourceUserId: sourceAccount.users[0]?.userId ?? null,
    hasRewinds: sourceAccount.partnerRewinds.length > 0,
    orderedSourceEnrollmentIds,
    programIdsToTransfer: sourceEnrollments.map(({ programId }) => programId),
  };
}

async function transferRowsInBatches(updateBatch: () => Promise<number>) {
  while (true) {
    const count = await updateBatch();
    if (count < MERGE_BATCH_SIZE) {
      break;
    }
  }
}

async function transferPartnerProgramData({
  sourcePartnerId,
  targetPartnerId,
  programId,
}: {
  sourcePartnerId: string;
  targetPartnerId: string;
  programId: string;
}) {
  const where = {
    programId,
    partnerId: sourcePartnerId,
  };
  const payload = {
    where,
    data: {
      partnerId: targetPartnerId,
    },
  };

  await Promise.all([
    // High-volume tables: move in batches of MERGE_BATCH_SIZE
    transferRowsInBatches(
      async () =>
        (
          await prisma.commission.updateMany({
            ...payload,
            limit: MERGE_BATCH_SIZE,
          })
        ).count,
    ),
    transferRowsInBatches(
      async () =>
        (
          await prisma.link.updateMany({
            ...payload,
            limit: MERGE_BATCH_SIZE,
          })
        ).count,
    ),
    transferRowsInBatches(
      async () =>
        (
          await prisma.customer.updateMany({
            ...payload,
            limit: MERGE_BATCH_SIZE,
          })
        ).count,
    ),
    transferRowsInBatches(
      async () =>
        (
          await prisma.payout.updateMany({
            ...payload,
            limit: MERGE_BATCH_SIZE,
          })
        ).count,
    ),
    // Low-volume tables: single updateMany is fine
    prisma.discountCode.updateMany(payload),
    prisma.notificationEmail.updateMany(payload),
    prisma.message.updateMany(payload),
    prisma.partnerComment.updateMany(payload),
  ]);
}

async function mergeSingleEnrollment({
  enrollmentId,
  sourcePartnerId,
  targetPartnerId,
}: {
  enrollmentId: string;
  sourcePartnerId: string;
  targetPartnerId: string;
}) {
  const sourceEnrollment = await prisma.programEnrollment.findUnique({
    where: { id: enrollmentId },
  });

  if (!sourceEnrollment) {
    return logAndReturn({
      programId: null,
      action: "skip",
      outputLog: `Enrollment ${enrollmentId} no longer exists, skipping`,
    });
  }

  if (sourceEnrollment.partnerId === targetPartnerId) {
    return logAndReturn({
      programId: sourceEnrollment.programId,
      action: "skip",
      outputLog: `Enrollment ${enrollmentId} already on target partner, skipping`,
    });
  }

  const { programId } = sourceEnrollment;

  const targetEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId: targetPartnerId,
        programId,
      },
    },
  });

  await transferPartnerProgramData({
    sourcePartnerId,
    targetPartnerId,
    programId,
  });

  if (targetEnrollment) {
    await prisma.$transaction(async (tx) => {
      if (
        sourceEnrollment.status === "approved" &&
        ["pending", "invited"].includes(targetEnrollment.status)
      ) {
        await tx.programEnrollment.update({
          where: {
            partnerId_programId: {
              partnerId: targetPartnerId,
              programId,
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

      const tenantIdToCopy =
        targetEnrollment.tenantId ?? sourceEnrollment.tenantId;

      if (tenantIdToCopy && tenantIdToCopy !== targetEnrollment.tenantId) {
        const existingTenantEnrollment = await tx.programEnrollment.findUnique({
          where: {
            tenantId_programId: {
              tenantId: tenantIdToCopy,
              programId,
            },
          },
        });

        if (!existingTenantEnrollment) {
          await tx.programEnrollment.update({
            where: {
              partnerId_programId: {
                partnerId: targetPartnerId,
                programId,
              },
            },
            data: { tenantId: tenantIdToCopy },
          });
        }
      }
    });

    return logAndReturn({
      programId,
      action: "overlap",
      outputLog: `Merged overlapping enrollment for program ${programId}`,
    });
  }

  await prisma.programEnrollment.update({
    where: { id: sourceEnrollment.id },
    data: { partnerId: targetPartnerId },
  });

  return logAndReturn({
    programId,
    action: "transfer",
    outputLog: `Transferred enrollment for program ${programId}`,
  });
}

async function transferBountySubmissions({
  sourcePartnerId,
  targetPartnerId,
}: {
  sourcePartnerId: string;
  targetPartnerId: string;
}) {
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

  if (bountiesToTransfer.length === 0) {
    return logAndReturn({ outputLog: "No bounty submissions to transfer." });
  }

  const updatedBountySubmissions = await prisma.bountySubmission.updateMany({
    where: {
      bountyId: { in: bountiesToTransfer },
      partnerId: sourcePartnerId,
    },
    data: {
      partnerId: targetPartnerId,
    },
  });

  return logAndReturn({
    outputLog: `Transferred ${updatedBountySubmissions.count} bounty submissions`,
  });
}

async function syncLinksAndCommissions({
  targetPartnerId,
  programIdsToTransfer,
}: {
  targetPartnerId: string;
  programIdsToTransfer: string[];
}) {
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

  const res = await Promise.allSettled([
    recordLink(updatedLinks),
    linkCache.expireMany(updatedLinks),
    ...programIdsToTransfer.map((programId) =>
      syncTotalCommissions({
        partnerId: targetPartnerId,
        programId,
      }),
    ),
  ]);

  return logAndReturn({
    outputLog: `Synced ${updatedLinks.length} links and commissions. ${prettyPrint(res)}`,
  });
}

async function deleteSourceUser({ sourceUserId }: { sourceUserId: string }) {
  const workspaceCount = await prisma.projectUsers.count({
    where: {
      userId: sourceUserId,
    },
  });

  if (workspaceCount > 0) {
    return logAndReturn({
      outputLog: `User ${sourceUserId} still has ${workspaceCount} workspace(s), not deleting.`,
    });
  }

  try {
    const deletedUser = await prisma.user.delete({
      where: {
        id: sourceUserId,
      },
      select: {
        id: true,
        email: true,
        image: true,
      },
    });

    if (deletedUser.image) {
      await storage.delete({
        key: deletedUser.image.replace(`${R2_URL}/`, ""),
      });
    }

    return logAndReturn({
      outputLog: `Deleted user ${deletedUser.email} (${deletedUser.id})`,
    });
  } catch (error) {
    return logAndReturn({
      outputLog: `Error deleting user ${sourceUserId}: ${error.message}`,
    });
  }
}

async function cleanupFraudEvents({
  sourcePartnerId,
}: {
  sourcePartnerId: string;
}) {
  const fraudEventsToDelete = await prisma.fraudEvent.findMany({
    where: {
      partnerId: sourcePartnerId,
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
          partnerId: sourcePartnerId,
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

  return logAndReturn({
    outputLog: `Deleted ${fraudEventsToDelete.length} duplicate-account fraud events`,
  });
}

async function deleteSourcePartner({
  sourcePartnerId,
  sourceEmail,
  sourceImage,
}: {
  sourcePartnerId: string;
  sourceEmail: string;
  sourceImage: string | null;
}) {
  try {
    await conn.execute(`DELETE FROM Partner WHERE id = ?`, [sourcePartnerId]);

    if (sourceImage) {
      await storage.delete({
        key: sourceImage.replace(`${R2_URL}/`, ""),
      });
    }

    return logAndReturn({
      outputLog: `Deleted partner ${sourceEmail} (${sourcePartnerId})`,
    });
  } catch (error) {
    return logAndReturn({
      outputLog: `Error deleting partner ${sourcePartnerId}: ${error.message}`,
    });
  }
}
