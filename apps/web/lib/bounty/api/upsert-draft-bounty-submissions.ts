import { createId } from "@/lib/api/create-id";
import { awardBountyConditionSchema } from "@/lib/api/workflows/award-bounty/schema";
import { evaluateWorkflowConditions } from "@/lib/api/workflows/evaluate-workflow-conditions";
import {
  BountyPerformanceScope,
  BountySubmissionStatus,
  BountyType,
  Prisma,
} from "@prisma/client";
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
  status: BountySubmissionStatus;
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
}: {
  type: BountyType;
  performanceScope: BountyPerformanceScope | null;
  previousEndsAt: Date | null;
  startsAt: Date;
  endsAt: Date | null;
  archivedAt: Date | null;
  now?: Date;
}): boolean {
  if (type !== "performance") return false;
  if (performanceScope !== "lifetime") return false;

  const wasExpired = previousEndsAt != null && previousEndsAt < now;
  const nowActive =
    startsAt <= now && (endsAt == null || endsAt > now) && !archivedAt;

  return wasExpired && nowActive;
}

export function planDraftBountySubmissionUpserts({
  partners,
  existingSubmissions,
  condition,
  programId,
  bountyId,
}: {
  partners: PartnerLifetimeStats[];
  existingSubmissions: ExistingBountySubmission[];
  condition: AwardBountyCondition;
  programId: string;
  bountyId: string;
}): {
  toCreate: Prisma.BountySubmissionCreateManyInput[];
  toUpdate: DraftBountySubmissionUpdate[];
} {
  const existingByPartnerId = new Map(
    existingSubmissions.map((submission) => [submission.partnerId, submission]),
  );

  const toCreate: Prisma.BountySubmissionCreateManyInput[] = [];
  const toUpdate: DraftBountySubmissionUpdate[] = [];

  for (const partner of partners) {
    const performanceCount = partner[condition.attribute];

    if (performanceCount <= 0) {
      continue;
    }

    const conditionMet = evaluateWorkflowConditions({
      conditions: [condition],
      attributes: {
        [condition.attribute]: performanceCount,
      },
    });

    const existing = existingByPartnerId.get(partner.id);

    if (!existing) {
      toCreate.push({
        id: createId({ prefix: "bnty_sub_" }),
        programId,
        partnerId: partner.id,
        bountyId,
        performanceCount,
        ...(conditionMet && {
          status: "submitted",
          completedAt: new Date(),
        }),
      });
      continue;
    }

    if (existing.status === "draft") {
      toUpdate.push({
        id: existing.id,
        performanceCount,
        promoteToSubmitted: conditionMet,
      });
      continue;
    }

    if (existing.status === "submitted") {
      toUpdate.push({
        id: existing.id,
        performanceCount,
        promoteToSubmitted: false,
      });
    }
  }

  return { toCreate, toUpdate };
}
