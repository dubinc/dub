import { createId } from "@/lib/api/create-id";
import { awardBountyConditionSchema } from "@/lib/api/workflows/award-bounty/schema";
import { evaluateWorkflowConditions } from "@/lib/api/workflows/evaluate-workflow-conditions";
import { Bounty, BountyPerformanceScope, Prisma } from "@prisma/client";
import * as z from "zod/v4";

type AwardBountyCondition = z.infer<typeof awardBountyConditionSchema>;

export type PartnerLifetimeStats = {
  id: string;
  totalLeads: number;
  totalConversions: number;
  totalSaleAmount: number;
  totalCommissions: number;
};

export type ExistingBountySubmission = {
  id: string;
  partnerId: string;
  performanceCount: number;
};

export type DraftBountySubmissionUpdate = {
  id: string;
  performanceCount: number;
  promoteToSubmitted: boolean;
};

export function shouldUpsertDraftSubmissionsOnReopen({
  type,
  performanceScope,
  previousEndsAt,
  startsAt,
  endsAt,
  archivedAt,
  now = new Date(),
}: Pick<Bounty, "type" | "startsAt" | "endsAt" | "archivedAt"> & {
  performanceScope: BountyPerformanceScope | null;
  previousEndsAt: Date | null;
  now?: Date;
}): boolean {
  if (type !== "performance") return false;
  if (performanceScope !== "lifetime") return false;

  const wasExpired = previousEndsAt != null && previousEndsAt < now;
  const stillExpired =
    endsAt != null && endsAt < now && startsAt != null && startsAt <= now;
  const nowOrSoonActive = !archivedAt && !stillExpired;

  return wasExpired && nowOrSoonActive;
}

export function planDraftBountySubmissionUpserts({
  partners,
  existingDraftSubmissions,
  condition,
  programId,
  bountyId,
}: {
  partners: PartnerLifetimeStats[];
  existingDraftSubmissions: ExistingBountySubmission[];
  condition: AwardBountyCondition;
  programId: string;
  bountyId: string;
}): {
  toCreate: Prisma.BountySubmissionCreateManyInput[];
  toUpdate: DraftBountySubmissionUpdate[];
} {
  const existingByPartnerId = new Map(
    existingDraftSubmissions.map((submission) => [
      submission.partnerId,
      submission,
    ]),
  );

  const toCreate: Prisma.BountySubmissionCreateManyInput[] = [];
  const toUpdate: DraftBountySubmissionUpdate[] = [];

  for (const partner of partners) {
    const performanceCount = partner[condition.attribute];
    const existing = existingByPartnerId.get(partner.id);

    // skip if no performanceCount
    if (performanceCount <= 0) {
      continue;
    }

    const conditionMet = evaluateWorkflowConditions({
      conditions: [condition],
      attributes: {
        [condition.attribute]: performanceCount,
      },
    });

    if (!existing) {
      toCreate.push({
        id: createId({ prefix: "bnty_sub_" }),
        programId,
        partnerId: partner.id,
        bountyId,
        performanceCount: conditionMet ? condition.value : performanceCount,
        ...(conditionMet && {
          status: "submitted",
          completedAt: new Date(),
        }),
      });
      continue;
    }

    // update if performanceCount changed or conditionMet (need to promote to submitted)
    if (existing.performanceCount !== performanceCount || conditionMet) {
      toUpdate.push({
        id: existing.id,
        performanceCount: conditionMet ? condition.value : performanceCount,
        promoteToSubmitted: conditionMet,
      });
    }
  }

  return { toCreate, toUpdate };
}
