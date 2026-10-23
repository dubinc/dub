import { dispatchWorkflows } from "@/lib/jobs/publish-workflows";
import { prisma } from "@/lib/prisma";
import { customRewardConfigSchema } from "@/lib/zod/schemas/rewards";
import { pluck } from "@dub/utils";
import {
  CommissionType,
  EventType,
  ProgramEnrollmentStatus,
} from "@prisma/client";
import {
  buildCommissionIdempotencyKey,
  formatCommissionDescription,
  hasRewardMaxDurationElapsed,
  toUtcDateOnly,
} from "./custom-reward-utils";

const PAGE_SIZE = 100;

export async function createCustomRewardCommissions({
  rewardId,
  periodDate,
  startAfterPartnerId,
}: {
  rewardId: string;
  periodDate: string;
  startAfterPartnerId?: string;
}) {
  const reward = await prisma.reward.findUnique({
    where: {
      id: rewardId,
    },
    select: {
      id: true,
      programId: true,
      event: true,
      amountInCents: true,
      maxDuration: true,
      config: true,
    },
  });

  if (!reward || reward.event !== EventType.custom || !reward.programId) {
    console.info(
      `[createCustomRewardCommissions] Reward ${rewardId} not found or not a custom reward. Skipping...`,
    );
    return {
      nextCursor: null,
    };
  }

  if (reward.amountInCents == null) {
    console.info(
      `[createCustomRewardCommissions] Reward ${rewardId} has no amountInCents. Skipping...`,
    );
    return {
      nextCursor: null,
    };
  }

  const parsedConfig = customRewardConfigSchema.safeParse(reward.config);

  if (!parsedConfig.success) {
    console.error(
      `[createCustomRewardCommissions] Invalid config for reward ${rewardId}. Skipping...`,
    );
    return {
      nextCursor: null,
    };
  }

  const enrollments = await prisma.programEnrollment.findMany({
    where: {
      customRewardId: rewardId,
      status: ProgramEnrollmentStatus.approved,
      ...(startAfterPartnerId && {
        partnerId: {
          gt: startAfterPartnerId,
        },
      }),
    },
    select: {
      partnerId: true,
      programId: true,
    },
    orderBy: {
      partnerId: "asc",
    },
    take: PAGE_SIZE,
  });

  if (enrollments.length === 0) {
    return {
      nextCursor: null,
    };
  }

  const partnerIds = pluck(enrollments, "partnerId");
  const firstCommissionAtByPartnerId = new Map<string, Date | null>();

  // Batch-fetch each partner's earliest custom commission so we can enforce maxDuration
  // without N+1 queries. Skip when maxDuration is unlimited (null).
  if (reward.maxDuration != null) {
    const firstCommissions = await prisma.commission.groupBy({
      by: ["partnerId"],
      where: {
        programId: reward.programId,
        partnerId: {
          in: partnerIds,
        },
        rewardId: reward.id,
        type: CommissionType.custom,
      },
      _min: {
        createdAt: true,
      },
    });

    for (const commission of firstCommissions) {
      firstCommissionAtByPartnerId.set(
        commission.partnerId,
        commission._min.createdAt,
      );
    }
  }

  const description = formatCommissionDescription({
    amountInCents: reward.amountInCents,
    frequency: parsedConfig.data.frequency,
    interval: parsedConfig.data.interval,
    periodDate,
  });

  const eligibleEnrollments = enrollments.filter((enrollment) => {
    const firstCommissionAt = firstCommissionAtByPartnerId.get(
      enrollment.partnerId,
    );

    // Skip partners whose first custom commission is already maxDuration months ago.
    // No first commission means they haven't started earning yet, so they're still eligible.
    return !(
      firstCommissionAt &&
      hasRewardMaxDurationElapsed({
        firstCommissionAt,
        maxDuration: reward.maxDuration,
        periodDate,
      })
    );
  });

  const jobs = eligibleEnrollments.map((enrollment) => {
    const invoiceId = buildCommissionIdempotencyKey({
      rewardId: reward.id,
      partnerId: enrollment.partnerId,
      periodDate,
    });

    return {
      name: "create-partner-commission-workflow" as const,
      payload: {
        event: CommissionType.custom,
        partnerId: enrollment.partnerId,
        programId: enrollment.programId,
        amount: reward.amountInCents,
        quantity: 1,
        rewardId: reward.id,
        invoiceId,
        description,
        createdAt: toUtcDateOnly(periodDate),
      },
      options: {
        label: enrollment.partnerId,
        flowControl: {
          key: "create-custom-reward-commissions",
          parallelism: 10,
        },
      },
    };
  });

  await dispatchWorkflows(jobs);

  const nextCursor =
    enrollments.length === PAGE_SIZE
      ? enrollments[enrollments.length - 1].partnerId
      : null;

  return {
    nextCursor,
  };
}
